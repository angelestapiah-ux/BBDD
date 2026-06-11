import { createSupabaseServerClient, createSupabaseAdminClient } from './supabase-server'

// Registra una acción en la bitácora de auditoría.
// Fire-and-forget: nunca bloquea ni rompe la operación principal
// (si la tabla no existe aún, simplemente no registra).
export async function auditar(
  accion: 'crear' | 'editar' | 'eliminar' | 'exportar' | 'importar' | 'masiva' | 'acceso',
  tabla: string,
  registroId: string | null,
  detalle?: string,
  usuarioForzado?: string
) {
  try {
    let usuario = usuarioForzado
    if (!usuario) {
      const supa = await createSupabaseServerClient()
      const { data: { user } } = await supa.auth.getUser()
      usuario = user?.email ?? 'desconocido'
    }
    const admin = createSupabaseAdminClient()
    await admin.from('auditoria').insert({
      usuario,
      accion,
      tabla,
      registro_id: registroId,
      detalle: detalle?.slice(0, 500) ?? null,
    })
  } catch {
    // best-effort
  }
}
