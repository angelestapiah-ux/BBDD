import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { requirePermiso } from '@/lib/permisos-server'
import { NextResponse } from 'next/server'

export type TipoEvento = 'cliente_nuevo' | 'pago' | 'seguimiento' | 'pago_pendiente'

export interface Evento {
  id: string
  tipo: TipoEvento
  titulo: string
  detalle: string | null
  fecha: string
  clienteNombre: string | null
  monto?: number | null
  estado?: string | null
}

export async function GET() {
  const bloqueo = await requirePermiso('dashboard')
  if (bloqueo) return bloqueo
  try {
    const supabase = createSupabaseAdminClient()

    const [
      { data: clientes },
      { data: pagos },
      { data: seguimientos },
    ] = await Promise.all([
      supabase
        .from('clientes')
        .select('id, nombre, procedencia, created_at')
        .order('created_at', { ascending: false })
        .limit(15),
      supabase
        .from('pagos')
        .select('id, cliente_id, actividad_nombre, monto, estado, created_at')
        .order('created_at', { ascending: false })
        .limit(15),
      supabase
        .from('seguimientos')
        .select('id, cliente_id, tipo, notas, created_at')
        .order('created_at', { ascending: false })
        .limit(15),
    ])

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const clienteIds: string[] = [
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(pagos ?? []).map((p: any) => p.cliente_id as string),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(seguimientos ?? []).map((s: any) => s.cliente_id as string),
    ].filter(Boolean)

    const uniqueIds = [...new Set(clienteIds)]
    const nombreMap: Record<string, string> = {}

    if (uniqueIds.length > 0) {
      const { data: nombres } = await supabase
        .from('clientes')
        .select('id, nombre')
        .in('id', uniqueIds)
      for (const c of nombres ?? []) {
        nombreMap[c.id] = c.nombre
      }
    }

    const eventos: Evento[] = []

    for (const c of clientes ?? []) {
      eventos.push({
        id: `cliente-${c.id}`,
        tipo: 'cliente_nuevo',
        titulo: 'Nuevo contacto',
        detalle: c.procedencia ? `Via ${c.procedencia}` : null,
        fecha: c.created_at,
        clienteNombre: c.nombre,
      })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const p of (pagos ?? []) as any[]) {
      eventos.push({
        id: `pago-${p.id}`,
        tipo: p.estado === 'pagado' ? 'pago' : 'pago_pendiente',
        titulo: p.estado === 'pagado' ? 'Pago registrado' : 'Pago pendiente',
        detalle: p.actividad_nombre ?? null,
        fecha: p.created_at,
        clienteNombre: nombreMap[p.cliente_id] ?? null,
        monto: p.monto,
        estado: p.estado,
      })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const s of (seguimientos ?? []) as any[]) {
      const tipoLabel: Record<string, string> = {
        llamada: 'Llamada', whatsapp: 'WhatsApp', correo: 'Correo', visita: 'Visita', otro: 'Contacto',
      }
      eventos.push({
        id: `seg-${s.id}`,
        tipo: 'seguimiento',
        titulo: tipoLabel[s.tipo] ?? 'Seguimiento',
        detalle: s.notas ? (s.notas.length > 80 ? s.notas.slice(0, 80) + '...' : s.notas) : null,
        fecha: s.created_at,
        clienteNombre: nombreMap[s.cliente_id] ?? null,
      })
    }

    eventos.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
    const recientes = eventos.slice(0, 25)

    return NextResponse.json({ eventos: recientes })
  } catch (error) {
    console.error('[dashboard/actividad]', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
