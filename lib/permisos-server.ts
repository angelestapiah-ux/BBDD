import { NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient } from './supabase-server'
import { Permiso, Rol, permisosDeRol, permisosEfectivos } from './permisos'

export interface PerfilActual {
  userId: string
  rol: Rol
  permisos: Set<Permiso>
}

// Obtiene el perfil del usuario logueado (sesión por cookie).
// Si la tabla perfiles_usuario aún no existe (migración pendiente),
// devuelve admin para no bloquear el sistema.
export async function getPerfilActual(): Promise<PerfilActual | null> {
  const supa = await createSupabaseServerClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return null

  try {
    const admin = createSupabaseAdminClient()
    const { data, error } = await admin
      .from('perfiles_usuario')
      .select('rol, permisos_extra')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) {
      // Tabla inexistente u otro problema: no bloquear (compatibilidad pre-migración)
      return { userId: user.id, rol: 'admin', permisos: permisosDeRol('admin') }
    }

    const rol = (data?.rol ?? 'operacion') as Rol
    const extra = Array.isArray(data?.permisos_extra) ? (data.permisos_extra as Permiso[]) : []
    return { userId: user.id, rol, permisos: permisosEfectivos(rol, extra) }
  } catch {
    return { userId: user.id, rol: 'admin', permisos: permisosDeRol('admin') }
  }
}

// Devuelve una respuesta de error si el usuario NO tiene el permiso; null si puede continuar.
export async function requirePermiso(p: Permiso): Promise<NextResponse | null> {
  const perfil = await getPerfilActual()
  if (!perfil) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!perfil.permisos.has(p)) {
    return NextResponse.json({ error: 'Tu perfil no tiene permiso para esta acción' }, { status: 403 })
  }
  return null
}

// Bloquea escritura a los perfiles de solo lectura (visor).
export async function requireEscritura(): Promise<NextResponse | null> {
  const perfil = await getPerfilActual()
  if (!perfil) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (perfil.rol === 'visor') {
    return NextResponse.json({ error: 'Tu perfil es de solo lectura' }, { status: 403 })
  }
  return null
}
