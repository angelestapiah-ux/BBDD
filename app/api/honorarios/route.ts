import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { requirePermiso } from '@/lib/permisos-server'
import { auditar } from '@/lib/auditoria'
import { calcularBoleta } from '@/lib/honorarios'

// Boletas de honorarios (información financiera → permiso 'reportes')

export async function GET(req: NextRequest) {
  const bloqueo = await requirePermiso('reportes')
  if (bloqueo) return bloqueo

  const supabase = createSupabaseAdminClient()
  const { searchParams } = new URL(req.url)
  const estado = searchParams.get('estado') || ''
  const prestador = searchParams.get('prestador') || ''

  let query = supabase
    .from('boletas_honorarios')
    .select('*, pagos(monto, fecha_pago)')
    .order('created_at', { ascending: false })
    .limit(500)
  if (estado) query = query.eq('estado', estado)
  if (prestador) query = query.eq('prestador', prestador)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Prestadores conocidos: clientes marcados docente/terapeuta + terapeutas
  // asignados a pacientes + prestadores ya usados en boletas
  const { data: clientes } = await supabase
    .from('clientes')
    .select('nombre, terapeuta, es_docente, es_terapeuta')
    .or('es_docente.eq.true,es_terapeuta.eq.true,terapeuta.not.is.null')
  const prestadores = new Set<string>()
  for (const c of (clientes ?? []) as Array<{ nombre: string; terapeuta: string | null; es_docente: boolean; es_terapeuta: boolean }>) {
    if (c.es_docente || c.es_terapeuta) prestadores.add(c.nombre)
    if (c.terapeuta) prestadores.add(c.terapeuta.trim())
  }
  for (const b of (data ?? []) as Array<{ prestador: string }>) prestadores.add(b.prestador)

  return NextResponse.json({ boletas: data ?? [], prestadores: Array.from(prestadores).sort() })
}

export async function POST(req: NextRequest) {
  const bloqueo = await requirePermiso('reportes')
  if (bloqueo) return bloqueo

  const supabase = createSupabaseAdminClient()
  const body = await req.json()
  const { prestador, prestador_cliente_id, glosa, monto_liquido, numero_boleta, fecha, origen, notas, paciente_nombre } = body

  if (!prestador || !glosa) {
    return NextResponse.json({ error: 'Prestador y glosa son requeridos' }, { status: 400 })
  }

  let montos = { liquido: null as number | null, bruto: null as number | null, retencion: null as number | null }
  if (monto_liquido && Number(monto_liquido) > 0) {
    const calc = calcularBoleta(Number(monto_liquido))
    montos = { liquido: calc.liquido, bruto: calc.bruto, retencion: calc.retencion }
  }

  const { data, error } = await supabase
    .from('boletas_honorarios')
    .insert({
      prestador,
      prestador_cliente_id: prestador_cliente_id || null,
      glosa,
      origen: ['terapia', 'clases', 'manual'].includes(origen) ? origen : 'manual',
      paciente_nombre: paciente_nombre || null,
      monto_liquido: montos.liquido,
      monto_bruto: montos.bruto,
      retencion: montos.retencion,
      numero_boleta: numero_boleta || null,
      fecha: fecha || new Date().toISOString().slice(0, 10),
      estado: numero_boleta ? 'emitida' : 'pendiente',
      notas: notas || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  auditar('crear', 'honorarios', data.id, `${prestador} · ${glosa}${montos.bruto ? ` · bruto $${montos.bruto}` : ''}`)
  return NextResponse.json(data, { status: 201 })
}
