import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { auditar } from '@/lib/auditoria'

// ─────────────────────────────────────────────────────────────────────
// Endpoint PÚBLICO de captura de leads desde las webs de Renova.
//
//   POST /api/leads
//   { nombre, telefono?, correo?, mensaje?, origen, actividad?, website? }
//
// - `origen`: identificador de la web (ej: "tu-pnl-renovada")
// - `actividad`: nombre del programa/taller de interés (opcional)
// - `website`: HONEYPOT — campo oculto; si viene con datos es un bot.
//
// Reglas:
// - Si el teléfono/correo ya existe → NO duplica: registra un seguimiento
//   "Nuevo formulario desde X" y lo agenda para hoy (aparece en vista Hoy).
// - Si no existe → crea el cliente en etapa "nuevo" con su canal de origen
//   y proximo_contacto = hoy.
// ─────────────────────────────────────────────────────────────────────

const ORIGENES_PERMITIDOS = [
  'https://tu-pnl-renovada.vercel.app',
  'https://renova-empresas.vercel.app',
  'https://academia-renova.netlify.app',
  'https://academia-renova.vercel.app',
  'https://ciclo-renova-mujer-2026.vercel.app',
  'https://libera-el-dolor.vercel.app',
  'https://workshop-inmobiliario-2026.vercel.app',
  'https://mundo-renova.vercel.app',
  'http://localhost:3000',
]

function corsHeaders(origin: string | null) {
  const allowed = origin && ORIGENES_PERMITIDOS.includes(origin) ? origin : ORIGENES_PERMITIDOS[0]
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req.headers.get('origin')) })
}

function claveTelefono(s: string | null | undefined) {
  const d = (s || '').replace(/\D/g, '')
  return d.length >= 8 ? d.slice(-8) : ''
}

export async function POST(req: NextRequest) {
  const headers = corsHeaders(req.headers.get('origin'))

  let body: Record<string, string>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400, headers })
  }

  const { nombre, telefono, correo, mensaje, origen, actividad, website } = body

  // Honeypot: los bots llenan el campo oculto → respondemos OK falso sin guardar
  if (website) {
    return NextResponse.json({ ok: true }, { status: 201, headers })
  }

  if (!nombre || (!telefono && !correo)) {
    return NextResponse.json(
      { error: 'Se requiere nombre y al menos teléfono o correo' },
      { status: 400, headers }
    )
  }

  const supabase = createSupabaseAdminClient()
  const hoy = new Date().toISOString().slice(0, 10)
  const canal = origen || 'Web'
  const detalle = [
    `Nuevo formulario desde ${canal}`,
    actividad ? `Interés: ${actividad}` : null,
    mensaje ? `Mensaje: ${mensaje}` : null,
  ].filter(Boolean).join(' · ')

  // Buscar cliente existente por teléfono (últimos 8 dígitos) o correo
  const telKey = claveTelefono(telefono)
  const correoKey = (correo || '').toLowerCase().trim()

  const { data: candidatos } = await supabase
    .from('clientes')
    .select('id, nombre, telefono, telefono2, correo, correo2')

  type Candidato = { id: string; nombre: string; telefono: string | null; telefono2: string | null; correo: string | null; correo2: string | null }
  const existente = ((candidatos ?? []) as Candidato[]).find(c =>
    (telKey && (claveTelefono(c.telefono) === telKey || claveTelefono(c.telefono2) === telKey)) ||
    (correoKey && ((c.correo || '').toLowerCase().trim() === correoKey || (c.correo2 || '').toLowerCase().trim() === correoKey))
  )

  if (existente) {
    // Cliente conocido: registrar el interés y traerlo a la vista "Hoy"
    await Promise.all([
      supabase.from('seguimientos').insert({
        cliente_id: existente.id,
        tipo: 'otro',
        notas: detalle,
        fecha: new Date().toISOString(),
        usuario: 'Formulario web',
      }),
      supabase.from('clientes').update({ proximo_contacto: hoy }).eq('id', existente.id),
    ])
    auditar('crear', 'seguimientos', existente.id, detalle, `Formulario web (${canal})`)
    return NextResponse.json({ ok: true, existente: true }, { status: 201, headers })
  }

  // Cliente nuevo
  const { data: cliente, error } = await supabase
    .from('clientes')
    .insert({
      nombre: nombre.trim(),
      telefono: telefono || null,
      correo: correo || null,
      procedencia: canal,
      etapa: 'nuevo',
      comentario: detalle,
      proximo_contacto: hoy,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers })

  await supabase.from('seguimientos').insert({
    cliente_id: cliente.id,
    tipo: 'otro',
    notas: detalle,
    fecha: new Date().toISOString(),
    usuario: 'Formulario web',
  })

  auditar('crear', 'clientes', cliente.id, detalle, `Formulario web (${canal})`)
  return NextResponse.json({ ok: true, id: cliente.id }, { status: 201, headers })
}
