import { NextRequest, NextResponse } from 'next/server'
import { exchangeCode, guardarRefreshToken } from '@/lib/google-calendar'

// Lee el email del id_token (JWT) para confirmar que conectó la cuenta correcta.
function emailFromIdToken(idToken?: string): string | null {
  if (!idToken) return null
  try {
    const payload = idToken.split('.')[1]
    const json = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    return (json.email as string) ?? null
  } catch {
    return null
  }
}

// GET /api/google/callback?code=... → intercambia el código, valida la cuenta
// y guarda el refresh_token. Vuelve a /sesiones con el resultado.
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  if (error || !code) return NextResponse.redirect(`${origin}/sesiones?google=error`)

  try {
    const tokens = await exchangeCode(code)
    const email = emailFromIdToken(tokens.id_token)
    const esperado = process.env.GOOGLE_CALENDAR_ID || ''

    // Si el Calendar ID es un correo, exigir que la cuenta conectada coincida.
    if (esperado.includes('@') && email && email.toLowerCase() !== esperado.toLowerCase()) {
      return NextResponse.redirect(`${origin}/sesiones?google=cuenta`)
    }
    if (!tokens.refresh_token) {
      return NextResponse.redirect(`${origin}/sesiones?google=sintoken`)
    }

    await guardarRefreshToken(tokens.refresh_token, email)
    return NextResponse.redirect(`${origin}/sesiones?google=ok`)
  } catch {
    return NextResponse.redirect(`${origin}/sesiones?google=error`)
  }
}
