// app/api/actividades/asignar-masiva/deshacer/route.ts
// Deshace una carga masiva completa por su lote (borra solo las asistencias
// creadas en esa carga). No toca nada que el usuario haya agregado a mano.
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const supabase = createSupabaseAdminClient()
  const body = await req.json()
  const lote = String(body?.lote || '').trim()
  if (!lote) return NextResponse.json({ error: 'Falta el lote.' }, { status: 400 })

  const { data, error } = await supabase.rpc('deshacer_asignacion_masiva', { p_lote: lote })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ eliminados: (data as number) ?? 0 })
}
