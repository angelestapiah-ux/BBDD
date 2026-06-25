import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

// GET: terapeutas para autocompletar al agendar.
// Combina (a) los preguardados (con su tarifa) y (b) los clientes marcados
// como terapeuta (es_terapeuta). Todo server-side para evitar la RLS del cliente.
export async function GET() {
  const supabase = createSupabaseAdminClient()

  const { data: pre } = await supabase
    .from('terapeutas')
    .select('correo, nombre, tarifa_default')
    .order('nombre', { ascending: true })

  const { data: clis } = await supabase
    .from('clientes')
    .select('correo, nombre')
    .eq('es_terapeuta', true)
    .not('correo', 'is', null)

  const merged: { correo: string; nombre: string | null; tarifa_default: number | null }[] = []
  const vistos = new Set<string>()

  for (const t of (pre ?? []) as { correo: string; nombre: string | null; tarifa_default: number | null }[]) {
    if (!t.correo || vistos.has(t.correo)) continue
    vistos.add(t.correo)
    merged.push(t)
  }
  for (const c of (clis ?? []) as { correo: string; nombre: string | null }[]) {
    if (!c.correo || vistos.has(c.correo)) continue
    vistos.add(c.correo)
    merged.push({ correo: c.correo, nombre: c.nombre, tarifa_default: null })
  }

  return NextResponse.json(merged)
}
