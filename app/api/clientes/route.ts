import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { requireEscritura } from '@/lib/permisos-server'
import { auditar } from '@/lib/auditoria'
import { sincronizarAsistencias } from '@/lib/sincronizar-asistencias'

export async function GET(req: NextRequest) {
  const supabase = createSupabaseAdminClient()
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') || ''
  const etapa = searchParams.get('etapa') || ''
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = (page - 1) * limit

  let query = supabase
    .from('clientes')
    .select('*', { count: 'exact' })
    // Con búsqueda activa, ordenar alfabéticamente para que todos los
    // resultados relevantes quepan dentro del límite (no por fecha de creación)
    .order(q ? 'nombre' : 'created_at', { ascending: !!q })
    .range(offset, offset + limit - 1)

  if (q) {
    query = query.or(`nombre.ilike.%${q}%,correo.ilike.%${q}%,telefono.ilike.%${q}%`)
  }
  if (etapa) {
    query = query.eq('etapa', etapa)
  }

  const { data, error, count } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Enriquecer con último seguimiento (para semáforo en la lista)
  if (data && data.length > 0) {
    const clientIds = data.map((c: { id: string }) => c.id)
    const { data: segs } = await supabase
      .from('seguimientos')
      .select('cliente_id, created_at')
      .in('cliente_id', clientIds)
      .order('created_at', { ascending: false })

    // Keep only the most recent seguimiento per client
    const ultimoSeg: Record<string, string> = {}
    for (const s of segs ?? []) {
      if (!ultimoSeg[s.cliente_id]) {
        ultimoSeg[s.cliente_id] = s.created_at
      }
    }

    const dataEnriquecida = data.map((c: { id: string }) => ({
      ...c,
      ultimo_seguimiento: ultimoSeg[c.id] || null,
    }))

    return NextResponse.json({ data: dataEnriquecida, count, page, limit })
  }

  return NextResponse.json({ data: data || [], count, page, limit })
}

export async function POST(req: NextRequest) {
  const bloqueo = await requireEscritura()
  if (bloqueo) return bloqueo
  const supabase = createSupabaseAdminClient()
  const body = await req.json()
  const { data, error } = await supabase.from('clientes').insert(body).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  auditar('crear', 'clientes', data.id, `Cliente: ${data.nombre}`)
  // Tipos de cliente que son actividades del catálogo → registrar asistencias
  await sincronizarAsistencias(supabase, data.id, data.tipos_cliente)
  return NextResponse.json(data, { status: 201 })
}
