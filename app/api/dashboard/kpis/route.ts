import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { requirePermiso } from '@/lib/permisos-server'
import { NextResponse } from 'next/server'

export async function GET() {
  const bloqueo = await requirePermiso('dashboard')
  if (bloqueo) return bloqueo
  try {
    const supabase = createSupabaseAdminClient()

    const ahora = new Date()
    const inicioMesActual = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString()
    const inicioMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1).toISOString()
    const finMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth(), 0, 23, 59, 59).toISOString()
    const hace7dias = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const { count: contactosMes } = await supabase
      .from('clientes')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', inicioMesActual)

    const { count: contactosMesAnterior } = await supabase
      .from('clientes')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', inicioMesAnterior)
      .lte('created_at', finMesAnterior)

    const { data: ingresosMesData } = await supabase
      .from('pagos')
      .select('monto')
      .eq('estado', 'pagado')
      .gte('fecha_pago', inicioMesActual.split('T')[0])

    const ingresosMes = (ingresosMesData ?? []).reduce(
      (sum: number, p: { monto: number | null }) => sum + (p.monto ?? 0),
      0
    )

    const { data: ingresosMesAnteriorData } = await supabase
      .from('pagos')
      .select('monto')
      .eq('estado', 'pagado')
      .gte('fecha_pago', inicioMesAnterior.split('T')[0])
      .lte('fecha_pago', finMesAnterior.split('T')[0])

    const ingresosMesAnterior = (ingresosMesAnteriorData ?? []).reduce(
      (sum: number, p: { monto: number | null }) => sum + (p.monto ?? 0),
      0
    )

    const { data: pendientesData } = await supabase
      .from('pagos')
      .select('monto')
      .eq('estado', 'pendiente')

    const pagosPendientesTotal = (pendientesData ?? []).reduce(
      (sum: number, p: { monto: number | null }) => sum + (p.monto ?? 0),
      0
    )
    const pagosPendientesCantidad = pendientesData?.length ?? 0

    const { count: seguimientosSemana } = await supabase
      .from('seguimientos')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', hace7dias)

    return NextResponse.json({
      contactosMes: contactosMes ?? 0,
      contactosMesAnterior: contactosMesAnterior ?? 0,
      ingresosMes,
      ingresosMesAnterior,
      pagosPendientesTotal,
      pagosPendientesCantidad,
      seguimientosSemana: seguimientosSemana ?? 0,
    })
  } catch (error) {
    console.error('[dashboard/kpis]', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
