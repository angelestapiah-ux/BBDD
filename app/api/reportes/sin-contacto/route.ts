import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

// Clientes sin ningún dato de contacto (ni teléfono ni correo, ni secundarios)
export async function GET() {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('clientes')
    .select('id, nombre, telefono, telefono2, correo, correo2, procedencia')
    .order('nombre', { ascending: true })
    .range(0, 9999)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = (data ?? []) as Record<string, unknown>[]
  const vacio = (v: unknown) => v == null || String(v).trim() === ''
  const clientes = rows.filter(
    (c) => vacio(c.telefono) && vacio(c.telefono2) && vacio(c.correo) && vacio(c.correo2),
  )

  return NextResponse.json({ clientes, total: clientes.length })
}
