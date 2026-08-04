import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

// Programas cursados por un Alumni (tabla alumni_programas).
export async function GET(req: NextRequest) {
  const supabase = createSupabaseAdminClient()
  const { searchParams } = new URL(req.url)
  const clienteId = searchParams.get('cliente_id')
  if (!clienteId) return NextResponse.json([])
  const { data, error } = await supabase
    .from('alumni_programas')
    .select('id, programa, anio')
    .eq('cliente_id', clienteId)
    .order('anio', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const supabase = createSupabaseAdminClient()
  const body = await req.json()
  const cliente_id = body?.cliente_id
  const programa = (body?.programa ?? '').toString().trim()
  const anioRaw = body?.anio
  const anio = anioRaw === '' || anioRaw == null ? null : parseInt(String(anioRaw), 10)
  if (!cliente_id || !programa) {
    return NextResponse.json({ error: 'Faltan datos (cliente_id y programa)' }, { status: 400 })
  }
  const { data, error } = await supabase
    .from('alumni_programas')
    .insert({ cliente_id, programa, anio: Number.isNaN(anio as number) ? null : anio })
    .select('id, programa, anio')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const supabase = createSupabaseAdminClient()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })
  const { error } = await supabase.from('alumni_programas').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
