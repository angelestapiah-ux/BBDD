import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabase
    .from('tipos_cliente')
    .select('*')
    .order('nombre')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const { nombre } = await req.json()
  if (!nombre) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })
  const { data: max } = await supabase.from('tipos_cliente').select('orden').order('orden', { ascending: false }).limit(1).single()
  const { data, error } = await supabase.from('tipos_cliente').insert({ nombre, orden: (max?.orden ?? 0) + 1 }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
