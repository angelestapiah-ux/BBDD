import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { parseExcelFile } from '@/lib/excel-import'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file) return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 })

  const buffer = await file.arrayBuffer()
  const { clientes, errores, total } = parseExcelFile(buffer)

  if (total === 0) {
    return NextResponse.json({ error: 'No se encontraron clientes en el archivo', errores }, { status: 400 })
  }

  let importados = 0
  let duplicados = 0
  const erroresImport: string[] = [...errores]

  for (const fila of clientes) {
    // Verificar duplicado por correo o teléfono
    let clienteId: string | null = null

    if (fila.correo) {
      const { data } = await supabase
        .from('clientes')
        .select('id')
        .eq('correo', fila.correo)
        .maybeSingle()
      if (data) {
        clienteId = data.id
        duplicados++
      }
    }

    if (!clienteId && fila.telefono) {
      const { data } = await supabase
        .from('clientes')
        .select('id')
        .eq('telefono', fila.telefono)
        .maybeSingle()
      if (data) {
        clienteId = data.id
        duplicados++
      }
    }

    // Insertar cliente si no existe
    if (!clienteId) {
      const { data, error } = await supabase
        .from('clientes')
        .insert({
          nombre: fila.nombre,
          correo: fila.correo,
          telefono: fila.telefono,
          comentario: fila.comentario,
          procedencia: fila.procedencia,
          cumpleanos: fila.cumpleanos,
          fecha_incorporacion: fila.fecha_incorporacion,
        })
        .select('id')
        .single()

      if (error) {
        erroresImport.push(`Error al insertar "${fila.nombre}": ${error.message}`)
        continue
      }
      clienteId = data.id
      importados++
    }

    // Insertar asistencias
    if (fila.asistencias.length > 0 && clienteId) {
      const inserts = fila.asistencias.map(a => ({
        cliente_id: clienteId,
        actividad_nombre: a,
        fecha_asistencia: null,
      }))
      await supabase.from('asistencias').insert(inserts)
    }
  }

  return NextResponse.json({
    ok: true,
    total,
    importados,
    duplicados,
    errores: erroresImport,
  })
}
