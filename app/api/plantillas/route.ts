import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

export async function GET() {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('plantillas_whatsapp')
    .select('*')
    .order('orden')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = createSupabaseAdminClient()
  const { nombre, cuerpo } = await req.json()
  if (!nombre || !cuerpo) return NextResponse.json({ error: 'Nombre y mensaje requeridos' }, { status: 400 })
  const { data: max } = await supabase.from('plantillas_whatsapp').select('orden').order('orden', { ascending: false }).limit(1).single()
  const { data, error } = await supabase
    .from('plantillas_whatsapp')
    .insert({ nombre, cuerpo, orden: (max?.orden ?? 0) + 1 })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
