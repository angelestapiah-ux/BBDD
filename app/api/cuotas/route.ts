import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

// Lista las cuotas (opcionalmente de un cliente o de un pago), ordenadas por vencimiento.
export async function GET(req: NextRequest) {
  const supabase = createSupabaseAdminClient()
  const { searchParams } = new URL(req.url)
  const cliente_id = searchParams.get('cliente_id')
  const pago_id = searchParams.get('pago_id')

  let query = supabase
    .from('cuotas')
    .select('*')
    .order('fecha_vencimiento', { ascending: true })

  if (cliente_id) query = query.eq('cliente_id', cliente_id)
  if (pago_id) query = query.eq('pago_id', pago_id)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
