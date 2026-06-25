import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { requireEscritura } from '@/lib/permisos-server'
import { auditar } from '@/lib/auditoria'
import { crearEvento, estaConectado } from '@/lib/google-calendar'

// GET: lista de sesiones (próximas primero), con datos del cliente.
export async function GET(req: NextRequest) {
  const supabase = createSupabaseAdminClient()
  const { searchParams } = new URL(req.url)
  const desde = searchParams.get('desde') // opcional: ISO date para filtrar

  let query = supabase
    .from('sesiones')
    .select('*, clientes(nombre, correo, telefono)')

  if (desde) query = query.gte('fecha_hora', desde)

  const { data, error } = await query.order('fecha_hora', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// POST: agenda una sesión.
//  - genera el cobro por pagar (pago + cuota 1/1) que entra a /cobranza
//  - asegura que el cliente quede marcado como 'Paciente'
//  - preguarda el terapeuta (correo + tarifa) para autocompletar la próxima vez
export async function POST(req: NextRequest) {
  const bloqueo = await requireEscritura()
  if (bloqueo) return bloqueo
  const supabase = createSupabaseAdminClient()
  const body = await req.json()

  const clienteId: string = body.cliente_id
  const fechaHora: string = body.fecha_hora
  const terapeutaNombre: string = (body.terapeuta_nombre ?? '').trim()
  const terapeutaCorreo: string = (body.terapeuta_correo ?? '').trim()
  const valor: number = Number(body.valor) || 0
  const notas: string = body.notas ?? ''
  const duracionMin: number = Number(body.duracion_min) || 60

  if (!clienteId) return NextResponse.json({ error: 'Selecciona el cliente' }, { status: 400 })
  if (!fechaHora) return NextResponse.json({ error: 'Indica la fecha y hora de la sesión' }, { status: 400 })

  // Fecha local del día (evita el salto de zona horaria al convertir a UTC)
  const fechaDia = (body.fecha_dia && String(body.fecha_dia).slice(0, 10)) || String(fechaHora).slice(0, 10)
  const actividadNombre = `Sesión ${terapeutaNombre || (terapeutaCorreo ? terapeutaCorreo.split('@')[0] : 'terapia')}`

  // 1) Cobro por pagar (solo si hay valor): pago padre + cuota 1/1
  let pagoId: string | null = null
  let cuotaId: string | null = null
  if (valor > 0) {
    const { data: pago, error: ePago } = await supabase
      .from('pagos')
      .insert({
        cliente_id: clienteId,
        actividad_nombre: actividadNombre,
        estado: 'pendiente',
        tiene_plan_cuotas: true,
        fecha_actividad: fechaDia,
      })
      .select()
      .single()
    if (ePago) return NextResponse.json({ error: ePago.message }, { status: 500 })
    pagoId = pago.id

    const { data: cuota, error: eCuota } = await supabase
      .from('cuotas')
      .insert({
        pago_id: pagoId,
        cliente_id: clienteId,
        actividad_nombre: actividadNombre,
        numero_cuota: 1,
        total_cuotas: 1,
        monto: valor,
        fecha_vencimiento: fechaDia,
        estado: 'pendiente',
      })
      .select()
      .single()
    if (eCuota) return NextResponse.json({ error: eCuota.message }, { status: 500 })
    cuotaId = cuota.id
  }

  // 2) La sesión
  const { data: sesion, error: eSesion } = await supabase
    .from('sesiones')
    .insert({
      cliente_id: clienteId,
      terapeuta_nombre: terapeutaNombre || null,
      terapeuta_correo: terapeutaCorreo || null,
      fecha_hora: fechaHora,
      duracion_min: duracionMin,
      valor: valor || null,
      estado: 'agendada',
      pago_id: pagoId,
      cuota_id: cuotaId,
      notas: notas || null,
    })
    .select()
    .single()
  if (eSesion) return NextResponse.json({ error: eSesion.message }, { status: 500 })

  // 3) Asegurar que el cliente quede como 'Paciente' (mantiene el tipo al día)
  const { data: cli } = await supabase
    .from('clientes')
    .select('tipos_cliente')
    .eq('id', clienteId)
    .single()
  const tipos: string[] = Array.isArray(cli?.tipos_cliente) ? cli!.tipos_cliente : []
  if (!tipos.includes('Paciente')) {
    await supabase
      .from('clientes')
      .update({ tipos_cliente: [...tipos, 'Paciente'] })
      .eq('id', clienteId)
  }

  // 4) Preguardar el terapeuta (correo + tarifa por defecto)
  if (terapeutaCorreo) {
    await supabase
      .from('terapeutas')
      .upsert(
        {
          correo: terapeutaCorreo,
          nombre: terapeutaNombre || null,
          tarifa_default: valor > 0 ? valor : null,
        },
        { onConflict: 'correo' }
      )
  }

  // Crear el evento en Google Calendar e invitar al terapeuta (best-effort:
  // si Google falla o no está conectado, la sesión igual queda agendada).
  try {
    const { conectado } = await estaConectado()
    if (conectado && fechaHora) {
      const { data: cli } = await supabase.from('clientes').select('nombre, correo').eq('id', clienteId).single()
      const paciente = (cli?.nombre as string) || 'Paciente'
      const pacienteCorreo = (cli?.correo as string) || null
      const inicio = new Date(fechaHora)
      const fin = new Date(inicio.getTime() + duracionMin * 60000)
      const desc = [
        terapeutaNombre ? `Terapeuta: ${terapeutaNombre}` : 'Sesión de terapia',
        notas,
        '',
        '(Agendado desde Renovapp CRM)',
      ].filter(Boolean).join('\n')
      const eventId = await crearEvento({
        titulo: `Sesión: ${paciente}`,
        descripcion: desc,
        inicioISO: inicio.toISOString(),
        finISO: fin.toISOString(),
        invitados: [terapeutaCorreo || null, pacienteCorreo],
      })
      if (eventId) await supabase.from('sesiones').update({ google_event_id: eventId }).eq('id', sesion.id)
    }
  } catch (e) {
    console.error('google event create:', e)
  }

  auditar('crear', 'sesiones', sesion.id, `Sesión ${terapeutaNombre || 'terapia'} · ${fechaDia}`)
  return NextResponse.json(sesion)
}
