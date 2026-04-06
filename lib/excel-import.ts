import * as XLSX from 'xlsx'

export interface FilaCliente {
  nombre: string
  correo: string | null
  telefono: string | null
  comentario: string | null
  procedencia: string | null
  cumpleanos: string | null
  fecha_incorporacion: string | null
  asistencias: string[]
}

// Convierte serial de Excel a fecha ISO (YYYY-MM-DD)
function excelSerialToDate(serial: number | string | null): string | null {
  if (!serial) return null
  if (typeof serial === 'string') {
    // Puede venir como texto con formato de fecha
    const d = new Date(serial)
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
    return null
  }
  if (typeof serial === 'number') {
    // Excel serial: días desde 1900-01-01 (con bug del año bisiesto de 1900)
    const date = new Date((serial - 25569) * 86400 * 1000)
    if (!isNaN(date.getTime())) return date.toISOString().split('T')[0]
  }
  return null
}

// Normaliza el teléfono a string
function normalizarTelefono(tel: unknown): string | null {
  if (!tel) return null
  return String(tel).replace(/\D/g, '').trim() || null
}

// Parsea las asistencias (pueden venir en una celda separadas por // o \n)
function parsearAsistencias(raw: unknown): string[] {
  if (!raw) return []
  const texto = String(raw).trim()
  if (!texto) return []
  return texto
    .split(/\/\/|\n|,/)
    .map(a => a.trim())
    .filter(a => a.length > 0)
}

// Detecta la fila de encabezados buscando "Nombre" en la columna A
function encontrarFilaEncabezado(data: unknown[][]): number {
  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    if (row && row[0] && String(row[0]).toLowerCase().includes('nombre')) {
      return i
    }
  }
  return 4 // fallback: fila 5 (índice 4) según el formato actual
}

// Mapea nombres de columnas a índices
function mapearColumnas(headerRow: unknown[]): Record<string, number> {
  const map: Record<string, number> = {}
  headerRow.forEach((cell, idx) => {
    const key = String(cell || '').toLowerCase().trim()
    if (key.includes('nombre')) map.nombre = idx
    else if (key.includes('correo')) map.correo = idx
    else if (key.includes('tel')) map.telefono = idx
    else if (key.includes('comentario') || key.includes('contacto')) map.comentario = idx
    else if (key.includes('procedencia')) map.procedencia = idx
    else if (key.includes('cumplea')) map.cumpleanos = idx
    else if (key.includes('incorporaci')) map.fecha_incorporacion = idx
    else if (key.includes('asistencia')) map.asistencias = idx
  })
  return map
}

export function parseExcelFile(buffer: ArrayBuffer): {
  clientes: FilaCliente[]
  errores: string[]
  total: number
} {
  const workbook = XLSX.read(buffer, { type: 'array' })
  const clientes: FilaCliente[] = []
  const errores: string[] = []

  workbook.SheetNames.forEach(sheetName => {
    const ws = workbook.Sheets[sheetName]
    const data: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1 })

    const headerIdx = encontrarFilaEncabezado(data)
    if (headerIdx === -1 || headerIdx >= data.length - 1) {
      errores.push(`Hoja "${sheetName}": no se encontró fila de encabezados`)
      return
    }

    const cols = mapearColumnas(data[headerIdx] as unknown[])

    for (let i = headerIdx + 1; i < data.length; i++) {
      const row = data[i] as unknown[]
      if (!row || !row[cols.nombre]) continue // fila vacía

      const nombre = String(row[cols.nombre] ?? '').trim()
      if (!nombre) continue

      clientes.push({
        nombre,
        correo: cols.correo !== undefined ? String(row[cols.correo] ?? '').trim() || null : null,
        telefono: normalizarTelefono(cols.telefono !== undefined ? row[cols.telefono] : null),
        comentario: cols.comentario !== undefined ? String(row[cols.comentario] ?? '').trim() || null : null,
        procedencia: cols.procedencia !== undefined ? String(row[cols.procedencia] ?? '').trim() || null : null,
        cumpleanos: cols.cumpleanos !== undefined ? excelSerialToDate(row[cols.cumpleanos] as number) : null,
        fecha_incorporacion: cols.fecha_incorporacion !== undefined ? excelSerialToDate(row[cols.fecha_incorporacion] as number) : null,
        asistencias: cols.asistencias !== undefined ? parsearAsistencias(row[cols.asistencias]) : [],
      })
    }
  })

  return { clientes, errores, total: clientes.length }
}
