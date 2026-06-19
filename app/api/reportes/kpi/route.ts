import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

// GET /api/reportes/kpi
// Devuelve el KPI Comercial (embudo por campaña) calculado desde
// oportunidades + seguimientos vía la función SQL kpi_comercial().
export async function GET() {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase.rpc('kpi_comercial')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
