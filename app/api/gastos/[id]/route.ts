import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { requirePermiso } from '@/lib/permisos-server'
import { auditar } from '@/lib/auditoria'

function tabla(req: NextRequest) {
  const tipo = new URL(req.url).searchParams.get('tipo')
  return tipo === 'arriendos' ? 'arriendos_sala' : 'gastos'
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const bloqueo = await requirePermiso('reportes')
  if (bloqueo) return bloqueo
  const supabase = createSupabaseAdminClient()
  const { id } = await params
  const body = await req.json()
  const t = tabla(req)
  delete body.tipo
  const { data, error } = await supabase.from(t).update(body).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  auditar('editar', t, id)
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const bloqueo = await requirePermiso('reportes')
  if (bloqueo) return bloqueo
  const supabase = createSupabaseAdminClient()
  const { id } = await params
  const t = tabla(req)
  const { error } = await supabase.from(t).delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  auditar('eliminar', t, id)
  return NextResponse.json({ ok: true })
}
