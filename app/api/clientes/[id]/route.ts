import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { requirePermiso, requireEscritura } from '@/lib/permisos-server'
import { auditar } from '@/lib/auditoria'
import { sincronizarAsistencias } from '@/lib/sincronizar-asistencias'

// Registra el cambio de etapa en etapa_historial (si la tabla existe y la etapa cambió)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function registrarCambioEtapa(supabase: any, clienteId: string, etapaNueva: string | null | undefined) {
  if (etapaNueva === undefined) return
  try {
    const { data: actual } = await supabase.from('clientes').select('etapa').eq('id', clienteId).single()
    if (!actual || actual.etapa === etapaNueva || !etapaNueva) return
    await supabase.from('etapa_historial').insert({
      cliente_id: clienteId,
      etapa_anterior: actual.etapa,
      etapa_nueva: etapaNueva,
    })
  } catch {
    // La tabla puede no existir aún: nunca bloquear la actualización del cliente
  }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createSupabaseAdminClient()
  const { id } = await params
  const [clienteRes, asistenciasRes, pagosRes, seguimientosRes, historialRes, boletasRes] = await Promise.all([
    supabase.from('clientes').select('*').eq('id', id).single(),
    supabase.from('asistencias').select('*').eq('cliente_id', id).order('fecha_asistencia', { ascending: false }),
    supabase.from('pagos').select('*').eq('cliente_id', id).order('fecha_pago', { ascending: false }),
    supabase.from('seguimientos').select('*').eq('cliente_id', id).order('fecha', { ascending: false }),
    supabase.from('etapa_historial').select('*').eq('cliente_id', id).order('created_at', { ascending: false }),
    supabase.from('boletas_honorarios').select('*').eq('prestador_cliente_id', id).order('created_at', { ascending: false }),
  ])

  if (clienteRes.error) return NextResponse.json({ error: clienteRes.error.message }, { status: 404 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return NextResponse.json({
    ...(clienteRes.data as any),
    asistencias: asistenciasRes.data ?? [],
    pagos: pagosRes.data ?? [],
    seguimientos: seguimientosRes.data ?? [],
    etapa_historial: historialRes.data ?? [],
    boletas_prestador: boletasRes.data ?? [],
  })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const bloqueo = await requireEscritura()
  if (bloqueo) return bloqueo
  const supabase = createSupabaseAdminClient()
  const { id } = await params
  const body = await req.json()

  const {
    nombre, correo, correo2, telefono, telefono2, comentario, procedencia,
    cumpleanos, fecha_incorporacion, genero, tipos_cliente, modalidad_paciente,
    terapeuta, edad, documento_identidad, estado_civil, profesion, ciudad, pais, etapa,
    es_docente, es_terapeuta,
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
    es_docente: !!es_docente,
    es_terapeuta: !!es_terapeuta,
  }

  await registrarCambioEtapa(supabase, id, etapa || null)
  const { data, error } = await supabase.from('clientes').update(campos).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  auditar('editar', 'clientes', id, `Cliente: ${data.nombre}`)
  await sincronizarAsistencias(supabase, id, data.tipos_cliente)
  return NextResponse.json(data)
}

// PATCH — partial update (etapa, procedencia, etc.)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const bloqueo = await requireEscritura()
  if (bloqueo) return bloqueo
  const supabase = createSupabaseAdminClient()
  const { id } = await params
  const body = await req.json()
  if ('etapa' in body) await registrarCambioEtapa(supabase, id, body.etapa)
  const { data, error } = await supabase.from('clientes').update(body).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  auditar('editar', 'clientes', id, `Cliente: ${data.nombre} · campos: ${Object.keys(body).join(', ')}`)
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const bloqueo = await requirePermiso('eliminar')
  if (bloqueo) return bloqueo
  const supabase = createSupabaseAdminClient()
  const { id } = await params
  const { data: cliente } = await supabase.from('clientes').select('nombre').eq('id', id).single()
  const { error } = await supabase.from('clientes').delete().eq('id', id)
  if (!error) auditar('eliminar', 'clientes', id, `Cliente: ${cliente?.nombre ?? id}`)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
