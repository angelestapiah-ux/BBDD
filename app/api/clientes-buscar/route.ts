import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

// GET ?q=  → busca clientes por nombre (server-side, service role) para el
// autocompletado del paciente al agendar una sesión. Evita la RLS del cliente.
export async function GET(req: NextRequest) {
  const supabase = createSupabaseAdminClient()
  const { searchParams } = new URL(req.url)
  const q = (searchParams.get('q') ?? '').trim()
  if (q.length < 2) return NextResponse.json([])

  const { data, error } = await supabase
    .from('clientes')
    .select('id, nombre, correo, telefono, tipos_cliente, terapeuta, modalidad_paciente')
    .ilike('nombre', `%${q}%`)
    .order('nombre', { ascending: true })
    .limit(8)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
