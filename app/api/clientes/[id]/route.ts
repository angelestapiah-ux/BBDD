import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createSupabaseAdminClient()
  const { id } = await params
  const [clienteRes, asistenciasRes, pagosRes, seguimientosRes] = await Promise.all([
    supabase.from('clientes').select('*').eq('id', id).single(),
    supabase.from('asistencias').select('*').eq('cliente_id', id).order('fecha_asistencia', { ascending: false }),
    supabase.from('pagos').select('*').eq('cliente_id', id).order('fecha_pago', { ascending: false }),
    supabase.from('seguimientos').select('*').eq('cliente_id', id).order('fecha', { ascending: false }),
  ])

  if (clienteRes.error) return NextResponse.json({ error: clienteRes.error.message }, { status: 404 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return NextResponse.json({
    ...(clienteRes.data as any),
    asistencias: asistenciasRes.data ?? [],
    pagos: pagosRes.data ?? [],
    seguimientos: seguimientosRes.data ?? [],
  })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createSupabaseAdminClient()
  const { id } = await params
  const body = await req.json()

  const {
    nombre, correo, correo2, telefono, telefono2, comentario, procedencia,
    cumpleanos, fecha_incorporacion, genero, tipos_cliente, modalidad_paciente,
    terapeuta, edad, documento_identidad, estado_civil, profesion, ciudad, pais, etapa,
  } = body

  const campos = {
    nombre,
    correo: correo || null,
    correo2: correo2 || null,
    telefono: telefono || null,
    telefono2: telefono2 || null,
    comentario: comentario || null,
    procedencia: procedencia || null,
    cumpleanos: cumpleanos || null,
    fecha_incorporacion: fecha_incorporacion || null,
    genero: genero || null,
    tipos_cliente: tipos_cliente || [],
    modalidad_paciente: modalidad_paciente || null,
    terapeuta: terapeuta || null,
    edad: edad ? Number(edad) : null,
    documento_identidad: documento_identidad || null,
    estado_civil: estado_civil || null,
    profesion: profesion || null,
    ciudad: ciudad || null,
    pais: pais || null,
    etapa: etapa || null,
  }

  const { data, error } = await supabase.from('clientes').update(campos).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// PATCH — partial update (etapa, procedencia, etc.)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createSupabaseAdminClient()
  const { id } = await params
  const body = await req.json()
  const { data, error } = await supabase.from('clientes').update(body).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createSupabaseAdminClient()
  const { id } = await params
  const { error } = await supabase.from('clientes').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
