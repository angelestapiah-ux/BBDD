import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import * as XLSX from 'xlsx'
import type { SupabaseClient } from '@supabase/supabase-js'

// POST /api/importar/acciones
// Importa acciones de seguimiento masivas desde la plantilla por actividad.
// Por defecto devuelve una VISTA PREVIA (no guarda nada). Con confirmar=true inserta.
// El match de clientes se hace contra un índice cargado una sola vez (sin consultas por fila).

function norm(s: unknown): string {
  return String(s ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().trim().replace(/\s+/g, ' ')
}

function mapearColumnas(header: unknown[]): Record<string, number> {
  const m: Record<string, number> = {}
  header.forEach((cell, idx) => {
    const k = norm(cell)
    if (!k) return
    if (k.includes('cliente_id') || k === 'id') m.cliente_id = idx
    else if (k.includes('correo') && k.includes('enviad')) m.acc_correo = idx
    else if (k.includes('whatsapp')) m.acc_whatsapp = idx
    else if (k.includes('llamada')) m.acc_llamada = idx
    else if (k.includes('nota')) m.nota = idx
    else if (k === 'actividad') m.actividad = idx
    else if (k === 'correo') m.correo = idx
    else if (k.includes('rut') || k.includes('dni') || k.includes('documento') || k.includes('pasaporte')) m.documento = idx
    else if (k.includes('tel')) m.telefono = idx
    else if (k.includes('nombre')) m.nombre = idx
  })
  return m
}

// Devuelve ISO si reconoce la fecha, '' si no la reconoce.
function parseFecha(v: unknown): string {
  if (v === null || v === undefined || String(v).trim() === '') return ''
  if (typeof v === 'number') {
    const d = new Date(Math.round((v - 25569) * 86400 * 1000))
    return isNaN(d.getTime()) ? '' : d.toISOString()
  }
  const s = String(v).trim()
  let m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/)
  if (m) {
    const day = parseInt(m[1], 10)
    const mon = parseInt(m[2], 10)
    let year = parseInt(m[3], 10)
    if (year < 100) year += 2000
    if (mon >= 1 && mon <= 12 && day >= 1 && day <= 31) {
      const d = new Date(Date.UTC(year, mon - 1, day))
      if (!isNaN(d.getTime())) return d.toISOString()
    }
  }
  m = s.match(/^(\d{4})[\/.\-](\d{1,2})[\/.\-](\d{1,2})/)
  if (m) {
    const d = new Date(Date.UTC(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10)))
    if (!isNaN(d.getTime())) return d.toISOString()
  }
  const d = new Date(s)
  return isNaN(d.getTime()) ? '' : d.toISOString()
}

type ClienteRow = { id: string; nombre: string | null; correo: string | null; telefono: string | null; documento_identidad: string | null }

type IndiceClientes = {
  porCorreo: Map<string, string>
  porTel: Map<string, string>
  porDoc: Map<string, string>
  porNombre: Map<string, string>
}

// Carga TODOS los clientes una sola vez (paginado) y arma índices en memoria.
async function cargarIndice(supabase: SupabaseClient): Promise<IndiceClientes> {
  const idx: IndiceClientes = {
    porCorreo: new Map(), porTel: new Map(), porDoc: new Map(), porNombre: new Map(),
  }
  const PAGE = 1000
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('clientes')
      .select('id, nombre, correo, telefono, documento_identidad')
      .range(from, from + PAGE - 1)
    if (error) throw new Error(`Clientes: ${error.message}`)
    const rows = (data ?? []) as ClienteRow[]
    for (const r of rows) {
      if (r.correo) idx.porCorreo.set(r.correo.toLowerCase().trim(), r.id)
      if (r.telefono) { const t = r.telefono.replace(/\D/g, ''); if (t) idx.porTel.set(t, r.id) }
      if (r.documento_identidad) idx.porDoc.set(r.documento_identidad.trim(), r.id)
      if (r.nombre) idx.porNombre.set(r.nombre.toLowerCase().trim(), r.id)
    }
    if (rows.length < PAGE) break
  }
  return idx
}

function resolverCliente(idx: IndiceClientes, nombre: string, doc: string, correo: string, telefono: string): string | null {
  if (correo) { const id = idx.porCorreo.get(correo.toLowerCase().trim()); if (id) return id }
  if (doc) { const id = idx.porDoc.get(doc.trim()); if (id) return id }
  if (telefono) { const id = idx.porTel.get(telefono.replace(/\D/g, '')); if (id) return id }
  if (nombre) { const id = idx.porNombre.get(nombre.toLowerCase().trim()); if (id) return id }
  return null
}

type SegInsert = {
  cliente_id: string
  tipo: string
  fecha: string
  usuario: string | null
  notas: string
  actividad_nombre: string | null
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseAdminClient()

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const actividadForm = String(formData.get('actividad') ?? '').trim()
    const confirmar = String(formData.get('confirmar') ?? '') === 'true'
    if (!file) return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 })

    const buffer = await file.arrayBuffer()
    const wb = XLSX.read(buffer, { type: 'array' })

    // Ubicar la hoja de datos (saltando "Instrucciones")
    let hoja: unknown[][] | null = null
    let headerIdx = -1
    for (const sheetName of wb.SheetNames) {
      if (sheetName.toLowerCase().includes('instruc')) continue
      const data = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1 }) as unknown[][]
      if (data.length < 2) continue
      for (let i = 0; i < Math.min(data.length, 10); i++) {
        const row = data[i] as unknown[]
        if (row.some(c => norm(c) === 'nombre' || norm(c).includes('cliente_id'))) { headerIdx = i; break }
      }
      if (headerIdx !== -1) { hoja = data; break }
    }
    if (!hoja || headerIdx === -1) {
      return NextResponse.json({ error: 'No encontré la hoja de datos. Revisa que la planilla tenga la columna "Nombre" o "cliente_id".' }, { status: 400 })
    }

    const cols = mapearColumnas(hoja[headerIdx] as unknown[])
    const idx = await cargarIndice(supabase)

    let filas = 0
    let encontrados = 0
    let noEncontrados = 0
    let fechaHoy = 0
    const porCanal = { correo: 0, whatsapp: 0, llamada: 0 }
    const problemas: string[] = []
    const noEncontradosLista: string[] = []
    const inserts: SegInsert[] = []

    for (let i = headerIdx + 1; i < hoja.length; i++) {
      const row = hoja[i] as unknown[]
      const nombre = cols.nombre !== undefined ? String(row[cols.nombre] ?? '').trim() : ''
      let clienteId = cols.cliente_id !== undefined ? String(row[cols.cliente_id] ?? '').trim() : ''
      if (!nombre && !clienteId) continue // fila vacía
      filas++

      if (!clienteId) {
        const correo = cols.correo !== undefined ? String(row[cols.correo] ?? '').trim() : ''
        const tel = cols.telefono !== undefined ? String(row[cols.telefono] ?? '').trim() : ''
        const doc = cols.documento !== undefined ? String(row[cols.documento] ?? '').trim() : ''
        const found = resolverCliente(idx, nombre, doc, correo, tel)
        if (found) clienteId = found
      }
      if (!clienteId) {
        noEncontrados++
        noEncontradosLista.push(nombre || `(fila ${i + 1})`)
        continue
      }
      encontrados++

      const actividad = (cols.actividad !== undefined ? String(row[cols.actividad] ?? '').trim() : '') || actividadForm || null
      const nota = cols.nota !== undefined ? String(row[cols.nota] ?? '').trim() : ''

      const canales: { tipo: 'correo' | 'whatsapp' | 'llamada'; idx: number | undefined; label: string }[] = [
        { tipo: 'correo', idx: cols.acc_correo, label: 'Correo' },
        { tipo: 'whatsapp', idx: cols.acc_whatsapp, label: 'WhatsApp' },
        { tipo: 'llamada', idx: cols.acc_llamada, label: 'Llamada' },
      ]

      for (const c of canales) {
        if (c.idx === undefined) continue
        const cell = row[c.idx]
        if (cell === null || cell === undefined || String(cell).trim() === '') continue
        const parsed = parseFecha(cell)
        if (!parsed) {
          fechaHoy++
          problemas.push(`Fila ${i + 1} · ${c.label}: fecha "${String(cell).trim()}" no reconocida → se usará hoy`)
        }
        porCanal[c.tipo]++
        inserts.push({
          cliente_id: clienteId,
          tipo: c.tipo,
          fecha: parsed || new Date().toISOString(),
          usuario: null,
          notas: nota || `${c.label} masivo${actividad ? ' · ' + actividad : ''}`,
          actividad_nombre: actividad,
        })
      }
    }

    const resumen = { filas, encontrados, noEncontrados, seguimientos: inserts.length, porCanal, fechaHoy }

    if (!confirmar) {
      return NextResponse.json({ ok: true, preview: true, resumen, problemas, noEncontradosLista })
    }

    let registrados = 0
    if (inserts.length > 0) {
      const { error } = await supabase.from('seguimientos').insert(inserts)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      registrados = inserts.length
    }
    return NextResponse.json({ ok: true, preview: false, registrados, resumen, problemas, noEncontradosLista })
  } catch (e) {
    console.error('importar/acciones error:', e)
    const msg = e instanceof Error ? e.message : 'Error al procesar la planilla'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
