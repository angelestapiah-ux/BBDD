import { NextResponse } from 'next/server'
import { estaConectado } from '@/lib/google-calendar'

// GET /api/google/estado → { conectado, email } para mostrar el estado en la UI.
export async function GET() {
  const estado = await estaConectado()
  return NextResponse.json(estado)
}
