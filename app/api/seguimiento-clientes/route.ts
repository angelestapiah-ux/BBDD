import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { getPerfilActual } from '@/lib/permisos-server'
import { normalizarActividad } from '@/lib/normalizar-actividad'
import type { SupabaseClient } from '@supabase/supabase-js'

// Vista "Seguimiento por cliente": TODOS los clientes con su último contacto
// y sus actividades. Se pagina de a 1.000 porque Supabase/PostgREST corta
// cada consulta en 1.000 filas; sin esto la lista quedaba truncada (1000 de 1000)
// y las actividades incompletas (no coincidía con "asistentes por actividad").

const PAGE = 1000

type ClienteRow = {
  id: string
  nombre: string
  telefono: string | null
  correo: string | null
  etapa: string | null
  procedencia: string | null
  proximo_contacto: string | null
  created_at: string
}
type SegRow = { cliente_id: string; fecha: string | null; created_at: string }
type AsisRow = { cliente_id: string; actividad_nombre: string }

async function traerClientes(supabase: SupabaseClient): Promise<ClienteRow[]> {
  const out: ClienteRow[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('clientes')
      .select('id, nombre, telefono, correo, etapa, procedencia, proximo_contacto, created_at')
      .order('nombre')
      .range(from, from + PAGE - 1)
    if (error) throw new Error(error.message)
    const rows = (data ?? []) as ClienteRow[]
    out.push(...rows)
    if (rows.length < PAGE) break
  }
  return out
}

async function traerSeguimientos(supabase: SupabaseClient): Promise<SegRow[]> {
  const out: SegRow[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('seguimientos')
      .select('cliente_id, fecha, created_at')
      .order('created_at', { ascending: false })
      .range(from, from + PAGE - 1)
    if (error) throw new Error(error.message)
    const rows = (data ?? []) as SegRow[]
    out.push(...rows)
    if (rows.length < PAGE) break
  }
  return out
}

async function traerAsistencias(supabase: SupabaseClient): Promise<AsisRow[]> {
  const out: AsisRow[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('asistencias')
      .select('cliente_id, actividad_nombre')
      .range(from, from + PAGE - 1)
    if (error) throw new Error(error.message)
    const rows = (data ?? []) as AsisRow[]
    out.push(...rows)
    if (rows.length < PAGE) break
  }
  return out
}

export async function GET() {
  const perfil = await getPerfilActual()
  if (!perfil) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const supabase = createSupabaseAdminClient()

  try {
    const [clientes, segs, asis] = await Promise.all([
      traerClientes(supabase),
      traerSeguimientos(supabase),
      traerAsistencias(supabase),
    ])

    const ultimo: Record<string, string> = {}
    const conteo: Record<string, number> = {}
    for (const s of segs) {
      if (!ultimo[s.cliente_id]) ultimo[s.cliente_id] = s.fecha || s.created_at
      conteo[s.cliente_id] = (conteo[s.cliente_id] || 0) + 1
    }

    const actividades: Record<string, string[]> = {}
    for (const a of asis) {
      const canon = normalizarActividad(a.actividad_nombre)
      if (!canon) continue
      if (!actividades[a.cliente_id]) actividades[a.cliente_id] = []
      if (!actividades[a.cliente_id].includes(canon)) {
        actividades[a.cliente_id].push(canon)
      }
    }

    const data = clientes.map(c => ({
      ...c,
      ultimo_seguimiento: ultimo[c.id] || null,
      total_seguimientos: conteo[c.id] || 0,
      actividades: actividades[c.id] || [],
    }))

    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
