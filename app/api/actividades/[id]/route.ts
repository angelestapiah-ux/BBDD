import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { requireEscritura } from '@/lib/permisos-server'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const bloqueo = await requireEscritura()
  if (bloqueo) return bloqueo
  const supabase = createSupabaseAdminClient()
  const { id } = await params
  const body = await req.json()
  // Fechas vacías ("") → null (actividad indefinida)
  if ('fecha_inicio' in body) body.fecha_inicio = body.fecha_inicio || null
  if ('fecha_fin' in body) body.fecha_fin = body.fecha_fin || null
  const { data, error } = await supabase.from('actividades').update(body).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const bloqueo = await requireEscritura()
  if (bloqueo) return bloqueo
  const supabase = createSupabaseAdminClient()
  const { id } = await params
  const { error } = await supabase.from('actividades').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
