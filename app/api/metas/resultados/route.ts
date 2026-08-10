import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { requirePermiso, requireEscritura, getPerfilActual } from '@/lib/permisos-server'

// Carga o corrige una medición a mano. El backend resuelve la casilla de
// periodo que contiene a `ref` (recortada a la ventana del plan) y hace upsert.
export async function POST(req: NextRequest) {
  const bloqueoPermiso = await requirePermiso('dashboard')
  if (bloqueoPermiso) return bloqueoPermiso
  const bloqueoEscritura = await requireEscritura()
  if (bloqueoEscritura) return bloqueoEscritura

  const perfil = await getPerfilActual()

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 })
  }

  const metaId = typeof body.meta_id === 'string' ? body.meta_id.trim() : ''
  const valorNum = Number(body.valor)
  const ref =
    typeof body.ref === 'string' && body.ref !== ''
      ? body.ref
      : new Date().toISOString().slice(0, 10)
  const nota =
    typeof body.nota === 'string' && body.nota.trim() !== '' ? body.nota.trim() : null

  if (metaId === '' || !Number.isFinite(valorNum)) {
    return NextResponse.json({ error: 'Indique la meta y un valor numérico.' }, { status: 400 })
  }

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase.rpc('registrar_resultado_manual', {
    p_meta_id: metaId,
    p_ref: ref,
    p_valor: valorNum,
    p_nota: nota,
    p_medido_por: perfil?.userId ?? null,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, resultado: data })
}
