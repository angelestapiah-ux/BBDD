import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { requirePermiso } from '@/lib/permisos-server'
import { auditar } from '@/lib/auditoria'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const bloqueo = await requirePermiso('configuracion')
  if (bloqueo) return bloqueo
  const { id } = await params
  const admin = createSupabaseAdminClient()
  const { error } = await admin.auth.admin.deleteUser(id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  auditar('eliminar', 'usuarios', id)
  return NextResponse.json({ ok: true })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const bloqueo = await requirePermiso('configuracion')
  if (bloqueo) return bloqueo
  const { id } = await params
  const { password } = await req.json()
  const admin = createSupabaseAdminClient()
  const { error } = await admin.auth.admin.updateUserById(id, { password })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  auditar('editar', 'usuarios', id, 'Cambio de contraseña')
  return NextResponse.json({ ok: true })
}
