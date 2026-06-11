import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { requirePermiso } from '@/lib/permisos-server'
import { auditar } from '@/lib/auditoria'
import { calcularBoleta } from '@/lib/honorarios'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const bloqueo = await requirePermiso('reportes')
  if (bloqueo) return bloqueo

  const supabase = createSupabaseAdminClient()
  const { id } = await params
  const body = await req.json()

  // Recalcular bruto/retención si cambió el líquido
  const campos: Record<string, unknown> = { ...body }
  if ('monto_liquido' in body) {
    if (body.monto_liquido && Number(body.monto_liquido) > 0) {
      const calc = calcularBoleta(Number(body.monto_liquido))
      campos.monto_liquido = calc.liquido
      campos.monto_bruto = calc.bruto
      campos.retencion = calc.retencion
    } else {
      campos.monto_liquido = null
      campos.monto_bruto = null
      campos.retencion = null
    }
  }
  // Al asignar número de boleta, queda emitida
  if (body.numero_boleta && !body.estado) campos.estado = 'emitida'

  const { data, error } = await supabase
    .from('boletas_honorarios')
    .update(campos)
    .eq('id', id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  auditar('editar', 'honorarios', id, `${data.prestador} · ${data.estado}${data.numero_boleta ? ` · boleta N° ${data.numero_boleta}` : ''}`)
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const bloqueo = await requirePermiso('reportes')
  if (bloqueo) return bloqueo

  const supabase = createSupabaseAdminClient()
  const { id } = await params
  const { error } = await supabase.from('boletas_honorarios').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  auditar('eliminar', 'honorarios', id)
  return NextResponse.json({ ok: true })
}
