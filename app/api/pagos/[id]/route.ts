import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { requireEscritura } from '@/lib/permisos-server'
import { auditar } from '@/lib/auditoria'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const bloqueo = await requireEscritura()
  if (bloqueo) return bloqueo
  const supabase = createSupabaseAdminClient()
  const { id } = await params
  const body = await req.json()
  // Campos opcionales vacíos ("") → null (Postgres rechaza "" en fechas)
  for (const campo of ['fecha_pago', 'fecha_actividad', 'numero_factura', 'factura_interna', 'notas', 'monto']) {
    if (campo in body && body[campo] === '') body[campo] = null
  }
  const { data, error } = await supabase.from('pagos').update(body).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  auditar('editar', 'pagos', id, `${data.actividad_nombre} · $${data.monto ?? 0} · ${data.estado}`)
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const bloqueo = await requireEscritura()
  if (bloqueo) return bloqueo
  const supabase = createSupabaseAdminClient()
  const { id } = await params
  const { error } = await supabase.from('pagos').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  auditar('eliminar', 'pagos', id)
  return NextResponse.json({ ok: true })
}
