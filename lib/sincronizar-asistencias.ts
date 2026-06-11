// Sincronía tipos de cliente ↔ actividades:
// si un tipo asignado coincide con una actividad del catálogo,
// se registra automáticamente la asistencia (sin duplicar).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function sincronizarAsistencias(supabase: any, clienteId: string, tipos: string[] | null) {
  try {
    if (!tipos || tipos.length === 0) return

    const [{ data: actividades }, { data: existentes }] = await Promise.all([
      supabase.from('actividades').select('nombre, fecha_inicio').in('nombre', tipos),
      supabase.from('asistencias').select('actividad_nombre').eq('cliente_id', clienteId),
    ])

    const yaRegistradas = new Set((existentes ?? []).map((a: { actividad_nombre: string }) => a.actividad_nombre))
    const nuevas = (actividades ?? [])
      .filter((a: { nombre: string }) => !yaRegistradas.has(a.nombre))
      .map((a: { nombre: string; fecha_inicio: string | null }) => ({
        cliente_id: clienteId,
        actividad_nombre: a.nombre,
        fecha_asistencia: a.fecha_inicio,
      }))

    if (nuevas.length > 0) await supabase.from('asistencias').insert(nuevas)
  } catch {
    // best-effort: nunca bloquear el guardado del cliente
  }
}
