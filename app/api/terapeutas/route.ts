import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

// GET: terapeutas preguardados (para autocompletar correo + tarifa al agendar).
export async function GET() {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('terapeutas')
    .select('correo, nombre, tarifa_default')
    .order('nombre', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
