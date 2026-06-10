import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { requirePermiso, getPerfilActual } from '@/lib/permisos-server'

// Listar perfiles (user_id → rol + permisos extra)
export async function GET() {
  const bloqueo = await requirePermiso('configuracion')
  if (bloqueo) return bloqueo

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase.from('perfiles_usuario').select('*')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// Actualizar el rol y/o permisos extra de un usuario
export async function PUT(req: NextRequest) {
  const bloqueo = await requirePermiso('configuracion')
  if (bloqueo) return bloqueo

  const { user_id, rol, permisos_extra } = await req.json()
  if (!user_id || !rol) return NextResponse.json({ error: 'user_id y rol requeridos' }, { status: 400 })
  if (!['admin', 'operacion', 'visor'].includes(rol)) {
    return NextResponse.json({ error: 'Rol inválido' }, { status: 400 })
  }

  // Protección anti-bloqueo: no permitir quitarse a sí misma el rol admin
  const actual = await getPerfilActual()
  if (actual && actual.userId === user_id && rol !== 'admin') {
    return NextResponse.json(
      { error: 'No puedes quitarte tu propio rol de administradora (pídeselo a otra admin)' },
      { status: 400 }
    )
  }

  const supabase = createSupabaseAdminClient()
  const { error } = await supabase.from('perfiles_usuario').upsert({
    user_id,
    rol,
    permisos_extra: Array.isArray(permisos_extra) ? permisos_extra : [],
    updated_at: new Date().toISOString(),
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
