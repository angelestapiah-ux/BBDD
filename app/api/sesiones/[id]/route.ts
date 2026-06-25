import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { requireEscritura } from '@/lib/permisos-server'
import { auditar } from '@/lib/auditoria'
import { crearEvento, actualizarEvento, eliminarEvento, marcarEvento, estaConectado } from '@/lib/google-calendar'

// PATCH: edita una sesión agendada y sincroniza su cobro (cuota/pago):
//  - reprograma fecha/hora, terapeuta, valor, notas, estado
//  - si cambia el valor o la fecha, ajusta el vencimiento y el monto de la cuota
//  - si se marca 'cancelada', retira el cobro pendiente (borra cuota + pago si no está pagada)
//  - si antes no tenía cobro y ahora hay valor, genera el cobro
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const bloqueo = await requireEscritura()
  if (bloqueo) return bloqueo
  const supabase = createSupabaseAdminClient()
  const { id } = await params
  const body = await req.json()

  const fechaHora: string = body.fecha_hora
  const terapeutaNombre: string = (body.terapeuta_nombre ?? '').trim()
  const terapeutaCorreo: string = (body.terapeuta_correo ?? '').trim()
  const valor: number = Number(body.valor) || 0
  const notas: string = body.notas ?? ''
  const estado: string = body.estado || 'agendada'
  const fechaDia = (body.fecha_dia && String(body.fecha_dia).slice(0, 10)) || (fechaHora ? String(fechaHora).slice(0, 10) : null)
  const actividadNombre = `Sesión ${terapeutaNombre || (terapeutaCorreo ? terapeutaCorreo.split('@')[0] : 'terapia')}`
  const duracionMin: number = Number(body.duracion_min) || 60
  // Estados que retiran el cobro y el registro del perfil. 'cancelada' además borra
  // el evento; 'anulada'/'reagendada' conservan el evento marcado (título + color).
  const retira = ['cancelada', 'anulada', 'reagendada'].includes(estado)

  // Sesión actual (para sus enlaces de cobro)
  const { data: actual, error: eGet } = await supabase
    .from('sesiones')
    .select('id, cliente_id, pago_id, cuota_id, google_event_id')
    .eq('id', id)
    .single()
  if (eGet) return NextResponse.json({ error: eGet.message }, { status: 500 })

  let pagoId: string | null = actual.pago_id
  let cuotaId: string | null = actual.cuota_id

  if (cuotaId) {
    const { data: cuota } = await supabase.from('cuotas').select('estado').eq('id', cuotaId).single()
    const cuotaPagada = cuota?.estado === 'pagada'
    if (!cuotaPagada) {
      if (retira) {
        await supabase.from('cuotas').delete().eq('id', cuotaId)
        if (pagoId) await supabase.from('pagos').delete().eq('id', pagoId)
        pagoId = null; cuotaId = null
      } else {
        const cuotaUpd: Record<string, unknown> = { actividad_nombre: actividadNombre }
        if (fechaDia) cuotaUpd.fecha_vencimiento = fechaDia
        if (valor > 0) cuotaUpd.monto = valor
        await supabase.from('cuotas').update(cuotaUpd).eq('id', cuotaId)
        if (pagoId) await supabase.from('pagos').update({ actividad_nombre: actividadNombre }).eq('id', pagoId)
      }
    }
  } else if (valor > 0 && !retira && fechaDia) {
    // No tenía cobro y ahora hay valor: se genera
    const { data: pago } = await supabase
      .from('pagos')
      .insert({ cliente_id: actual.cliente_id, actividad_nombre: actividadNombre, estado: 'pendiente', tiene_plan_cuotas: true, fecha_actividad: fechaDia })
      .select().single()
    if (pago) {
      pagoId = pago.id
      const { data: cuota } = await supabase
        .from('cuotas')
        .insert({ pago_id: pagoId, cliente_id: actual.cliente_id, actividad_nombre: actividadNombre, numero_cuota: 1, total_cuotas: 1, monto: valor, fecha_vencimiento: fechaDia, estado: 'pendiente' })
        .select().single()
      if (cuota) cuotaId = cuota.id
    }
  }

  // Actualizar la sesión
  const sesionUpd: Record<string, unknown> = {
    terapeuta_nombre: terapeutaNombre || null,
    terapeuta_correo: terapeutaCorreo || null,
    valor: valor || null,
    notas: notas || null,
    estado,
    pago_id: pagoId,
    cuota_id: cuotaId,
  }
  if (fechaHora) sesionUpd.fecha_hora = fechaHora

  const { data: sesion, error: eUpd } = await supabase
    .from('sesiones')
    .update(sesionUpd)
    .eq('id', id)
    .select()
    .single()
  if (eUpd) return NextResponse.json({ error: eUpd.message }, { status: 500 })

  // Preguardar el terapeuta (correo + tarifa)
  if (terapeutaCorreo) {
    await supabase.from('terapeutas').upsert(
      { correo: terapeutaCorreo, nombre: terapeutaNombre || null, tarifa_default: valor > 0 ? valor : null },
      { onConflict: 'correo' }
    )
  }

  // Sincronizar el evento de Google Calendar (best-effort)
  try {
    const { conectado } = await estaConectado()
    if (conectado) {
      const eventId = actual.google_event_id as string | null
      const { data: cli } = await supabase.from('clientes').select('nombre, correo').eq('id', actual.cliente_id).single()
      const paciente = (cli?.nombre as string) || 'Paciente'
      const pacienteCorreo = (cli?.correo as string) || null

      if (estado === 'cancelada') {
        // Cancelada: se elimina el evento.
        if (eventId) {
          await eliminarEvento(eventId)
          await supabase.from('sesiones').update({ google_event_id: null }).eq('id', id)
        }
      } else if (estado === 'anulada' || estado === 'reagendada') {
        // Anulada/Reagendada: NO se borra; se marca con título + color (rastro para Fabiola).
        if (eventId) {
          const prefijo = estado === 'anulada' ? 'ANULADA' : 'REAGENDADA'
          const color = estado === 'anulada' ? '11' : '6' // 11 = rojo (Tomato), 6 = naranja (Tangerine)
          await marcarEvento(eventId, `${prefijo}: Sesión: ${paciente}`, color)
        }
      } else if (fechaHora) {
        // Agendada/realizada: crear o actualizar el evento normal (invita terapeuta + paciente).
        const inicio = new Date(fechaHora)
        const fin = new Date(inicio.getTime() + duracionMin * 60000)
        const desc = [
          terapeutaNombre ? `Terapeuta: ${terapeutaNombre}` : 'Sesión de terapia',
          notas,
          '',
          '(Agendado desde Renovapp CRM)',
        ].filter(Boolean).join('\n')
        const evt = {
          titulo: `Sesión: ${paciente}`,
          descripcion: desc,
          inicioISO: inicio.toISOString(),
          finISO: fin.toISOString(),
          invitados: [terapeutaCorreo || null, pacienteCorreo],
        }
        if (eventId) {
          await actualizarEvento(eventId, evt)
        } else {
          const newId = await crearEvento(evt)
          if (newId) await supabase.from('sesiones').update({ google_event_id: newId }).eq('id', id)
        }
      }
    }
  } catch (e) {
    console.error('google event patch:', e)
  }

  auditar('editar', 'sesiones', id, `Sesión ${terapeutaNombre || 'terapia'} · ${estado}`)
  return NextResponse.json(sesion)
}
