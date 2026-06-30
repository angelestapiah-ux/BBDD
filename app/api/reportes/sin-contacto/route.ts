import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { traerTodo } from '@/lib/traer-todo'

// Clientes sin ningún dato de contacto (ni teléfono ni correo, ni secundarios).
// Pagina con traerTodo para escanear la base COMPLETA (sin el techo de 1.000).
export async function GET() {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await traerTodo<Record<string, unknown>>(
    () =>
      supabase
        .from('clientes')
        .select('id, nombre, telefono, telefono2, correo, correo2, procedencia')
        .order('nombre', { ascending: true }),
  )

  if (error) return NextResponse.json({ error }, { status: 500 })

  const vacio = (v: unknown) => v == null || String(v).trim() === ''
  const clientes = data.filter(
    (c) => vacio(c.telefono) && vacio(c.telefono2) && vacio(c.correo) && vacio(c.correo2),
  )

  return NextResponse.json({ clientes, total: clientes.length })
}
