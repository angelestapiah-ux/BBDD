// ARCHIVO CORREGIDO: app/api/seguimientos/route.ts
// CAMBIO: reemplazado 'supabase' (anon key) por createSupabaseAdminClient()
// MOTIVO: el cliente anon sin sesión auth queda bloqueado cuando RLS está activo
// MEJORA (2026-06-23): al registrar un seguimiento con una actividad que el
//   cliente todavía no tiene, se crea automáticamente la asistencia para que la
//   actividad quede visible en la pestaña "Actividades y pagos" (un paso menos).

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { normalizarActividad } from '@/lib/normalizar-actividad'

export async function POST(req: NextRequest) {
    const supabase = createSupabaseAdminClient()
    const body = await req.json()
    const { data, error } = await supabase.from('seguimientos').insert(body).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Auto-registrar la actividad como asistencia si el cliente aún no la tiene.
    // Es aditivo: nunca elimina ni modifica las actividades existentes.
    const actividad = String(body?.actividad_nombre || '').trim()
    const clienteId = body?.cliente_id
    if (actividad && clienteId) {
        try {
            const { data: existentes } = await supabase
                .from('asistencias')
                .select('actividad_nombre')
                .eq('cliente_id', clienteId)
            const objetivo = normalizarActividad(actividad) || actividad.toLowerCase()
            const yaTiene = (existentes ?? []).some((a: { actividad_nombre: string | null }) => {
                const n = a.actividad_nombre || ''
                return (normalizarActividad(n) || n.toLowerCase()) === objetivo
            })
            if (!yaTiene) {
                await supabase.from('asistencias').insert({
                    cliente_id: clienteId,
                    actividad_nombre: actividad,
                    fecha_asistencia: null,
                })
            }
        } catch {
            // Best-effort: si la auto-creación de la actividad llegara a fallar,
            // el seguimiento ya quedó guardado y no se interrumpe la respuesta.
        }
    }

    return NextResponse.json(data, { status: 201 })
}

export async function GET(req: NextRequest) {
    const supabase = createSupabaseAdminClient()
    const { searchParams } = new URL(req.url)
    const cliente_id   = searchParams.get('cliente_id')
    const tipo         = searchParams.get('tipo') || ''
    const fecha_desde  = searchParams.get('fecha_desde') || ''
    const fecha_hasta  = searchParams.get('fecha_hasta') || ''
    const page         = parseInt(searchParams.get('page') || '1')
    const limit        = parseInt(searchParams.get('limit') || '50')
    const offset       = (page - 1) * limit

    let query = supabase
        .from('seguimientos')
        .select('*, clientes(nombre, correo, telefono)', { count: 'exact' })
        .order('fecha', { ascending: false })
        .range(offset, offset + limit - 1)

    if (cliente_id)  query = query.eq('cliente_id', cliente_id)
    if (tipo)        query = query.eq('tipo', tipo)
    if (fecha_desde) query = query.gte('fecha', fecha_desde)
    if (fecha_hasta) query = query.lte('fecha', fecha_hasta + 'T23:59:59')

    const { data, error, count } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: data || [], count: count ?? 0, page, limit })
}
