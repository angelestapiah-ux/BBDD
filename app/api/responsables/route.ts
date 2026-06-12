import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { getPerfilActual } from '@/lib/permisos-server'

// Lista de responsables para el campo "Responsable" de seguimientos:
// correos de los usuarios del sistema + nombres ya usados como responsable.
// Accesible para cualquier usuario logueado (no expone nada sensible).
export async function GET() {
  const perfil = await getPerfilActual()
  if (!perfil) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const admin = createSupabaseAdminClient()
  const nombres = new Set<string>()

  try {
    const { data } = await admin.auth.admin.listUsers()
    for (const u of data?.users ?? []) {
      if (u.email) nombres.add(u.email)
    }
  } catch { /* best-effort */ }

  try {
    const { data: segs } = await admin
      .from('seguimientos')
      .select('usuario')
      .not('usuario', 'is', null)
      .neq('usuario', '')
      .neq('usuario', 'Formulario web')
      .order('created_at', { ascending: false })
      .limit(500)
    for (const s of segs ?? []) {
      const v = (s.usuario || '').trim()
      if (v) nombres.add(v)
    }
  } catch { /* best-effort */ }

  return NextResponse.json(Array.from(nombres).sort((a, b) => a.localeCompare(b)))
}
