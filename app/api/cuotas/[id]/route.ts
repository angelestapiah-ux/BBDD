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
  for (const campo of ['fecha_pago', 'fecha_vencimiento', 'metodo_pago', 'notas', 'monto', 'numero_factura', 'factura_interna']) {
    if (campo in body && body[campo] === '') body[campo] = null
  }
  const { data, error } = await supabase.from('cuotas').update(body).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  auditar('editar', 'cuotas', id, `Cuota ${data.numero_cuota}/${data.total_cuotas} · ${data.estado} · ${data.actividad_nombre ?? ''}`)

  // Reconocimiento de ingresos CUOTA A CUOTA:
  // el ingreso vive en cada cuota pagada (cuotas.fecha_pago). El pago padre del
  // plan NUNCA se marca 'pagado' — solo refleja el avance (pendiente / parcial),
  // así nunca se cuenta dos veces al sumar ingresos por cuotas en el dashboard.
  if (data.pago_id) {
    const { data: hermanasRaw } = await supabase
      .from('cuotas')
      .select('estado, monto')
      .eq('pago_id', data.pago_id)
    const hermanas = (hermanasRaw ?? []) as Array<{ estado: string; monto: number | null }>
    if (hermanas.length > 0) {
      const pagadas = hermanas.filter(h => h.estado === 'pagada')
      const totalPagado = pagadas.reduce((s, h) => s + (h.monto || 0), 0)
      const nuevoEstado = pagadas.length === 0 ? 'pendiente' : 'parcial'
      await supabase.from('pagos').update({ estado: nuevoEstado, monto: totalPagado || null }).eq('id', data.pago_id)
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
