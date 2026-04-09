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
  let actualizados = 0
  const erroresImport: string[] = [...errores]

  for (const fila of clientes) {
    let clienteId: string | null = null

    // 1. Buscar por correo
    if (fila.correo) {
      const { data } = await supabase
        .from('clientes')
        .select('id')
        .eq('correo', fila.correo)
        .maybeSingle()
      if (data) clienteId = data.id
    }

    // 2. Buscar por teléfono
    if (!clienteId && fila.telefono) {
      const { data } = await supabase
        .from('clientes')
        .select('id')
        .eq('telefono', fila.telefono)
        .maybeSingle()
      if (data) clienteId = data.id
    }

    // 3. Buscar por nombre (case-insensitive)
    if (!clienteId) {
      const { data } = await supabase
        .from('clientes')
        .select('id, correo, telefono, genero, comentario, procedencia, cumpleanos, fecha_incorporacion, tipos_cliente')
        .ilike('nombre', fila.nombre.trim())
        .maybeSingle()
      if (data) clienteId = data.id
    }

    if (clienteId) {
      // Cliente ya existe: obtener datos actuales y completar solo los campos vacíos
      const { data: existente } = await supabase
        .from('clientes')
        .select('correo, correo2, telefono, telefono2, genero, modalidad_paciente, terapeuta, edad, documento_identidad, estado_civil, profesion, ciudad, pais, comentario, procedencia, cumpleanos, fecha_incorporacion, tipos_cliente')
        .eq('id', clienteId)
        .single()

      const actualizacion: Record<string, unknown> = {}
      if (!existente?.correo && fila.correo) actualizacion.correo = fila.correo
      if (!existente?.correo2 && fila.correo2) actualizacion.correo2 = fila.correo2
      if (!existente?.telefono && fila.telefono) actualizacion.telefono = fila.telefono
      if (!existente?.telefono2 && fila.telefono2) actualizacion.telefono2 = fila.telefono2
      if (!existente?.genero && fila.genero) actualizacion.genero = fila.genero
      if (!existente?.modalidad_paciente && fila.modalidad_paciente) actualizacion.modalidad_paciente = fila.modalidad_paciente
      if (!existente?.terapeuta && fila.terapeuta) actualizacion.terapeuta = fila.terapeuta
      if (!existente?.edad && fila.edad) actualizacion.edad = fila.edad
      if (!existente?.documento_identidad && fila.documento_identidad) actualizacion.documento_identidad = fila.documento_identidad
      if (!existente?.estado_civil && fila.estado_civil) actualizacion.estado_civil = fila.estado_civil
      if (!existente?.profesion && fila.profesion) actualizacion.profesion = fila.profesion
      if (!existente?.ciudad && fila.ciudad) actualizacion.ciudad = fila.ciudad
      if (!existente?.pais && fila.pais) actualizacion.pais = fila.pais
      if (!existente?.comentario && fila.comentario) actualizacion.comentario = fila.comentario
      if (!existente?.procedencia && fila.procedencia) actualizacion.procedencia = fila.procedencia
      if (!existente?.cumpleanos && fila.cumpleanos) actualizacion.cumpleanos = fila.cumpleanos
      if (!existente?.fecha_incorporacion && fila.fecha_incorporacion) actualizacion.fecha_incorporacion = fila.fecha_incorporacion

      // Tipos de cliente: combinar sin duplicar
      if (fila.tipos_cliente.length > 0) {
        const tiposActuales: string[] = existente?.tipos_cliente ?? []
        const tiposCombinados = [...new Set([...tiposActuales, ...fila.tipos_cliente])]
        if (tiposCombinados.length > tiposActuales.length) {
          actualizacion.tipos_cliente = tiposCombinados
        }
      }

      if (Object.keys(actualizacion).length > 0) {
        await supabase.from('clientes').update(actualizacion).eq('id', clienteId)
        actualizados++
      }
    } else {
      // Cliente nuevo: insertar
      const { data, error } = await supabase
        .from('clientes')
        .insert({
          nombre: fila.nombre,
          correo: fila.correo,
          correo2: fila.correo2,
          telefono: fila.telefono,
          telefono2: fila.telefono2,
          genero: fila.genero,
          tipos_cliente: fila.tipos_cliente.length > 0 ? fila.tipos_cliente : [],
          modalidad_paciente: fila.modalidad_paciente,
          terapeuta: fila.terapeuta,
          edad: fila.edad,
          documento_identidad: fila.documento_identidad,
          estado_civil: fila.estado_civil,
          profesion: fila.profesion,
          ciudad: fila.ciudad,
          pais: fila.pais,
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

    // Insertar asistencias (sin duplicar las que ya existen)
    if (fila.asistencias.length > 0 && clienteId) {
      const { data: asistenciasExistentes } = await supabase
        .from('asistencias')
        .select('actividad_nombre')
        .eq('cliente_id', clienteId)

      const nombresExistentes = new Set((asistenciasExistentes ?? []).map((a: { actividad_nombre: string }) => a.actividad_nombre))
      const nuevas = fila.asistencias
        .filter(a => !nombresExistentes.has(a))
        .map(a => ({ cliente_id: clienteId, actividad_nombre: a, fecha_asistencia: null }))

      if (nuevas.length > 0) {
        await supabase.from('asistencias').insert(nuevas)
      }
    }
  }

  return NextResponse.json({
    ok: true,
    total,
    importados,
    actualizados,
    errores: erroresImport,
  })
}
