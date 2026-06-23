// app/api/actividades/asignar-masiva/route.ts
// Asignación masiva de una actividad a clientes que cumplen filtros de perfil.
// GET  -> lista de procedencias (para el selector de filtros).
// POST -> previsualiza (aplicar=false) o aplica (aplicar=true). Aditivo, dedup
//         por nombre canónico, marca un lote para poder deshacer.
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

// Las funciones SQL "returns setof text" pueden llegar como strings sueltos o
// como objetos { columna: valor } según la versión de PostgREST. Normalizamos.
function aTextos(data: unknown): string[] {
  if (!Array.isArray(data)) return []
  return data
    .map((x) => (typeof x === 'string' ? x : x && typeof x === 'object' ? String(Object.values(x)[0] ?? '') : String(x)))
    .filter((s) => s.length > 0)
}

export async function GET() {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase.rpc('procedencias_distinct')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ procedencias: aTextos(data) })
}

export async function POST(req: NextRequest) {
  const supabase = createSupabaseAdminClient()
  const body = await req.json()
  const actividad = String(body?.actividad_nombre || '').trim()
  const aplicar = body?.aplicar === true
  const f = body?.filtros ?? {}
  const genero = f.genero || null
  const procedencia = f.procedencia || null
  const tipo = f.tipo || null
  const etapa = f.etapa || null

  if (!actividad) {
    return NextResponse.json({ error: 'Falta la actividad.' }, { status: 400 })
  }
  // Seguridad: exige al menos un filtro para no asignar a toda la base por error.
  if (!genero && !procedencia && !tipo && !etapa) {
    return NextResponse.json({ error: 'Elige al menos un filtro de perfil.' }, { status: 400 })
  }

  const args = {
    p_actividad: actividad,
    p_genero: genero,
    p_procedencia: procedencia,
    p_tipo: tipo,
    p_etapa: etapa,
    p_aplicar: aplicar,
    p_lote: null as string | null,
  }

  const { data, error } = await supabase.rpc('asignar_actividad_masiva', args)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const row = (Array.isArray(data) ? data[0] : data) as
    { cumplen: number; ya_la_tienen: number; se_asignaran: number; lote: string } | undefined

  let muestra: string[] = []
  if (!aplicar) {
    const { data: m } = await supabase.rpc('muestra_asignacion_masiva', {
      p_actividad: actividad, p_genero: genero, p_procedencia: procedencia, p_tipo: tipo, p_etapa: etapa,
    })
    muestra = aTextos(m)
  }

  return NextResponse.json({
    cumplen: row?.cumplen ?? 0,
    yaLaTienen: row?.ya_la_tienen ?? 0,
    seAsignaran: row?.se_asignaran ?? 0,
    lote: aplicar ? (row?.lote ?? null) : null,
    asignados: aplicar ? (row?.se_asignaran ?? 0) : null,
    muestra,
  })
}
