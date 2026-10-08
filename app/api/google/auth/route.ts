import { NextRequest, NextResponse } from 'next/server'
import { getAuthUrl } from '@/lib/google-calendar'
import { createSupabaseServerClient } from '@/lib/supabase-server'

// GET /api/google/auth → redirige a la pantalla de consentimiento de Google.
// La cuenta dueña del calendario autoriza una vez; vuelve por /api/google/callback.
// Solo para usuarios logueados del CRM.
export async function GET(req: NextRequest) {
  const supa = await createSupabaseServerClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', req.url))
  return NextResponse.redirect(getAuthUrl())
}
