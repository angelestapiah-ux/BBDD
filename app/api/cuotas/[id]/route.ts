import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { requireEscritura } from '@/lib/permisos-server'
import { auditar } from '@/lib/auditoria'

// Actualiza una cuota (marcar pagada / volver a pendiente / ajustar monto o fecha).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const bloqueo = await requireEscritura()
  if (bloqueo) return bloqueo
  const supabase = createSupabaseAdminClient()
  const { id } = await params
  const body = await req.json()
  for (const campo of ['fecha_pago', 'fecha_vencimiento', 'metodo_pago', 'notas', 'monto']) {
    if (campo in body && body[campo] === '') body[campo] = null
  }
  const { data, error } = await supabase.from('cuotas').update(body).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  auditar('editar', 'cuotas', id, `Cuota ${data.numero_cuota}/${data.total_cuotas} · ${data.estado} · ${data.actividad_nombre ?? ''}`)

  // Sincroniza el pago padre con el avance de sus cuotas
  if (data.pago_id) {
    const { data: hermanasRaw } = await supabase
      .from('cuotas')
      .select('estado, monto, fecha_pago')
      .eq('pago_id', data.pago_id)
    const hermanas = (hermanasRaw ?? []) as Array<{ estado: string; monto: number | null; fecha_pago: string | null }>
    if (hermanas.length > 0) {
      const todasPagadas = hermanas.every(h => h.estado === 'pagada')
      if (todasPagadas) {
        const total = hermanas.reduce((s, h) => s + (h.monto || 0), 0)
        const fechas = hermanas.map(h => h.fecha_pago).filter((f): f is string => !!f).sort()
        const ultimaFecha = fechas.length > 0 ? fechas[fechas.length - 1] : new Date().toISOString().slice(0, 10)
        await supabase.from('pagos').update({ estado: 'pagado', monto: total, fecha_pago: ultimaFecha }).eq('id', data.pago_id)
      } else {
        await supabase.from('pagos').update({ estado: 'pendiente', monto: null }).eq('id', data.pago_id)
      }
    }
  }

  return NextResponse.json(data)
}

// Elimina una cuota suelta.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const bloqueo = await requireEscritura()
  if (bloqueo) return bloqueo
  const supabase = createSupabaseAdminClient()
  const { id } = await params
  const { error } = await supabase.from('cuotas').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  auditar('eliminar', 'cuotas', id)
  return NextResponse.json({ ok: true })
}
