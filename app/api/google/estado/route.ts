import { NextResponse } from 'next/server'
import { estaConectado } from '@/lib/google-calendar'
import { requireSesion } from '@/lib/permisos-server'

// GET /api/google/estado → { conectado, email } para mostrar el estado en la UI.
export async function GET() {
  const bloqueo = await requireSesion()
  if (bloqueo) return bloqueo
  const estado = await estaConectado()
  return NextResponse.json(estado)
}
