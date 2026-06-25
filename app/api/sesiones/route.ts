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

// Fecha local YYYY-MM-DD (evita el salto de zona horaria al guardar el vencimiento).
function localYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
// Fecha de la ocurrencia i de una recurrencia.
function ocurrencia(baseISO: string, repetir: string, i: number): Date {
  const d = new Date(baseISO)
  if (repetir === 'semanal') d.setDate(d.getDate() + 7 * i)
  else if (repetir === 'quincenal') d.setDate(d.getDate() + 14 * i)
  else if (repetir === 'mensual') d.setMonth(d.getMonth() + i)
  return d
}

// POST: agenda una o varias sesiones (recurrencia). Cada sesión genera su propio
// cobro (pago + cuota 1/1) y su evento en Google Calendar. Marca al cliente como
// 'Paciente' y preguarda el terapeuta.
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
  const repetir: string = body.repetir || 'no'
  let repeticiones: number = repetir === 'no' ? 1 : (Number(body.repeticiones) || 1)
  repeticiones = Math.max(1, Math.min(repeticiones, 52))

  if (!clienteId) return NextResponse.json({ error: 'Selecciona el cliente' }, { status: 400 })
  if (!fechaHora) return NextResponse.json({ error: 'Indica la fecha y hora de la sesión' }, { status: 400 })

  const actividadNombre = `Sesión ${terapeutaNombre || (terapeutaCorreo ? terapeutaCorreo.split('@')[0] : 'terapia')}`

  // Datos del cliente (una vez): marcar Paciente + datos para el evento.
  const { data: cliBase } = await supabase.from('clientes').select('tipos_cliente, nombre, correo').eq('id', clienteId).single()
  const paciente = (cliBase?.nombre as string) || 'Paciente'
  const pacienteCorreo = (cliBase?.correo as string) || null
  const tipos: string[] = Array.isArray(cliBase?.tipos_cliente) ? cliBase!.tipos_cliente : []
  if (!tipos.includes('Paciente')) {
    await supabase.from('clientes').update({ tipos_cliente: [...tipos, 'Paciente'] }).eq('id', clienteId)
  }

  // Preguardar el terapeuta (una vez).
  if (terapeutaCorreo) {
    await supabase.from('terapeutas').upsert(
      { correo: terapeutaCorreo, nombre: terapeutaNombre || null, tarifa_default: valor > 0 ? valor : null },
      { onConflict: 'correo' }
    )
  }

  let googleOn = false
  try { googleOn = (await estaConectado()).conectado } catch { googleOn = false }

  let primeraSesionId: string | null = null
  let creadas = 0

  for (let i = 0; i < repeticiones; i++) {
    const occ = ocurrencia(fechaHora, repetir, i)
    const occISO = occ.toISOString()
    const occDia = localYmd(occ)

    // 1) Cobro por pagar (solo si hay valor): pago + cuota 1/1.
    let pagoId: string | null = null
    let cuotaId: string | null = null
    if (valor > 0) {
      const { data: pago, error: ePago } = await supabase
        .from('pagos')
        .insert({ cliente_id: clienteId, actividad_nombre: actividadNombre, estado: 'pendiente', tiene_plan_cuotas: true, fecha_actividad: occDia })
        .select().single()
      if (ePago) return NextResponse.json({ error: ePago.message }, { status: 500 })
      pagoId = pago.id
      const { data: cuota, error: eCuota } = await supabase
        .from('cuotas')
        .insert({ pago_id: pagoId, cliente_id: clienteId, actividad_nombre: actividadNombre, numero_cuota: 1, total_cuotas: 1, monto: valor, fecha_vencimiento: occDia, estado: 'pendiente' })
        .select().single()
      if (eCuota) return NextResponse.json({ error: eCuota.message }, { status: 500 })
      cuotaId = cuota.id
    }

    // 2) La sesión.
    const { data: sesion, error: eSesion } = await supabase
      .from('sesiones')
      .insert({ cliente_id: clienteId, terapeuta_nombre: terapeutaNombre || null, terapeuta_correo: terapeutaCorreo || null, fecha_hora: occISO, duracion_min: duracionMin, valor: valor || null, estado: 'agendada', pago_id: pagoId, cuota_id: cuotaId, notas: notas || null })
      .select().single()
    if (eSesion) return NextResponse.json({ error: eSesion.message }, { status: 500 })
    if (!primeraSesionId) primeraSesionId = sesion.id
    creadas++

    // 3) Evento en Google Calendar e invitación (best-effort).
    if (googleOn) {
      try {
        const fin = new Date(occ.getTime() + duracionMin * 60000)
        const desc = [
          terapeutaNombre ? `Terapeuta: ${terapeutaNombre}` : 'Sesión de terapia',
          notas,
          '',
          '(Agendado desde Renovapp CRM)',
        ].filter(Boolean).join('\n')
        const eventId = await crearEvento({
          titulo: `Sesión: ${paciente}`,
          descripcion: desc,
          inicioISO: occISO,
          finISO: fin.toISOString(),
          invitados: [terapeutaCorreo || null, pacienteCorreo],
        })
        if (eventId) await supabase.from('sesiones').update({ google_event_id: eventId }).eq('id', sesion.id)
      } catch (e) {
        console.error('google event create:', e)
      }
    }
  }

  auditar('crear', 'sesiones', primeraSesionId ?? '', `Sesión ${terapeutaNombre || 'terapia'} x${creadas}`)
  return NextResponse.json({ creadas, sesion_id: primeraSesionId })
}
