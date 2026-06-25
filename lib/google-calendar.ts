import { createSupabaseAdminClient } from '@/lib/supabase-server'

// Conexión con Google Calendar vía OAuth (cuenta dueña del calendario).
// Usa fetch directo a las APIs de Google (sin librería extra).

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ''
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || ''
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || ''
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'primary'
const SCOPE = 'openid email https://www.googleapis.com/auth/calendar'

export function getCalendarId() {
  return CALENDAR_ID
}

// URL de consentimiento (la cuenta autoriza una vez; pedimos refresh_token).
export function getAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPE,
    access_type: 'offline',
    prompt: 'consent',
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

interface TokenResp { access_token: string; refresh_token?: string; expires_in: number; id_token?: string }

export async function exchangeCode(code: string): Promise<TokenResp> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  })
  if (!res.ok) throw new Error(`token exchange: ${await res.text()}`)
  return res.json() as Promise<TokenResp>
}

async function getRefreshToken(): Promise<string | null> {
  const supabase = createSupabaseAdminClient()
  const { data } = await supabase.from('integraciones_google').select('refresh_token').eq('id', 1).single()
  return (data?.refresh_token as string | undefined) ?? null
}

export async function guardarRefreshToken(refreshToken: string, email: string | null) {
  const supabase = createSupabaseAdminClient()
  await supabase.from('integraciones_google').upsert(
    { id: 1, refresh_token: refreshToken, conectado_email: email, updated_at: new Date().toISOString() },
    { onConflict: 'id' }
  )
}

export async function estaConectado(): Promise<{ conectado: boolean; email: string | null }> {
  const supabase = createSupabaseAdminClient()
  const { data } = await supabase.from('integraciones_google').select('refresh_token, conectado_email').eq('id', 1).single()
  return { conectado: !!data?.refresh_token, email: (data?.conectado_email as string | undefined) ?? null }
}

async function getAccessToken(): Promise<string> {
  const refreshToken = await getRefreshToken()
  if (!refreshToken) throw new Error('Google Calendar sin conectar')
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) throw new Error(`refresh token: ${await res.text()}`)
  const j = await res.json()
  return j.access_token as string
}

export interface EventoInput {
  titulo: string
  descripcion?: string
  inicioISO: string
  finISO: string
  invitados?: (string | null | undefined)[]
  recurrence?: string[] | null
  colorId?: string
}

function buildBody(e: EventoInput): Record<string, unknown> {
  const body: Record<string, unknown> = {
    summary: e.titulo,
    start: { dateTime: e.inicioISO },
    end: { dateTime: e.finISO },
  }
  if (e.descripcion) body.description = e.descripcion
  const att = (e.invitados ?? []).filter((x): x is string => !!x)
  if (att.length) body.attendees = att.map(email => ({ email }))
  if (e.recurrence && e.recurrence.length) body.recurrence = e.recurrence
  if (e.colorId) body.colorId = e.colorId
  return body
}

// Marca un evento existente (cambia título + color) SIN borrarlo ni mover hora/invitados.
// Se usa para 'anulada' / 'reagendada': deja el rastro visible en el calendario.
export async function marcarEvento(eventId: string, titulo: string, colorId: string): Promise<void> {
  const token = await getAccessToken()
  const res = await fetch(eventsUrl(`/${encodeURIComponent(eventId)}?sendUpdates=all`), {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ summary: titulo, colorId }),
  })
  if (!res.ok) throw new Error(`marcar evento: ${await res.text()}`)
}

function eventsUrl(extra = ''): string {
  return `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events${extra}`
}

export async function crearEvento(e: EventoInput): Promise<string | null> {
  const token = await getAccessToken()
  const res = await fetch(eventsUrl('?sendUpdates=all'), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(buildBody(e)),
  })
  if (!res.ok) throw new Error(`crear evento: ${await res.text()}`)
  const j = await res.json()
  return (j.id as string) ?? null
}

export async function actualizarEvento(eventId: string, e: EventoInput): Promise<void> {
  const token = await getAccessToken()
  const res = await fetch(eventsUrl(`/${encodeURIComponent(eventId)}?sendUpdates=all`), {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(buildBody(e)),
  })
  if (!res.ok) throw new Error(`actualizar evento: ${await res.text()}`)
}

export async function eliminarEvento(eventId: string): Promise<void> {
  const token = await getAccessToken()
  await fetch(eventsUrl(`/${encodeURIComponent(eventId)}?sendUpdates=all`), {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
}
