import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

export async function GET() {
  const encabezados = [
    'Nombre',
    'Correo',
    'Correo 2',
    'Teléfono',
    'Teléfono 2',
    'RUT/DNI/Pasaporte',
    'Edad',
    'Género',
    'Estado civil',
    'Profesión',
    'Ciudad',
    'País',
    'Tipo de cliente',
    'Modalidad paciente',
    'Terapeuta',
    'Procedencia',
    'Cumpleaños',
    'Fecha incorporación',
    'Comentario',
    'Asistencia actividad',
  ]

  const ejemplos = [
    {
      Nombre: 'María González',
      Correo: 'maria@gmail.com',
      'Correo 2': 'maria.trabajo@gmail.com',
      Teléfono: '56912345678',
      'Teléfono 2': '56922334455',
      'RUT/DNI/Pasaporte': '12.345.678-9',
      Edad: 40,
      Género: 'femenino',
      'Estado civil': 'Casado/a',
      'Profesión': 'Psicóloga',
      Ciudad: 'Santiago',
      País: 'Chile',
      'Tipo de cliente': 'Paciente',
      'Modalidad paciente': 'presencial',
      Terapeuta: 'Dr. Rodolfo Soto',
      Procedencia: 'Instagram',
      Cumpleaños: '15/03/1985',
      'Fecha incorporación': '01/01/2025',
      Comentario: 'Muy interesada en diplomado',
      'Asistencia actividad': 'Diplomado Practitioner',
    },
    {
      Nombre: 'Juan Pérez',
      Correo: 'juan@gmail.com',
      'Correo 2': '',
      Teléfono: '56987654321',
      'Teléfono 2': '',
      'RUT/DNI/Pasaporte': '9.876.543-2',
      Edad: 35,
      Género: 'masculino',
      'Estado civil': 'Soltero/a',
      'Profesión': 'Ingeniero',
      Ciudad: 'Valparaíso',
      País: 'Chile',
      'Tipo de cliente': 'Paciente Rodolfo',
      'Modalidad paciente': 'online',
      Terapeuta: '',
      Procedencia: 'Referido',
      Cumpleaños: '22/07/1990',
      'Fecha incorporación': '15/02/2025',
      Comentario: 'Referido por cliente anterior',
      'Asistencia actividad': 'Diplomado Practitioner // Taller Liderazgo',
    },
    {
      Nombre: 'Ana Rodríguez',
      Correo: 'ana@gmail.com',
      'Correo 2': '',
      Teléfono: '56965432198',
      'Teléfono 2': '',
      'RUT/DNI/Pasaporte': '',
      Edad: '',
      Género: 'femenino',
      'Estado civil': '',
      'Profesión': '',
      Ciudad: '',
      País: '',
      'Tipo de cliente': 'Alumno/a Diplomado Practitioner',
      'Modalidad paciente': '',
      Terapeuta: '',
      Procedencia: 'Facebook',
      Cumpleaños: '',
      'Fecha incorporación': '',
      Comentario: '',
      'Asistencia actividad': '',
    },
  ]

  const ws = XLSX.utils.json_to_sheet(ejemplos, { header: encabezados })

  ws['!cols'] = [
    { wch: 25 }, // Nombre
    { wch: 28 }, // Correo
    { wch: 28 }, // Correo 2
    { wch: 15 }, // Teléfono
    { wch: 15 }, // Teléfono 2
    { wch: 20 }, // RUT/DNI/Pasaporte
    { wch: 8  }, // Edad
    { wch: 12 }, // Género
    { wch: 22 }, // Estado civil
    { wch: 20 }, // Profesión
    { wch: 16 }, // Ciudad
    { wch: 12 }, // País
    { wch: 45 }, // Tipo de cliente
    { wch: 20 }, // Modalidad paciente
    { wch: 25 }, // Terapeuta
    { wch: 18 }, // Procedencia
    { wch: 14 }, // Cumpleaños
    { wch: 20 }, // Fecha incorporación
    { wch: 35 }, // Comentario
    { wch: 45 }, // Asistencia actividad
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Contactos')

  const wsInfo = XLSX.utils.aoa_to_sheet([
    ['Campo', 'Valores válidos / Instrucciones'],
    ['Género', 'femenino | masculino | otro'],
    ['Estado civil', 'Soltero/a | Casado/a | Separado/a | Divorciado/a | Acuerdo Unión Civil | Viudo/a'],
    ['Edad', 'Número entero. Ej: 35'],
    ['Tipo de cliente', 'Paciente | Alumno/a Diplomado Practitioner | Alumno/a Master | Asistente a Talleres | Paciente Fabiola | Paciente Rodolfo'],
    ['Tipo de cliente (múltiples)', 'Separar con // entre cada tipo. Ej: Paciente Fabiola // Alumno/a Master'],
    ['Modalidad paciente', 'presencial | online  (solo aplica si el tipo de cliente es Paciente, Paciente Fabiola o Paciente Rodolfo)'],
    ['Terapeuta', 'Nombre del terapeuta (solo aplica cuando el tipo de cliente es exactamente "Paciente")'],
    ['Cumpleaños', 'Formato dd/mm/aaaa. Ej: 25/12/1990'],
    ['Fecha incorporación', 'Formato dd/mm/aaaa. Ej: 01/03/2025'],
    ['Asistencia actividad', 'Separar con // para múltiples. Ej: Diplomado Practitioner // Taller Enero'],
  ])
  wsInfo['!cols'] = [{ wch: 28 }, { wch: 85 }]
  XLSX.utils.book_append_sheet(wb, wsInfo, 'Instrucciones')

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="plantilla_contactos_renova.xlsx"',
    },
  })
}
