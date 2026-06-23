// app/api/recordatorios/route.ts
// Lista y crea recordatorios manuales. Acceso vía service_role (omite RLS).
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

const CAMPOS_INSERT = [
  'titulo', 'fecha_hora', 'cliente_id', 'notas',
  'categoria', 'prioridad', 'estado', 'recurrencia', 'creado_por',
] as const

export async function GET(req: NextRequest) {
  const supabase = createSupabaseAdminClient()
  const { searchParams } = new URL(req.url)
  const incluirHechos = searchParams.get('incluir_hechos') === '1'
  const clienteId = searchParams.get('cliente_id') || ''
  const limit = parseInt(searchParams.get('limit') || '200')

  let query = supabase
    .from('recordatorios')
    .select('*, clientes(nombre, telefono)')
    .order('fecha_hora', { ascending: true })
    .limit(limit)

  if (!incluirHechos) query = query.eq('estado', 'pendiente')
  if (clienteId) query = query.eq('cliente_id', clienteId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = createSupabaseAdminClient()
  const body = await req.json()

  if (!body?.titulo || !body?.fecha_hora) {
    return NextResponse.json({ error: 'Falta el título o la fecha y hora.' }, { status: 400 })
  }

  const payload: Record<string, unknown> = {}
  for (const k of CAMPOS_INSERT) {
    if (body[k] !== undefined) payload[k] = body[k]
  }
  // Normaliza el cliente vacío a null (recordatorio general).
  if (!payload.cliente_id) payload.cliente_id = null

  const { data, error } = await supabase
    .from('recordatorios')
    .insert(payload)
    .select('*, clientes(nombre, telefono)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
