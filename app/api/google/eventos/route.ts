import { NextRequest, NextResponse } from 'next/server'
import { listarEventos, estaConectado } from '@/lib/google-calendar'

// GET /api/google/eventos?desde=ISO&hasta=ISO → eventos del calendario en el rango.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const desde = searchParams.get('desde')
  const hasta = searchParams.get('hasta')
  if (!desde || !hasta) return NextResponse.json([])

  const { conectado } = await estaConectado()
  if (!conectado) return NextResponse.json([])

  try {
    const eventos = await listarEventos(desde, hasta)
    return NextResponse.json(eventos)
  } catch (e) {
    console.error('google eventos:', e)
    return NextResponse.json({ error: 'No se pudieron leer los eventos' }, { status: 500 })
  }
}
