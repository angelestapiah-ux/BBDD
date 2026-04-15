import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import * as XLSX from 'xlsx'

interface FilaSeguimiento {
  clienteId: string
  seguimientos: { tipo: string; fecha: string; responsable: string; notas: string }[]
  nuevoComentario: string | null
}

function normalizar(s: unknown): string {
  return String(s ?? '').toLowerCase().trim().replace(/\s+/g, ' ')
}

function mapearColumnas(headerRow: unknown[]): Record<string, number> {
  const map: Record<string, number> = {}
  headerRow.forEach((cell, idx) => {
    const k = normalizar(cell)
    if (k === 'nombre') map.nombre = idx
    else if (k.includes('rut') || k.includes('dni') || k.includes('pasaporte') || k.includes('documento')) map.documento_identidad = idx
    else if (k.includes('correo') && !k.includes('2')) map.correo = idx
    else if (k.includes('tel') && !k.includes('2')) map.telefono = idx
    else if (k.includes('nuevo comentario')) map.nuevo_comentario = idx
    else {
      // Seguimientos: "seguimiento N - tipo/fecha/responsable/notas"
      const m = k.match(/seguimiento\s+(\d)\s*[-–]\s*(tipo|fecha|responsable|notas)/)
      if (m) {
        const n = m[1]
        const campo = m[2]
        map[`seg${n}_${campo}`] = idx
      }
    }
  })
  return map
}

async function buscarCliente(nombre: string, rut: string, correo: string, telefono: string): Promise<string | null> {
  // 1. Por correo
  if (correo) {
    const { data } = await supabase.from('clientes').select('id').eq('correo', correo).maybeSingle()
    if (data) return data.id
  }
  // 2. Por RUT/documento
  if (rut) {
    const { data } = await supabase.from('clientes').select('id').eq('documento_identidad', rut).maybeSingle()
    if (data) return data.id
  }
  // 3. Por teléfono
  if (telefono) {
    const tel = telefono.replace(/\D/g, '')
    const { data } = await supabase.from('clientes').select('id').eq('telefono', tel).maybeSingle()
    if (data) return data.id
  }
  // 4. Por nombre (case-insensitive)
  if (nombre) {
    const { data } = await supabase.from('clientes').select('id').ilike('nombre', nombre.trim()).maybeSingle()
    if (data) return data.id
  }
  return null
}

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 })

  const buffer = await file.arrayBuffer()
  const wb = XLSX.read(buffer, { type: 'array' })

  let importados = 0
  let actualizados = 0
  let noEncontrados = 0
  const errores: string[] = []

  // Procesar primera hoja relevante
  for (const sheetName of wb.SheetNames) {
    if (sheetName.toLowerCase().includes('instruc')) continue

    const ws = wb.Sheets[sheetName]
    const data: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1 })
    if (data.length < 2) continue

    // Buscar fila de encabezado
    let headerIdx = -1
    for (let i = 0; i < Math.min(data.length, 10); i++) {
      const row = data[i] as unknown[]
      if (row.some(cell => normalizar(cell) === 'nombre')) { headerIdx = i; break }
    }
    if (headerIdx === -1) continue

    const cols = mapearColumnas(data[headerIdx] as unknown[])
    if (cols.nombre === undefined) continue

    for (let i = headerIdx + 1; i < data.length; i++) {
      const row = data[i] as unknown[]
      const nombre = String(row[cols.nombre] ?? '').trim()
      if (!nombre) continue

      const rut = cols.documento_identidad !== undefined ? String(row[cols.documento_identidad] ?? '').trim() : ''
      const correo = cols.correo !== undefined ? String(row[cols.correo] ?? '').trim() : ''
      const telefono = cols.telefono !== undefined ? String(row[cols.telefono] ?? '').trim() : ''
      const nuevoComentario = cols.nuevo_comentario !== undefined ? String(row[cols.nuevo_comentario] ?? '').trim() : ''

      const clienteId = await buscarCliente(nombre, rut, correo, telefono)
      if (!clienteId) {
        noEncontrados++
        errores.push(`No se encontró cliente: "${nombre}"`)
        continue
      }

      // Recopilar seguimientos de la fila
      const segsNuevos: FilaSeguimiento['seguimientos'] = []
      for (let n = 1; n <= 5; n++) {
        const tipo = String(row[cols[`seg${n}_tipo`]] ?? '').trim()
        const notas = String(row[cols[`seg${n}_notas`]] ?? '').trim()
        if (!tipo && !notas) continue

        const fechaRaw = row[cols[`seg${n}_fecha`]]
        let fecha = ''
        if (fechaRaw) {
          if (typeof fechaRaw === 'number') {
            const d = new Date((fechaRaw - 25569) * 86400 * 1000)
            fecha = d.toISOString()
          } else {
            const d = new Date(String(fechaRaw))
            fecha = isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString()
          }
        }
        if (!fecha) fecha = new Date().toISOString()

        segsNuevos.push({
          tipo: tipo || 'otro',
          fecha,
          responsable: String(row[cols[`seg${n}_resp`]] ?? '').trim(),
          notas: notas || tipo,
        })
      }

      // Insertar seguimientos
      if (segsNuevos.length > 0) {
        const inserts = segsNuevos.map(s => ({
          cliente_id: clienteId,
          tipo: ['llamada', 'whatsapp', 'correo', 'visita', 'otro'].includes(s.tipo) ? s.tipo : 'otro',
          fecha: s.fecha,
          usuario: s.responsable || null,
          notas: s.notas,
        }))
        const { error } = await supabase.from('seguimientos').insert(inserts)
        if (error) errores.push(`Error al insertar seguimientos de "${nombre}": ${error.message}`)
        else importados += segsNuevos.length
      }

      // Actualizar comentario (append)
      if (nuevoComentario) {
        const { data: cliente } = await supabase.from('clientes').select('comentario').eq('id', clienteId).single()
        const comentarioActual = cliente?.comentario || ''
        const comentarioCombinado = comentarioActual
          ? `${comentarioActual}\n[${new Date().toLocaleDateString('es-CL')}] ${nuevoComentario}`
          : `[${new Date().toLocaleDateString('es-CL')}] ${nuevoComentario}`
        await supabase.from('clientes').update({ comentario: comentarioCombinado }).eq('id', clienteId)
        actualizados++
      }
    }
    break // Solo procesar primera hoja válida
  }

  return NextResponse.json({ ok: true, importados, actualizados, noEncontrados, errores })
}
