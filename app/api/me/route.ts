import { NextResponse } from 'next/server'
import { getPerfilActual } from '@/lib/permisos-server'

// Perfil del usuario logueado: la UI lo usa para mostrar/ocultar secciones.
// La protección real está en cada API (server-side).
export async function GET() {
  const perfil = await getPerfilActual()
  if (!perfil) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  return NextResponse.json({
    rol: perfil.rol,
    permisos: Array.from(perfil.permisos),
  })
}
