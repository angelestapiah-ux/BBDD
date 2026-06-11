import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { requirePermiso } from '@/lib/permisos-server'
import { auditar } from '@/lib/auditoria'

// Gastos varios + arriendos de sala (info financiera → permiso 'reportes').
// ?tipo=gastos|arriendos &mes=YYYY-MM

export async function GET(req: NextRequest) {
  const bloqueo = await requirePermiso('reportes')
  if (bloqueo) return bloqueo

  const supabase = createSupabaseAdminClient()
  const { searchParams } = new URL(req.url)
  const tipo = searchParams.get('tipo') || 'gastos'
  const mes = searchParams.get('mes') || '' // YYYY-MM

  const tabla = tipo === 'arriendos' ? 'arriendos_sala' : 'gastos'
  const campoFecha = tipo === 'arriendos' ? 'fecha_sesion' : 'fecha'

  let query = supabase.from(tabla).select('*').order(campoFecha, { ascending: false }).limit(500)
  if (mes) {
    const [y, m] = mes.split('-').map(Number)
    const ultimo = new Date(y, m, 0).getDate()
    query = query.gte(campoFecha, `${mes}-01`).lte(campoFecha, `${mes}-${String(ultimo).padStart(2, '0')}`)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const bloqueo = await requirePermiso('reportes')
  if (bloqueo) return bloqueo

  const supabase = createSupabaseAdminClient()
  const body = await req.json()
  const tipo = body.tipo === 'arriendos' ? 'arriendos' : 'gastos'
  delete body.tipo

  if (tipo === 'gastos') {
    if (!body.fecha || !body.descripcion || !body.monto) {
      return NextResponse.json({ error: 'Fecha, descripción y monto son requeridos' }, { status: 400 })
    }
    const { data, error } = await supabase.from('gastos').insert(body).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    auditar('crear', 'gastos', data.id, `${data.descripcion} · $${data.monto}`)
    return NextResponse.json(data, { status: 201 })
  }

  if (!body.profesional || !body.monto) {
    return NextResponse.json({ error: 'Profesional y monto son requeridos' }, { status: 400 })
  }
  const { data, error } = await supabase.from('arriendos_sala').insert(body).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  auditar('crear', 'arriendos', data.id, `${data.profesional} · $${data.monto}`)
  return NextResponse.json(data, { status: 201 })
}
