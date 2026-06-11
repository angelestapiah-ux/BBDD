import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { requirePermiso } from '@/lib/permisos-server'

export async function GET(req: NextRequest) {
  const bloqueo = await requirePermiso('reportes')
  if (bloqueo) return bloqueo
  const supabase = createSupabaseAdminClient()
  const { searchParams } = new URL(req.url)
  const tipo = searchParams.get('tipo')

  if (tipo === 'cumpleanos_mes') {
    const mes = searchParams.get('mes') || String(new Date().getMonth() + 1)
    const { data, error } = await supabase
      .from('clientes')
      .select('id, nombre, correo, telefono, cumpleanos')
      .not('cumpleanos', 'is', null)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filtrados = (data || []).filter((c: any) => {
      if (!c.cumpleanos) return false
      const d = new Date(c.cumpleanos)
      return d.getMonth() + 1 === parseInt(mes)
    })
    return NextResponse.json(filtrados)
  }

  if (tipo === 'asistentes_actividad') {
    const actividad = searchParams.get('actividad') || ''
    const { data, error } = await supabase
      .from('asistencias')
      .select('*, clientes(nombre, correo, telefono)')
      .ilike('actividad_nombre', `%${actividad}%`)
      .order('fecha_asistencia', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  if (tipo === 'pagos_actividad') {
    const actividad = searchParams.get('actividad') || ''
    const { data, error } = await supabase
      .from('pagos')
      .select('*, clientes(nombre, correo, telefono)')
      .ilike('actividad_nombre', `%${actividad}%`)
      .order('fecha_pago', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const total = (data || []).reduce((sum: number, p: any) => sum + (p.monto || 0), 0)
    return NextResponse.json({ pagos: data, total })
  }

  if (tipo === 'procedencias') {
    const { data, error } = await supabase
      .from('clientes')
      .select('procedencia')
      .not('procedencia', 'is', null)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const conteo: Record<string, number> = {}
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(data || []).forEach((c: any) => {
      const p = c.procedencia || 'Sin datos'
      conteo[p] = (conteo[p] || 0) + 1
    })
    const resultado = Object.entries(conteo)
      .map(([procedencia, cantidad]) => ({ procedencia, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
    return NextResponse.json(resultado)
  }

  if (tipo === 'pagos_pendientes') {
    const { data, error } = await supabase
      .from('pagos')
      .select('*, clientes(id, nombre, correo, telefono)')
      .in('estado', ['pendiente', 'parcial'])
      .order('monto', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const total = (data || []).reduce((sum: number, p: any) => sum + (p.monto || 0), 0)
    return NextResponse.json({ pagos: data, total })
  }

  if (tipo === 'facturacion') {
    // Pagos con factura solicitada, factura emitida o folio interno (registro SII)
    const { data, error } = await supabase
      .from('pagos')
      .select('*, clientes(id, nombre, correo, telefono, documento_identidad)')
      .or('requiere_factura.eq.true,numero_factura.not.is.null,factura_interna.not.is.null')
      .order('fecha_pago', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pendientes = (data || []).filter((p: any) => p.requiere_factura && !p.numero_factura)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const total = (data || []).reduce((sum: number, p: any) => sum + (p.monto || 0), 0)
    return NextResponse.json({ pagos: data ?? [], total, pendientes: pendientes.length })
  }

  return NextResponse.json({ error: 'Tipo de reporte no válido' }, { status: 400 })
}
