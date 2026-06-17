import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { requireEscritura } from '@/lib/permisos-server'
import { auditar } from '@/lib/auditoria'

// GET /api/oportunidades?cliente_id=...  → lista las oportunidades (funnel por actividad)
export async function GET(req: NextRequest) {
  const supabase = createSupabaseAdminClient()
  const { searchParams } = new URL(req.url)
  const cliente_id = searchParams.get('cliente_id')

  let query = supabase.from('oportunidades').select('*').order('created_at', { ascending: false })
  if (cliente_id) query = query.eq('cliente_id', cliente_id)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// POST /api/oportunidades  → crea una oportunidad para una actividad del cliente
export async function POST(req: NextRequest) {
  const bloqueo = await requireEscritura()
  if (bloqueo) return bloqueo
  const supabase = createSupabaseAdminClient()
  const body = await req.json()

  if (!body.cliente_id || !body.actividad_nombre) {
    return NextResponse.json({ error: 'Faltan cliente_id o actividad_nombre' }, { status: 400 })
  }

  const insert = {
    cliente_id: body.cliente_id,
    actividad_nombre: body.actividad_nombre,
    etapa: body.etapa || 'nuevo',
    responsable: body.responsable || null,
    notas: body.notas || null,
  }

  const { data, error } = await supabase.from('oportunidades').insert(insert).select().single()
  if (error) {
    const dup = /duplicate|unique/i.test(error.message)
    return NextResponse.json(
      { error: dup ? 'Ya existe una oportunidad para esa actividad' : error.message },
      { status: dup ? 409 : 500 },
    )
  }
  auditar('crear', 'oportunidades', data.id, `Oportunidad: ${insert.actividad_nombre} (${insert.etapa})`)
  return NextResponse.json(data, { status: 201 })
}

// PATCH /api/oportunidades  → actualiza una oportunidad (etapa, responsable, notas). Requiere id en el body.
export async function PATCH(req: NextRequest) {
  const bloqueo = await requireEscritura()
  if (bloqueo) return bloqueo
  const supabase = createSupabaseAdminClient()
  const body = await req.json()
  const { id, ...campos } = body
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })

  const { data, error } = await supabase.from('oportunidades').update(campos).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  auditar('editar', 'oportunidades', id, `Oportunidad: ${data.actividad_nombre} → ${data.etapa}`)
  return NextResponse.json(data)
}

// DELETE /api/oportunidades?id=...  → quita una oportunidad
export async function DELETE(req: NextRequest) {
  const bloqueo = await requireEscritura()
  if (bloqueo) return bloqueo
  const supabase = createSupabaseAdminClient()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })

  const { data: previo } = await supabase.from('oportunidades').select('actividad_nombre').eq('id', id).single()
  const { error } = await supabase.from('oportunidades').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  auditar('eliminar', 'oportunidades', id, `Oportunidad: ${previo?.actividad_nombre ?? id}`)
  return NextResponse.json({ ok: true })
}
