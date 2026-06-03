// ARCHIVO CORREGIDO: app/api/pagos/route.ts
// CAMBIO: reemplazado 'supabase' (anon key) por createSupabaseAdminClient()
// MOTIVO: el cliente anon sin sesión auth queda bloqueado cuando RLS está activo

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
    const supabase = createSupabaseAdminClient()
    const body = await req.json()
    const { data, error } = await supabase.from('pagos').insert(body).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
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
