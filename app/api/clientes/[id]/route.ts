import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [clienteRes, asistenciasRes, pagosRes, seguimientosRes] = await Promise.all([
    supabase.from('clientes').select('*').eq('id', id).single(),
    supabase.from('asistencias').select('*').eq('cliente_id', id).order('fecha_asistencia', { ascending: false }),
    supabase.from('pagos').select('*').eq('cliente_id', id).order('fecha_pago', { ascending: false }),
    supabase.from('seguimientos').select('*').eq('cliente_id', id).order('fecha', { ascending: false }),
  ])

  if (clienteRes.error) return NextResponse.json({ error: clienteRes.error.message }, { status: 404 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return NextResponse.json({
    ...(clienteRes.data as any),
    asistencias: asistenciasRes.data ?? [],
    pagos: pagosRes.data ?? [],
    seguimientos: seguimientosRes.data ?? [],
  })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('clientes') as any).update(body).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { error } = await supabase.from('clientes').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
