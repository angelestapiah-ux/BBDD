import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { requireEscritura } from '@/lib/permisos-server'

export async function GET() {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('actividades')
    .select('*')
    .order('nombre')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const bloqueo = await requireEscritura()
  if (bloqueo) return bloqueo
  const supabase = createSupabaseAdminClient()
  const body = await req.json()
  // Fechas vacías ("") → null: una actividad sin fechas es de duración indefinida
  body.fecha_inicio = body.fecha_inicio || null
  body.fecha_fin = body.fecha_fin || null
  body.descripcion = body.descripcion || null
  const { data, error } = await supabase.from('actividades').insert(body).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
