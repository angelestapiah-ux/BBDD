import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) throw new Error('Supabase no configurado. Revisa .env.local')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _client = createClient<any>(url, key)
  }
  return _client
}

// Alias para compatibilidad con las rutas existentes
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase: any = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (getSupabase() as unknown as Record<string | symbol, unknown>)[prop]
  },
})
