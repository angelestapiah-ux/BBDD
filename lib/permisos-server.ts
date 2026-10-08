import { NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient } from './supabase-server'
import { Permiso, Rol, permisosEfectivos } from './permisos'

export interface PerfilActual {
  userId: string
  rol: Rol
  permisos: Set<Permiso>
}

// Obtiene el perfil del usuario logueado (sesión por cookie).
// Si no se puede leer su perfil (error de base de datos) o el usuario no tiene
// fila en perfiles_usuario, queda como "visor" SIN permisos: puede ver la
// información operativa pero no modificar nada ni entrar a secciones protegidas,
// hasta que una administradora le asigne un rol en Configuración.
export async function getPerfilActual(): Promise<PerfilActual | null> {
  const supa = await createSupabaseServerClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return null

  const restringido: PerfilActual = { userId: user.id, rol: 'visor', permisos: new Set() }
  try {
    const admin = createSupabaseAdminClient()
    const { data, error } = await admin
      .from('perfiles_usuario')
      .select('rol, permisos_extra')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error || !data) return restringido

    const rol = data.rol as Rol
    if (!['admin', 'operacion', 'visor'].includes(rol)) return restringido
    const extra = Array.isArray(data.permisos_extra) ? (data.permisos_extra as Permiso[]) : []
    return { userId: user.id, rol, permisos: permisosEfectivos(rol, extra) }
  } catch {
    return restringido
  }
}

// Exige una sesión válida. Las rutas /api/* NO pasan por proxy.ts, así que
// cada ruta debe verificar la sesión por sí misma. Devuelve 401 si no hay
// usuario logueado; null si puede continuar.
export async function requireSesion(): Promise<NextResponse | null> {
  const supa = await createSupabaseServerClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  return null
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
