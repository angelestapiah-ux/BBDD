import * as XLSX from 'xlsx'

export interface FilaCliente {
  nombre: string
  correo: string | null
  correo2: string | null
  telefono: string | null
  telefono2: string | null
  genero: string | null
  tipos_cliente: string[]
  modalidad_paciente: 'online' | 'presencial' | null
  terapeuta: string | null
  edad: number | null
  documento_identidad: string | null
  estado_civil: string | null
  profesion: string | null
  ciudad: string | null
  pais: string | null
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
    const d = new Date(serial)
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
    return null
  }
  if (typeof serial === 'number') {
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

// Parsea valores separados por // o salto de línea
function parsearLista(raw: unknown): string[] {
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
  return 4
}

// Mapea nombres de columnas a índices
function mapearColumnas(headerRow: unknown[]): Record<string, number> {
  const map: Record<string, number> = {}
  headerRow.forEach((cell, idx) => {
    const key = String(cell || '').toLowerCase().trim()
    if (key.includes('nombre')) map.nombre = idx
    else if (key.includes('correo') && (key.includes('2') || key.includes('two') || key.includes('segundo'))) map.correo2 = idx
    else if (key.includes('correo')) map.correo = idx
    else if (key.includes('tel') && (key.includes('2') || key.includes('two') || key.includes('segundo'))) map.telefono2 = idx
    else if (key.includes('tel')) map.telefono = idx
    else if (key.includes('g\u00e9nero') || key === 'genero') map.genero = idx
    else if (key.includes('tipo')) map.tipos_cliente = idx
    else if (key.includes('modalidad')) map.modalidad_paciente = idx
    else if (key.includes('terapeuta')) map.terapeuta = idx
    else if (key.includes('edad')) map.edad = idx
    else if (key.includes('rut') || key.includes('dni') || key.includes('pasaporte') || key.includes('documento')) map.documento_identidad = idx
    else if (key.includes('estado')) map.estado_civil = idx
    else if (key.includes('profesi')) map.profesion = idx
    else if (key.includes('ciudad')) map.ciudad = idx
    else if (key.includes('pa\u00eds') || key === 'pais') map.pais = idx
    else if (key.includes('comentario') || key.includes('contacto')) map.comentario = idx
    else if (key.includes('procedencia')) map.procedencia = idx
    else if (key.includes('cumplea')) map.cumpleanos = idx
    else if (key.includes('incorporaci')) map.fecha_incorporacion = idx
    else if (key.includes('asistencia')) map.asistencias = idx
  })
  return map
}

// Clave de normalización para detectar duplicados por nombre
function normalizarNombre(nombre: string): string {
  return nombre.toLowerCase().trim().replace(/\s+/g, ' ')
}

// Fusiona dos filas del mismo cliente tomando el primer valor no nulo
// y combinando las listas sin duplicados
function fusionarFilas(base: FilaCliente, nueva: FilaCliente): FilaCliente {
  return {
    nombre: base.nombre,
    correo: base.correo ?? nueva.correo,
    correo2: base.correo2 ?? nueva.correo2,
    telefono: base.telefono ?? nueva.telefono,
    telefono2: base.telefono2 ?? nueva.telefono2,
    genero: base.genero ?? nueva.genero,
    modalidad_paciente: base.modalidad_paciente ?? nueva.modalidad_paciente,
    terapeuta: base.terapeuta ?? nueva.terapeuta,
    edad: base.edad ?? nueva.edad,
    documento_identidad: base.documento_identidad ?? nueva.documento_identidad,
    estado_civil: base.estado_civil ?? nueva.estado_civil,
    profesion: base.profesion ?? nueva.profesion,
    ciudad: base.ciudad ?? nueva.ciudad,
    pais: base.pais ?? nueva.pais,
    comentario: base.comentario ?? nueva.comentario,
    procedencia: base.procedencia ?? nueva.procedencia,
    cumpleanos: base.cumpleanos ?? nueva.cumpleanos,
    fecha_incorporacion: base.fecha_incorporacion ?? nueva.fecha_incorporacion,
    tipos_cliente: [...new Set([...base.tipos_cliente, ...nueva.tipos_cliente])],
    asistencias: [...new Set([...base.asistencias, ...nueva.asistencias])],
  }
}

export function parseExcelFile(buffer: ArrayBuffer): {
  clientes: FilaCliente[]
  errores: string[]
  total: number
} {
  const workbook = XLSX.read(buffer, { type: 'array' })
  const errores: string[] = []

  // Mapa para agrupar por nombre normalizado (deduplicación interna del archivo)
  const mapaClientes = new Map<string, FilaCliente>()

  workbook.SheetNames.forEach(sheetName => {
    // Ignorar la hoja de instrucciones
    if (sheetName.toLowerCase().includes('instruc')) return

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
      if (!row || !row[cols.nombre]) continue

      const nombre = String(row[cols.nombre] ?? '').trim()
      if (!nombre) continue

      const generoRaw = cols.genero !== undefined ? String(row[cols.genero] ?? '').trim().toLowerCase() : ''
      const generoValido = ['femenino', 'masculino', 'otro'].includes(generoRaw) ? generoRaw : null

      const modalidadRaw = cols.modalidad_paciente !== undefined ? String(row[cols.modalidad_paciente] ?? '').trim().toLowerCase() : ''
      const modalidadValida = ['online', 'presencial'].includes(modalidadRaw) ? modalidadRaw as 'online' | 'presencial' : null

      const fila: FilaCliente = {
        nombre,
        correo: cols.correo !== undefined ? String(row[cols.correo] ?? '').trim() || null : null,
        correo2: cols.correo2 !== undefined ? String(row[cols.correo2] ?? '').trim() || null : null,
        telefono: normalizarTelefono(cols.telefono !== undefined ? row[cols.telefono] : null),
        telefono2: normalizarTelefono(cols.telefono2 !== undefined ? row[cols.telefono2] : null),
        genero: generoValido,
        tipos_cliente: cols.tipos_cliente !== undefined ? parsearLista(row[cols.tipos_cliente]) : [],
        modalidad_paciente: modalidadValida,
        terapeuta: cols.terapeuta !== undefined ? String(row[cols.terapeuta] ?? '').trim() || null : null,
        edad: cols.edad !== undefined && row[cols.edad] ? Number(row[cols.edad]) || null : null,
        documento_identidad: cols.documento_identidad !== undefined ? String(row[cols.documento_identidad] ?? '').trim() || null : null,
        estado_civil: cols.estado_civil !== undefined ? String(row[cols.estado_civil] ?? '').trim() || null : null,
        profesion: cols.profesion !== undefined ? String(row[cols.profesion] ?? '').trim() || null : null,
        ciudad: cols.ciudad !== undefined ? String(row[cols.ciudad] ?? '').trim() || null : null,
        pais: cols.pais !== undefined ? String(row[cols.pais] ?? '').trim() || null : null,
        comentario: cols.comentario !== undefined ? String(row[cols.comentario] ?? '').trim() || null : null,
        procedencia: cols.procedencia !== undefined ? String(row[cols.procedencia] ?? '').trim() || null : null,
        cumpleanos: cols.cumpleanos !== undefined ? excelSerialToDate(row[cols.cumpleanos] as number) : null,
        fecha_incorporacion: cols.fecha_incorporacion !== undefined ? excelSerialToDate(row[cols.fecha_incorporacion] as number) : null,
        asistencias: cols.asistencias !== undefined ? parsearLista(row[cols.asistencias]) : [],
      }

      const clave = normalizarNombre(nombre)
      if (mapaClientes.has(clave)) {
        // Ya existe: fusionar información
        mapaClientes.set(clave, fusionarFilas(mapaClientes.get(clave)!, fila))
      } else {
        mapaClientes.set(clave, fila)
      }
    }
  })

  const clientes = Array.from(mapaClientes.values())
  return { clientes, errores, total: clientes.length }
}
