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

  let data: Record<string, unknown>[] = []
  let count: number | null = null
  let errorMsg: string | null = null

  if (q) {
    // Búsqueda sin tildes + por palabras sueltas (funciones SQL buscar_clientes / contar_clientes).
    // "Juan Pérez" encuentra a "Juan Carlos Pérez Soto"; "maria" encuentra a "María".
    const [resData, resCount] = await Promise.all([
      supabase.rpc('buscar_clientes', { termino: q, etapa_filtro: etapa, lim: limit, off: offset }),
      supabase.rpc('contar_clientes', { termino: q, etapa_filtro: etapa }),
    ])
    data = (resData.data as Record<string, unknown>[] | null) ?? []
    errorMsg = resData.error?.message ?? resCount.error?.message ?? null
    count = resCount.data == null ? data.length : Number(resCount.data)
  } else {
    let query = supabase
      .from('clientes')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    if (etapa) query = query.eq('etapa', etapa)
    const res = await query
    data = (res.data as Record<string, unknown>[] | null) ?? []
    count = res.count ?? null
    errorMsg = res.error?.message ?? null
  }

  if (errorMsg) return NextResponse.json({ error: errorMsg }, { status: 500 })

  // Enriquecer con último seguimiento (para semáforo en la lista)
  if (data.length > 0) {
    const clientIds = data.map((c) => c.id as string)
    const { data: segs } = await supabase
      .from('seguimientos')
      .select('cliente_id, created_at')
      .in('cliente_id', clientIds)
      .order('created_at', { ascending: false })

    // Solo el seguimiento más reciente por cliente
    const ultimoSeg: Record<string, string> = {}
    for (const s of segs ?? []) {
      if (!ultimoSeg[s.cliente_id]) {
        ultimoSeg[s.cliente_id] = s.created_at
      }
    }

    const dataEnriquecida = data.map((c) => ({
      ...c,
      ultimo_seguimiento: ultimoSeg[c.id as string] || null,
    }))

    return NextResponse.json({ data: dataEnriquecida, count, page, limit })
  }

  return NextResponse.json({ data, count, page, limit })
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
