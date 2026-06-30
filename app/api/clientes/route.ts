import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { requireEscritura } from '@/lib/permisos-server'
import { auditar } from '@/lib/auditoria'
import { sincronizarAsistencias } from '@/lib/sincronizar-asistencias'
import { traerTodo } from '@/lib/traer-todo'

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
    // Busqueda sin tildes + por palabras sueltas (funciones SQL buscar_clientes / contar_clientes).
    const [resData, resCount] = await Promise.all([
      supabase.rpc('buscar_clientes', { termino: q, etapa_filtro: etapa, lim: limit, off: offset }),
      supabase.rpc('contar_clientes', { termino: q, etapa_filtro: etapa }),
    ])
    data = (resData.data as Record<string, unknown>[] | null) ?? []
    errorMsg = resData.error?.message ?? resCount.error?.message ?? null
    count = resCount.data == null ? data.length : Number(resCount.data)
  } else if (limit > 1000) {
    // Exportación (PDF/planilla): traer la base COMPLETA paginando, sin el
    // techo de 1.000 filas por pedido de Supabase.
    const todo = await traerTodo(() => {
      let q2 = supabase.from('clientes').select('*').order('created_at', { ascending: false })
      if (etapa) q2 = q2.eq('etapa', etapa)
      return q2
    })
    data = (todo.data as Record<string, unknown>[] | null) ?? []
    count = data.length
    errorMsg = todo.error
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

  // Enriquecer con ultimo seguimiento (semaforo) y oportunidades por actividad (chips en la lista).
  // Solo en la vista normal paginada (limit <= 1000); en exportaciones se omite
  // para traer la base completa sin armar consultas con miles de IDs.
  if (data.length > 0 && limit <= 1000) {
    const clientIds = data.map((c) => c.id as string)
    const [segsRes, opsRes] = await Promise.all([
      supabase.from('seguimientos').select('cliente_id, created_at').in('cliente_id', clientIds).order('created_at', { ascending: false }),
      supabase.from('oportunidades').select('id, cliente_id, actividad_nombre, etapa').in('cliente_id', clientIds),
    ])

    const ultimoSeg: Record<string, string> = {}
    for (const s of segsRes.data ?? []) {
      if (!ultimoSeg[s.cliente_id]) ultimoSeg[s.cliente_id] = s.created_at
    }

    const opsPorCliente: Record<string, { id: string; actividad_nombre: string; etapa: string }[]> = {}
    for (const o of opsRes.data ?? []) {
      ;(opsPorCliente[o.cliente_id] ??= []).push({ id: o.id, actividad_nombre: o.actividad_nombre, etapa: o.etapa })
    }

    const dataEnriquecida = data.map((c) => ({
      ...c,
      ultimo_seguimiento: ultimoSeg[c.id as string] || null,
      oportunidades: opsPorCliente[c.id as string] || [],
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
  // 'actividades' es un campo del formulario (no columna de clientes): se usa
  // para registrar asistencias, no para insertar en clientes.
  const { actividades, ...clienteBody } = body
  const { data, error } = await supabase.from('clientes').insert(clienteBody).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  auditar('crear', 'clientes', data.id, `Cliente: ${data.nombre}`)
  await sincronizarAsistencias(supabase, data.id, Array.isArray(actividades) ? actividades : [])
  return NextResponse.json(data, { status: 201 })
}
