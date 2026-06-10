import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

export async function GET() {
  const supabase = createSupabaseAdminClient()
  // 4 consultas en paralelo — eficiente sin importar cuántos clientes haya
  const [clientesRes, asistenciasRes, pagosRes, seguimientosRes] = await Promise.all([
    supabase.from('clientes').select('*').order('nombre'),
    supabase.from('asistencias').select('*, clientes(nombre)').order('fecha_asistencia', { ascending: false }),
    supabase.from('pagos').select('*, clientes(nombre)').order('fecha_pago', { ascending: false }),
    supabase.from('seguimientos').select('*, clientes(nombre)').order('fecha', { ascending: false }),
  ])

  if (clientesRes.error) return NextResponse.json({ error: clientesRes.error.message }, { status: 500 })

  return NextResponse.json({
    clientes: clientesRes.data ?? [],
    asistencias: asistenciasRes.data ?? [],
    pagos: pagosRes.data ?? [],
    seguimientos: seguimientosRes.data ?? [],
  })
}
