import { NextResponse } from 'next/server'
import { getAuthUrl } from '@/lib/google-calendar'

// GET /api/google/auth → redirige a la pantalla de consentimiento de Google.
// La cuenta dueña del calendario autoriza una vez; vuelve por /api/google/callback.
export async function GET() {
  return NextResponse.redirect(getAuthUrl())
}
