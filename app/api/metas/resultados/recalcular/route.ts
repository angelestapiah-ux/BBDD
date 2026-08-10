import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { requirePermiso, requireEscritura } from '@/lib/permisos-server'

// Recalcula todas las mediciones automáticas (registro activo) para hoy.
// Metas anuales → acumulado de la ventana; el resto → total del periodo en curso.
// Antes del 1-sep la ventana está cerrada y devuelve una lista vacía.
export async function POST() {
  const bloqueoPermiso = await requirePermiso('dashboard')
  if (bloqueoPermiso) return bloqueoPermiso
  const bloqueoEscritura = await requireEscritura()
  if (bloqueoEscritura) return bloqueoEscritura

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase.rpc('recalcular_resultados_crm', {})

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const filas = (data ?? []) as { meta_id: string; periodo_etiqueta: string; valor: number; accion: string }[]
  return NextResponse.json({ ok: true, filas, total: filas.length })
}
