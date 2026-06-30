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
    const rows = (data ?? []) as unknown as Record<string, unknown>[]
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
    let rows: Record<string, unknown>[]
    try {
      rows = await traerTodo(supabase, 'clientes', 'id, nombre, correo, telefono, cumpleanos')
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 500 })
    }
    const filtrados = rows.filter((c) => {
      if (!c.cumpleanos) return false
      const d = new Date(c.cumpleanos as string)
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
    let rows: Record<string, unknown>[]
    try {
      rows = await traerTodo(supabase, 'clientes', 'procedencia')
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 500 })
    }
    const conteo: Record<string, number> = {}
    for (const c of rows) {
      if (c.procedencia == null) continue
      const p = String(c.procedencia).trim() === '' ? 'Sin datos' : String(c.procedencia)
      conteo[p] = (conteo[p] || 0) + 1
    }
    const resultado = Object.entries(conteo)
      .map(([procedencia, cantidad]) => ({ procedencia, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
    return NextResponse.json(resultado)
  }

  if (tipo === 'pagos_pendientes') {
    let rows: Record<string, unknown>[]
    try {
      rows = await traerTodo(supabase, 'pagos', '*, clientes(id, nombre, correo, telefono)', 'monto')
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 500 })
    }
    const pagos = rows.filter((p) => p.estado === 'pendiente' || p.estado === 'parcial')
    const total = pagos.reduce((sum: number, p) => sum + ((p.monto as number) || 0), 0)
    return NextResponse.json({ pagos, total })
  }

  if (tipo === 'facturacion') {
    // Comprobantes con factura: PAGOS (factura solicitada/emitida/folio) +
    // CUOTAS de plan que tengan número de factura (registro SII unificado).
    let pagosRows: Record<string, unknown>[]
    let cuotasRows: Record<string, unknown>[]
    try {
      ;[pagosRows, cuotasRows] = await Promise.all([
        traerTodo(supabase, 'pagos', '*, clientes(id, nombre, correo, telefono, documento_identidad)', 'fecha_pago'),
        traerTodo(supabase, 'cuotas', '*, clientes(id, nombre, correo, telefono, documento_identidad)', 'fecha_pago'),
      ])
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 500 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pagos = (pagosRows as any[]).filter(
      (p) => p.requiere_factura === true || p.numero_factura != null || p.factura_interna != null,
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cuotasFact = (cuotasRows as any[])
      .filter((c) => c.numero_factura != null || c.factura_interna != null)
      .map((c) => ({
        ...c,
        requiere_factura: true,
        fecha_actividad: null,
        es_cuota: true,
        actividad_nombre: c.actividad_nombre
          ? `${c.actividad_nombre} (cuota ${c.numero_cuota}/${c.total_cuotas})`
          : `Cuota ${c.numero_cuota}/${c.total_cuotas}`,
      }))
    const todos = [...pagos, ...cuotasFact].sort(
      (a, b) => String(b.fecha_pago || '').localeCompare(String(a.fecha_pago || '')),
    )
    const pendientes = todos.filter((p) => p.requiere_factura && !p.numero_factura)
    const total = todos.reduce((sum: number, p) => sum + (p.monto || 0), 0)
    return NextResponse.json({ pagos: todos, total, pendientes: pendientes.length })
  }

  return NextResponse.json({ error: 'Tipo de reporte no válido' }, { status: 400 })
}
