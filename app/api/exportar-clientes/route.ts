import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import ExcelJS from 'exceljs'

const TIPOS = '"llamada,whatsapp,correo,visita,otro"'
const RESPONSABLES = '"Ángeles Tapia,Miriam Torres,Álvaro Valdés"'

const CLIENTE_COLS = 21 // columnas de datos del cliente (A..U)

// Columnas de tipo y responsable por seguimiento (1-indexed)
// Seg1: col 22 (V) tipo, 24 (X) responsable
// Seg2: col 26 (Z) tipo, 28 (AB) responsable ... etc
function tipoCol(seg: number) { return CLIENTE_COLS + (seg - 1) * 4 + 1 }
function responsableCol(seg: number) { return CLIENTE_COLS + (seg - 1) * 4 + 3 }

export async function GET() {
  const [clientesRes, asistenciasRes] = await Promise.all([
    supabase.from('clientes').select('*').order('nombre'),
    supabase.from('asistencias').select('cliente_id, actividad_nombre').order('fecha_asistencia'),
  ])

  if (clientesRes.error) return NextResponse.json({ error: clientesRes.error.message }, { status: 500 })

  const clientes = clientesRes.data ?? []
  const asistencias = asistenciasRes.data ?? []

  // Agrupar asistencias por cliente
  const porCliente = new Map<string, string[]>()
  for (const a of asistencias) {
    if (!porCliente.has(a.cliente_id)) porCliente.set(a.cliente_id, [])
    porCliente.get(a.cliente_id)!.push(a.actividad_nombre)
  }

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Clientes')

  // Definir columnas
  const segsColumns = []
  for (let i = 1; i <= 5; i++) {
    segsColumns.push({ header: `Seguimiento ${i} - Tipo`, key: `seg${i}_tipo`, width: 16 })
    segsColumns.push({ header: `Seguimiento ${i} - Fecha`, key: `seg${i}_fecha`, width: 18 })
    segsColumns.push({ header: `Seguimiento ${i} - Responsable`, key: `seg${i}_resp`, width: 20 })
    segsColumns.push({ header: `Seguimiento ${i} - Notas`, key: `seg${i}_notas`, width: 40 })
  }

  ws.columns = [
    { header: 'Nombre', key: 'nombre', width: 30 },
    { header: 'Correo', key: 'correo', width: 28 },
    { header: 'Correo 2', key: 'correo2', width: 28 },
    { header: 'Teléfono', key: 'telefono', width: 14 },
    { header: 'Teléfono 2', key: 'telefono2', width: 14 },
    { header: 'RUT/DNI/Pasaporte', key: 'documento_identidad', width: 18 },
    { header: 'Edad', key: 'edad', width: 8 },
    { header: 'Género', key: 'genero', width: 12 },
    { header: 'Estado Civil', key: 'estado_civil', width: 20 },
    { header: 'Profesión', key: 'profesion', width: 20 },
    { header: 'Ciudad', key: 'ciudad', width: 15 },
    { header: 'País', key: 'pais', width: 12 },
    { header: 'Procedencia', key: 'procedencia', width: 18 },
    { header: 'Modalidad', key: 'modalidad_paciente', width: 12 },
    { header: 'Terapeuta', key: 'terapeuta', width: 20 },
    { header: 'Tipos Cliente', key: 'tipos_cliente', width: 25 },
    { header: 'Fecha Incorporación', key: 'fecha_incorporacion', width: 18 },
    { header: 'Cumpleaños', key: 'cumpleanos', width: 12 },
    { header: 'Actividades asistidas', key: 'actividades', width: 45 },
    { header: 'Comentario actual', key: 'comentario', width: 40 },
    { header: 'Nuevo comentario', key: 'nuevo_comentario', width: 40 },
    ...segsColumns,
  ]

  // Estilo encabezado
  const headerRow = ws.getRow(1)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEA580C' } }
  headerRow.alignment = { vertical: 'middle', wrapText: true }
  headerRow.height = 30

  // Filas de datos
  for (const c of clientes) {
    const actividades = (porCliente.get(c.id) ?? []).join(' // ')
    ws.addRow({
      nombre: c.nombre ?? '',
      correo: c.correo ?? '',
      correo2: c.correo2 ?? '',
      telefono: c.telefono ?? '',
      telefono2: c.telefono2 ?? '',
      documento_identidad: c.documento_identidad ?? '',
      edad: c.edad ?? '',
      genero: c.genero ?? '',
      estado_civil: c.estado_civil ?? '',
      profesion: c.profesion ?? '',
      ciudad: c.ciudad ?? '',
      pais: c.pais ?? '',
      procedencia: c.procedencia ?? '',
      modalidad_paciente: c.modalidad_paciente ?? '',
      terapeuta: c.terapeuta ?? '',
      tipos_cliente: (c.tipos_cliente ?? []).join(', '),
      fecha_incorporacion: c.fecha_incorporacion ?? '',
      cumpleanos: c.cumpleanos ?? '',
      actividades,
      comentario: c.comentario ?? '',
      nuevo_comentario: '',
    })
  }

  // Validación de datos (dropdowns) para filas 2..500
  const maxRow = Math.max(clientes.length + 1, 100)
  for (let seg = 1; seg <= 5; seg++) {
    const tCol = tipoCol(seg)
    const rCol = responsableCol(seg)
    for (let row = 2; row <= maxRow; row++) {
      ws.getCell(row, tCol).dataValidation = {
        type: 'list', allowBlank: true, formulae: [TIPOS],
        showErrorMessage: true, errorTitle: 'Valor inválido',
        error: 'Elige: llamada, whatsapp, correo, visita u otro',
      }
      ws.getCell(row, rCol).dataValidation = {
        type: 'list', allowBlank: true, formulae: [RESPONSABLES],
        showErrorMessage: true, errorTitle: 'Valor inválido',
        error: 'Elige un responsable de la lista',
      }
    }
  }

  // Color de fondo suave en columnas de seguimiento
  for (let row = 2; row <= maxRow; row++) {
    for (let seg = 1; seg <= 5; seg++) {
      const startCol = CLIENTE_COLS + (seg - 1) * 4 + 1
      for (let col = startCol; col <= startCol + 3; col++) {
        ws.getCell(row, col).fill = {
          type: 'pattern', pattern: 'solid',
          fgColor: { argb: seg % 2 === 0 ? 'FFEFF6FF' : 'FFFFF7ED' },
        }
      }
    }
  }

  ws.views = [{ state: 'frozen', xSplit: 1, ySplit: 1 }] // Congelar fila 1 y col A

  const buffer = await wb.xlsx.writeBuffer()

  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="clientes_renova_${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  })
}
