import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { getPerfilActual } from '@/lib/permisos-server'

// Vista "Seguimiento por cliente": TODOS los clientes con su último contacto
// y sus actividades, para ordenar/filtrar tipo Excel en el navegador.
export async function GET() {
  const perfil = await getPerfilActual()
  if (!perfil) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const supabase = createSupabaseAdminClient()

  const [clientesRes, segsRes, asisRes] = await Promise.all([
    supabase
      .from('clientes')
      .select('id, nombre, telefono, correo, etapa, procedencia, proximo_contacto, created_at')
      .order('nombre')
      .limit(5000),
    supabase
      .from('seguimientos')
      .select('cliente_id, fecha, created_at')
      .order('created_at', { ascending: false })
      .limit(20000),
    supabase
      .from('asistencias')
      .select('cliente_id, actividad_nombre')
      .limit(20000),
  ])

  if (clientesRes.error) return NextResponse.json({ error: clientesRes.error.message }, { status: 500 })

  const ultimo: Record<string, string> = {}
  const conteo: Record<string, number> = {}
  for (const s of segsRes.data ?? []) {
    if (!ultimo[s.cliente_id]) ultimo[s.cliente_id] = s.fecha || s.created_at
    conteo[s.cliente_id] = (conteo[s.cliente_id] || 0) + 1
  }

  const actividades: Record<string, string[]> = {}
  for (const a of asisRes.data ?? []) {
    if (!actividades[a.cliente_id]) actividades[a.cliente_id] = []
    if (!actividades[a.cliente_id].includes(a.actividad_nombre)) {
      actividades[a.cliente_id].push(a.actividad_nombre)
    }
  }

  const data = (clientesRes.data ?? []).map((c: { id: string }) => ({
    ...c,
    ultimo_seguimiento: ultimo[c.id] || null,
    total_seguimientos: conteo[c.id] || 0,
    actividades: actividades[c.id] || [],
  }))

  return NextResponse.json(data)
}
