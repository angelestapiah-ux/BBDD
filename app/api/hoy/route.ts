import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

// Vista "Hoy": a quién contactar ahora.
// - agendados: proximo_contacto <= hoy (vencidos + de hoy)
// - enfriandose: clientes en etapas calientes sin contacto hace 7+ días y sin próximo contacto agendado a futuro
export async function GET() {
  const supabase = createSupabaseAdminClient()
  const hoy = new Date().toISOString().slice(0, 10)

  const [agendadosRes, calientesRes] = await Promise.all([
    supabase
      .from('clientes')
      .select('*')
      .lte('proximo_contacto', hoy)
      .order('proximo_contacto'),
    supabase
      .from('clientes')
      .select('*')
      .in('etapa', ['con_interes', 'cotizacion_enviada', 'negociando'])
      .or(`proximo_contacto.is.null,proximo_contacto.lte.${hoy}`),
  ])

  if (agendadosRes.error) return NextResponse.json({ error: agendadosRes.error.message }, { status: 500 })
  if (calientesRes.error) return NextResponse.json({ error: calientesRes.error.message }, { status: 500 })

  const agendados = agendadosRes.data ?? []
  const agendadosIds = new Set(agendados.map((c: { id: string }) => c.id))
  const calientes = (calientesRes.data ?? []).filter((c: { id: string }) => !agendadosIds.has(c.id))

  // Último seguimiento de todos los candidatos
  const ids = [...agendados, ...calientes].map((c: { id: string }) => c.id)
  const ultimoSeg: Record<string, string> = {}
  const ultimaActividad: Record<string, string> = {}
  if (ids.length > 0) {
    const [{ data: segs }, { data: asis }] = await Promise.all([
      supabase
        .from('seguimientos')
        .select('cliente_id, created_at')
        .in('cliente_id', ids)
        .order('created_at', { ascending: false }),
      supabase
        .from('asistencias')
        .select('cliente_id, actividad_nombre, created_at')
        .in('cliente_id', ids)
        .order('created_at', { ascending: false }),
    ])
    for (const s of segs ?? []) {
      if (!ultimoSeg[s.cliente_id]) ultimoSeg[s.cliente_id] = s.created_at
    }
    for (const a of asis ?? []) {
      if (!ultimaActividad[a.cliente_id]) ultimaActividad[a.cliente_id] = a.actividad_nombre
    }
  }

  const hace7dias = Date.now() - 7 * 24 * 3600_000
  const enfriandose = calientes.filter((c: { id: string; created_at: string }) => {
    const ref = ultimoSeg[c.id] || c.created_at
    return new Date(ref).getTime() < hace7dias
  })

  const enriquecer = (c: { id: string }) => ({
    ...c,
    ultimo_seguimiento: ultimoSeg[c.id] || null,
    ultima_actividad: ultimaActividad[c.id] || null,
  })

  return NextResponse.json({
    agendados: agendados.map(enriquecer),
    enfriandose: enfriandose.map(enriquecer),
  })
}
