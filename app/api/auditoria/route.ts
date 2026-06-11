import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { requirePermiso } from '@/lib/permisos-server'

export async function GET(req: NextRequest) {
  const bloqueo = await requirePermiso('configuracion')
  if (bloqueo) return bloqueo

  const { searchParams } = new URL(req.url)
  const usuario = searchParams.get('usuario') || ''
  const tabla = searchParams.get('tabla') || ''
  const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500)

  const supabase = createSupabaseAdminClient()
  let query = supabase
    .from('auditoria')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (usuario) query = query.eq('usuario', usuario)
  if (tabla) query = query.eq('tabla', tabla)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
