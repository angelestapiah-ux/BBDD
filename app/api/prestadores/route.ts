import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { getPerfilActual } from '@/lib/permisos-server'

// Clientes marcados como docentes y/o terapeutas.
// Se usa para: selector de terapeuta del paciente y prestadores en Honorarios.
export async function GET() {
  const perfil = await getPerfilActual()
  if (!perfil) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('clientes')
    .select('id, nombre, es_docente, es_terapeuta')
    .or('es_docente.eq.true,es_terapeuta.eq.true')
    .order('nombre')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  type Fila = { id: string; nombre: string; es_docente: boolean; es_terapeuta: boolean }
  const filas = (data ?? []) as Fila[]
  return NextResponse.json({
    terapeutas: filas.filter(c => c.es_terapeuta).map(c => ({ id: c.id, nombre: c.nombre })),
    docentes: filas.filter(c => c.es_docente).map(c => ({ id: c.id, nombre: c.nombre })),
  })
}
