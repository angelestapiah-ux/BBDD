import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { requirePermiso } from '@/lib/permisos-server'
import { NextResponse } from 'next/server'

export type SemaforoColor = 'rojo' | 'ambar' | 'verde'

export interface ProspectoUrgente {
  id: string
  nombre: string
  correo: string | null
  telefono: string | null
  procedencia: string | null
  created_at: string
  ultimoSeguimiento: string | null
  horasSinContacto: number
  semaforo: SemaforoColor
}

export async function GET() {
  const bloqueo = await requirePermiso('dashboard')
  if (bloqueo) return bloqueo
  try {
    const supabase = createSupabaseAdminClient()

    const hace7Dias = new Date()
    hace7Dias.setDate(hace7Dias.getDate() - 7)

    const { data: clientes, error: errClientes } = await supabase
      .from('clientes')
      .select('id, nombre, correo, telefono, procedencia, created_at')
      .gte('created_at', hace7Dias.toISOString())
      .order('created_at', { ascending: true })

    if (errClientes) throw errClientes
    if (!clientes || clientes.length === 0) {
      return NextResponse.json({ prospectos: [], total: 0, rojos: 0, ambar: 0, verdes: 0 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ids = (clientes as any[]).map((c: any) => c.id as string)

    const { data: seguimientos, error: errSeg } = await supabase
      .from('seguimientos')
      .select('cliente_id, fecha')
      .in('cliente_id', ids)
      .order('fecha', { ascending: false })

    if (errSeg) throw errSeg

    const ultimoSeg: Record<string, string> = {}
    for (const s of seguimientos ?? []) {
      if (!ultimoSeg[s.cliente_id]) {
        ultimoSeg[s.cliente_id] = s.fecha
      }
    }

    const ahora = Date.now()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prospectos: ProspectoUrgente[] = (clientes as any[]).map((c: any) => {
      const ultimaFecha = ultimoSeg[c.id] ?? null
      const referencia = ultimaFecha
        ? new Date(ultimaFecha).getTime()
        : new Date(c.created_at).getTime()
      const horasSinContacto = Math.floor((ahora - referencia) / (1000 * 60 * 60))

      let semaforo: SemaforoColor
      if (horasSinContacto < 48)      semaforo = 'verde'
      else if (horasSinContacto < 72) semaforo = 'ambar'
      else                            semaforo = 'rojo'

      return {
        id: c.id,
        nombre: c.nombre,
        correo: c.correo,
        telefono: c.telefono,
        procedencia: c.procedencia,
        created_at: c.created_at,
        ultimoSeguimiento: ultimaFecha,
        horasSinContacto,
        semaforo,
      }
    })

    const orden: Record<SemaforoColor, number> = { rojo: 0, ambar: 1, verde: 2 }
    prospectos.sort((a, b) => {
      const diff = orden[a.semaforo] - orden[b.semaforo]
      if (diff !== 0) return diff
      return b.horasSinContacto - a.horasSinContacto
    })

    const rojos  = prospectos.filter(p => p.semaforo === 'rojo').length
    const ambar  = prospectos.filter(p => p.semaforo === 'ambar').length
    const verdes = prospectos.filter(p => p.semaforo === 'verde').length

    return NextResponse.json({ prospectos, total: prospectos.length, rojos, ambar, verdes })
  } catch (error) {
    console.error('[dashboard/urgentes]', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
