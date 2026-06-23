import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { requirePermiso } from '@/lib/permisos-server'
import { normalizarActividad } from '@/lib/normalizar-actividad'
import type { SupabaseClient } from '@supabase/supabase-js'

// Trae TODAS las filas de una tabla paginando (PostgREST corta en 1.000).
async function traerTodo(
  supabase: SupabaseClient, tabla: string, select: string, ordenCol?: string,
): Promise<Record<string, unknown>[]> {
  const PAGE = 1000
  const out: Record<string, unknown>[] = []
  for (let from = 0; ; from += PAGE) {
    let q = supabase.from(tabla).select(select).range(from, from + PAGE - 1)
    if (ordenCol) q = q.order(ordenCol, { ascending: false })
    const { data, error } = await q
    if (error) throw new Error(error.message)
    const rows = (data ?? []) as Record<string, unknown>[]
    out.push(...rows)
    if (rows.length < PAGE) break
  }
  return out
}

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
    // Filtra por PROGRAMA CANÓNICO: agrupa todas las variantes que normalizan igual.
    const actividad = searchParams.get('actividad') || ''
    const todas = !actividad || actividad === '__todas__'
    const objetivo = normalizarActividad(actividad)
    try {
      const rows = await traerTodo(supabase, 'asistencias', '*, clientes(nombre, correo, telefono)', 'fecha_asistencia')
      const filtrados = todas
        ? rows
        : rows.filter(a => normalizarActividad(a.actividad_nombre as string) === objetivo)
      return NextResponse.json(filtrados)
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 500 })
    }
  }

  if (tipo === 'pagos_actividad') {
    const actividad = searchParams.get('actividad') || ''
    const todas = !actividad || actividad === '__todas__'
    const objetivo = normalizarActividad(actividad)
    try {
      const rows = await traerTodo(supabase, 'pagos', '*, clientes(nombre, correo, telefono)', 'fecha_pago')
      const pagos = todas
        ? rows
        : rows.filter(p => normalizarActividad(p.actividad_nombre as string) === objetivo)
      const total = pagos.reduce((sum: number, p) => sum + ((p.monto as number) || 0), 0)
      return NextResponse.json({ pagos, total })
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 500 })
    }
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
