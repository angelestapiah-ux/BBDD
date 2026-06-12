// ARCHIVO CORREGIDO: app/api/pagos/route.ts
// CAMBIO: reemplazado 'supabase' (anon key) por createSupabaseAdminClient()
// MOTIVO: el cliente anon sin sesión auth queda bloqueado cuando RLS está activo

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { requireEscritura } from '@/lib/permisos-server'
import { auditar } from '@/lib/auditoria'

export async function POST(req: NextRequest) {
    const bloqueo = await requireEscritura()
    if (bloqueo) return bloqueo
    const supabase = createSupabaseAdminClient()
    const body = await req.json()
    // Campos opcionales vacíos ("") → null (Postgres rechaza "" en fechas)
    for (const campo of ['fecha_pago', 'fecha_actividad', 'numero_factura', 'factura_interna', 'notas', 'monto']) {
        if (campo in body && body[campo] === '') body[campo] = null
    }
    const { data, error } = await supabase.from('pagos').insert(body).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    auditar('crear', 'pagos', data.id, `${data.actividad_nombre} · $${data.monto ?? 0} · ${data.estado}`)

    // Consistencia actividad↔pago: si el cliente no tiene la asistencia
    // de esta actividad, se registra automáticamente.
    try {
      const { data: asis } = await supabase
        .from('asistencias')
        .select('id')
        .eq('cliente_id', data.cliente_id)
        .eq('actividad_nombre', data.actividad_nombre)
        .limit(1)
      if (!asis || asis.length === 0) {
        await supabase.from('asistencias').insert({
          cliente_id: data.cliente_id,
          actividad_nombre: data.actividad_nombre,
          fecha_asistencia: data.fecha_actividad || data.fecha_pago || null,
        })
      }
    } catch { /* best-effort */ }

    // Honorarios automáticos: si el cliente es paciente con terapeuta asignado,
    // este pago genera una boleta PENDIENTE para que el terapeuta la emita.
    try {
      const { data: cliente } = await supabase
        .from('clientes')
        .select('nombre, terapeuta')
        .eq('id', data.cliente_id)
        .single()
      if (cliente?.terapeuta) {
        // Vincular al perfil del terapeuta si existe como cliente (match por nombre)
        const { data: prestadorCliente } = await supabase
          .from('clientes')
          .select('id')
          .ilike('nombre', cliente.terapeuta.trim())
          .limit(1)
          .maybeSingle()
        await supabase.from('boletas_honorarios').insert({
          prestador: cliente.terapeuta,
          prestador_cliente_id: prestadorCliente?.id ?? null,
          origen: 'terapia',
          glosa: `${data.actividad_nombre} — paciente ${cliente.nombre}`,
          paciente_nombre: cliente.nombre,
          pago_id: data.id,
          fecha: data.fecha_actividad || data.fecha_pago || new Date().toISOString().slice(0, 10),
          estado: 'pendiente',
        })
        auditar('crear', 'honorarios', null, `Boleta pendiente para ${cliente.terapeuta} (paciente ${cliente.nombre})`, 'Sistema (pago de paciente)')
      }
    } catch { /* tabla puede no existir aún */ }

    return NextResponse.json(data, { status: 201 })
}

export async function GET(req: NextRequest) {
    const supabase = createSupabaseAdminClient()
    const { searchParams } = new URL(req.url)
    const cliente_id   = searchParams.get('cliente_id')
    const estado       = searchParams.get('estado') || ''
    const fecha_desde  = searchParams.get('fecha_desde') || ''
    const fecha_hasta  = searchParams.get('fecha_hasta') || ''
    const page         = parseInt(searchParams.get('page') || '1')
    const limit        = parseInt(searchParams.get('limit') || '100')
    const offset       = (page - 1) * limit

    let query = supabase
        .from('pagos')
        .select('*, clientes(nombre)', { count: 'exact' })
        .order('fecha_pago', { ascending: false, nullsFirst: false })
        .range(offset, offset + limit - 1)

    if (cliente_id)   query = query.eq('cliente_id', cliente_id)
    if (estado)       query = query.eq('estado', estado)
    if (fecha_desde)  query = query.gte('fecha_pago', fecha_desde)
    if (fecha_hasta)  query = query.lte('fecha_pago', fecha_hasta)

    const { data, error, count } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: data || [], count: count ?? 0, page, limit })
}
