import * as XLSX from 'xlsx'
import { ClienteConDetalle, Cliente, Asistencia, Pago, Seguimiento } from './types'

export interface ClienteExport {
  nombre: string
  correo: string | null
  telefono: string | null
  genero: string | null
  procedencia: string | null
  cumpleanos: string | null
  fecha_incorporacion: string | null
  comentario: string | null
}

// ─── Exportar lista de clientes ───────────────────────────────────────────────

export function exportarClientesExcel(clientes: ClienteExport[]) {
  const filas = clientes.map(c => ({
    'Nombre': c.nombre,
    'Correo': c.correo || '',
    'Teléfono': c.telefono || '',
    'Género': c.genero || '',
    'Procedencia': c.procedencia || '',
    'Cumpleaños': c.cumpleanos || '',
    'Fecha Incorporación': c.fecha_incorporacion || '',
    'Comentario': c.comentario || '',
  }))
  const ws = XLSX.utils.json_to_sheet(filas)
  ws['!cols'] = [{ wch: 30 }, { wch: 30 }, { wch: 15 }, { wch: 12 }, { wch: 20 }, { wch: 12 }, { wch: 18 }, { wch: 40 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Clientes')
  XLSX.writeFile(wb, `clientes_renova_${new Date().toISOString().slice(0, 10)}.xlsx`)
}

export async function exportarClientesPDF(clientes: ClienteExport[]) {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')
  const doc = new jsPDF({ orientation: 'landscape' })

  doc.setFontSize(16)
  doc.setTextColor(234, 88, 12)
  doc.text('RENOVA - Base de Clientes', 14, 16)
  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text(`Generado: ${new Date().toLocaleDateString('es-CL')} · Total: ${clientes.length} clientes`, 14, 23)

  autoTable(doc, {
    startY: 28,
    head: [['Nombre', 'Correo', 'Teléfono', 'Género', 'Procedencia', 'Cumpleaños', 'Incorporación']],
    body: clientes.map(c => [
      c.nombre, c.correo || '—', c.telefono || '—', c.genero || '—',
      c.procedencia || '—', c.cumpleanos || '—', c.fecha_incorporacion || '—',
    ]),
    headStyles: { fillColor: [234, 88, 12], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [255, 247, 237] },
    styles: { fontSize: 8, cellPadding: 3 },
  })

  doc.save(`clientes_renova_${new Date().toISOString().slice(0, 10)}.pdf`)
}

// ─── Exportar perfil completo de un cliente ───────────────────────────────────

export function exportarPerfilExcel(cliente: ClienteConDetalle) {
  const wb = XLSX.utils.book_new()
  const nombre = cliente.nombre.replace(/[^a-zA-Z0-9 ]/g, '').slice(0, 25)

  // Hoja 1: Datos personales
  const datosPersonales = [
    ['Campo', 'Valor'],
    ['Nombre', cliente.nombre],
    ['Correo', cliente.correo || ''],
    ['Teléfono', cliente.telefono || ''],
    ['Género', cliente.genero || ''],
    ['Procedencia', cliente.procedencia || ''],
    ['Cumpleaños', cliente.cumpleanos || ''],
    ['Fecha incorporación', cliente.fecha_incorporacion || ''],
    ['Comentario', cliente.comentario || ''],
  ]
  const wsDatos = XLSX.utils.aoa_to_sheet(datosPersonales)
  wsDatos['!cols'] = [{ wch: 22 }, { wch: 45 }]
  XLSX.utils.book_append_sheet(wb, wsDatos, 'Datos')

  // Hoja 2: Asistencias
  const asistencias = (cliente.asistencias || []).map(a => ({
    'Actividad': a.actividad_nombre,
    'Fecha': a.fecha_asistencia || '',
  }))
  const wsAsist = XLSX.utils.json_to_sheet(asistencias.length ? asistencias : [{ 'Actividad': 'Sin registros', 'Fecha': '' }])
  wsAsist['!cols'] = [{ wch: 40 }, { wch: 15 }]
  XLSX.utils.book_append_sheet(wb, wsAsist, 'Asistencias')

  // Hoja 3: Pagos
  const pagos = (cliente.pagos || []).map(p => ({
    'Actividad': p.actividad_nombre,
    'Monto': p.monto ?? '',
    'Fecha': p.fecha_pago || '',
    'Método': p.metodo_pago || '',
    'Estado': p.estado,
    'Notas': p.notas || '',
  }))
  const wsPagos = XLSX.utils.json_to_sheet(pagos.length ? pagos : [{ 'Actividad': 'Sin registros', 'Monto': '', 'Fecha': '', 'Método': '', 'Estado': '', 'Notas': '' }])
  wsPagos['!cols'] = [{ wch: 35 }, { wch: 12 }, { wch: 14 }, { wch: 16 }, { wch: 12 }, { wch: 35 }]
  XLSX.utils.book_append_sheet(wb, wsPagos, 'Pagos')

  // Hoja 4: Seguimientos
  const seguimientos = (cliente.seguimientos || []).map(s => ({
    'Tipo': s.tipo,
    'Fecha': s.fecha ? new Date(s.fecha).toLocaleString('es-CL') : '',
    'Responsable': s.usuario || '',
    'Notas': s.notas,
  }))
  const wsSeg = XLSX.utils.json_to_sheet(seguimientos.length ? seguimientos : [{ 'Tipo': 'Sin registros', 'Fecha': '', 'Responsable': '', 'Notas': '' }])
  wsSeg['!cols'] = [{ wch: 12 }, { wch: 20 }, { wch: 18 }, { wch: 50 }]
  XLSX.utils.book_append_sheet(wb, wsSeg, 'Seguimientos')

  XLSX.writeFile(wb, `perfil_${nombre}_${new Date().toISOString().slice(0, 10)}.xlsx`)
}

export async function exportarPerfilPDF(cliente: ClienteConDetalle) {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')
  const doc = new jsPDF()

  const naranja: [number, number, number] = [234, 88, 12]
  const naranjaSuave: [number, number, number] = [255, 247, 237]

  // Encabezado
  doc.setFillColor(...naranja)
  doc.rect(0, 0, 210, 28, 'F')
  doc.setFontSize(18)
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.text('RENOVA', 14, 12)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text('Perfil de Cliente', 14, 20)
  doc.setFontSize(9)
  doc.text(`Generado: ${new Date().toLocaleDateString('es-CL')}`, 140, 20)

  let y = 35

  // Datos personales
  doc.setFontSize(12)
  doc.setTextColor(...naranja)
  doc.setFont('helvetica', 'bold')
  doc.text(cliente.nombre, 14, y)
  y += 2

  autoTable(doc, {
    startY: y + 3,
    body: [
      ['Correo', cliente.correo || '—', 'Teléfono', cliente.telefono || '—'],
      ['Género', cliente.genero || '—', 'Procedencia', cliente.procedencia || '—'],
      ['Cumpleaños', cliente.cumpleanos || '—', 'Incorporación', cliente.fecha_incorporacion || '—'],
      ['Comentario', { content: cliente.comentario || '—', colSpan: 3 }],
    ],
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 32 }, 2: { fontStyle: 'bold', cellWidth: 32 } },
    styles: { fontSize: 9, cellPadding: 3 },
    theme: 'grid',
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 8

  // Asistencias
  doc.setFontSize(11)
  doc.setTextColor(...naranja)
  doc.setFont('helvetica', 'bold')
  doc.text('Asistencias a actividades', 14, y)

  autoTable(doc, {
    startY: y + 3,
    head: [['Actividad', 'Fecha']],
    body: cliente.asistencias?.length
      ? cliente.asistencias.map(a => [a.actividad_nombre, a.fecha_asistencia || '—'])
      : [['Sin asistencias registradas', '']],
    headStyles: { fillColor: naranja, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: naranjaSuave },
    styles: { fontSize: 8, cellPadding: 3 },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 8

  // Pagos
  doc.setFontSize(11)
  doc.setTextColor(...naranja)
  doc.setFont('helvetica', 'bold')
  doc.text('Pagos', 14, y)

  autoTable(doc, {
    startY: y + 3,
    head: [['Actividad', 'Monto', 'Fecha', 'Método', 'Estado']],
    body: cliente.pagos?.length
      ? cliente.pagos.map(p => [
          p.actividad_nombre,
          p.monto ? `$${p.monto.toLocaleString('es-CL')}` : '—',
          p.fecha_pago || '—',
          p.metodo_pago || '—',
          p.estado,
        ])
      : [['Sin pagos registrados', '', '', '', '']],
    headStyles: { fillColor: naranja, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: naranjaSuave },
    styles: { fontSize: 8, cellPadding: 3 },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 8

  // Seguimientos
  if (y > 240) { doc.addPage(); y = 20 }

  doc.setFontSize(11)
  doc.setTextColor(...naranja)
  doc.setFont('helvetica', 'bold')
  doc.text('Seguimientos', 14, y)

  autoTable(doc, {
    startY: y + 3,
    head: [['Tipo', 'Fecha', 'Responsable', 'Notas']],
    body: cliente.seguimientos?.length
      ? cliente.seguimientos.map(s => [
          s.tipo,
          s.fecha ? new Date(s.fecha).toLocaleString('es-CL') : '—',
          s.usuario || '—',
          s.notas,
        ])
      : [['Sin seguimientos registrados', '', '', '']],
    headStyles: { fillColor: naranja, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: naranjaSuave },
    styles: { fontSize: 8, cellPadding: 3 },
    columnStyles: { 3: { cellWidth: 70 } },
  })

  const nombre = cliente.nombre.replace(/[^a-zA-Z0-9 ]/g, '').slice(0, 25)
  doc.save(`perfil_${nombre}_${new Date().toISOString().slice(0, 10)}.pdf`)
}

// ─── Exportar todos los clientes con toda su información ─────────────────────

interface AsistenciaConNombre extends Asistencia { clientes?: { nombre: string } }
interface PagoConNombre extends Pago { clientes?: { nombre: string } }
interface SeguimientoConNombre extends Seguimiento { clientes?: { nombre: string } }

export function exportarTodoExcel(data: {
  clientes: Cliente[]
  asistencias: AsistenciaConNombre[]
  pagos: PagoConNombre[]
  seguimientos: SeguimientoConNombre[]
}) {
  const wb = XLSX.utils.book_new()

  // Hoja 1: Clientes
  const wsClientes = XLSX.utils.json_to_sheet(data.clientes.map(c => ({
    'Nombre': c.nombre,
    'Correo': c.correo || '',
    'Teléfono': c.telefono || '',
    'Género': c.genero || '',
    'Procedencia': c.procedencia || '',
    'Cumpleaños': c.cumpleanos || '',
    'Fecha Incorporación': c.fecha_incorporacion || '',
    'Comentario': c.comentario || '',
  })))
  wsClientes['!cols'] = [{ wch: 28 }, { wch: 28 }, { wch: 14 }, { wch: 12 }, { wch: 18 }, { wch: 12 }, { wch: 18 }, { wch: 40 }]
  XLSX.utils.book_append_sheet(wb, wsClientes, 'Clientes')

  // Hoja 2: Asistencias
  const wsAsistencias = XLSX.utils.json_to_sheet(
    data.asistencias.length
      ? data.asistencias.map(a => ({
          'Cliente': a.clientes?.nombre || '',
          'Actividad': a.actividad_nombre,
          'Fecha': a.fecha_asistencia || '',
        }))
      : [{ 'Cliente': 'Sin registros', 'Actividad': '', 'Fecha': '' }]
  )
  wsAsistencias['!cols'] = [{ wch: 28 }, { wch: 40 }, { wch: 14 }]
  XLSX.utils.book_append_sheet(wb, wsAsistencias, 'Asistencias')

  // Hoja 3: Pagos
  const wsPagos = XLSX.utils.json_to_sheet(
    data.pagos.length
      ? data.pagos.map(p => ({
          'Cliente': p.clientes?.nombre || '',
          'Actividad': p.actividad_nombre,
          'Monto': p.monto ?? '',
          'Fecha': p.fecha_pago || '',
          'Método': p.metodo_pago || '',
          'Estado': p.estado,
          'Notas': p.notas || '',
        }))
      : [{ 'Cliente': 'Sin registros', 'Actividad': '', 'Monto': '', 'Fecha': '', 'Método': '', 'Estado': '', 'Notas': '' }]
  )
  wsPagos['!cols'] = [{ wch: 28 }, { wch: 35 }, { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 10 }, { wch: 35 }]
  XLSX.utils.book_append_sheet(wb, wsPagos, 'Pagos')

  // Hoja 4: Seguimientos
  const wsSeguimientos = XLSX.utils.json_to_sheet(
    data.seguimientos.length
      ? data.seguimientos.map(s => ({
          'Cliente': s.clientes?.nombre || '',
          'Tipo': s.tipo,
          'Fecha': s.fecha ? new Date(s.fecha).toLocaleString('es-CL') : '',
          'Responsable': s.usuario || '',
          'Notas': s.notas,
        }))
      : [{ 'Cliente': 'Sin registros', 'Tipo': '', 'Fecha': '', 'Responsable': '', 'Notas': '' }]
  )
  wsSeguimientos['!cols'] = [{ wch: 28 }, { wch: 12 }, { wch: 20 }, { wch: 18 }, { wch: 50 }]
  XLSX.utils.book_append_sheet(wb, wsSeguimientos, 'Seguimientos')

  XLSX.writeFile(wb, `renova_base_completa_${new Date().toISOString().slice(0, 10)}.xlsx`)
}
