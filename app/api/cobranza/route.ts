import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { requirePermiso } from '@/lib/permisos-server'

// Cobranza por cuotas: consume las vistas cobranza_pendiente y resumen_cobranza_cliente.
export async function GET() {
  const bloqueo = await requirePermiso('reportes')
  if (bloqueo) return bloqueo
  const supabase = createSupabaseAdminClient()

  // Auto-saneo idempotente: marca como 'vencida' las cuotas con fecha pasada.
  // (El semáforo de la vista se calcula por fecha igual; esto persiste el estado.)
  try { await supabase.rpc('marcar_cuotas_vencidas') } catch { /* la función puede no existir en local */ }

  const [cuotasRes, clientesRes] = await Promise.all([
    supabase.from('cobranza_pendiente').select('*').order('fecha_vencimiento', { ascending: true }),
    supabase.from('resumen_cobranza_cliente').select('*').order('prioridad', { ascending: false }),
  ])
  if (cuotasRes.error) return NextResponse.json({ error: cuotasRes.error.message }, { status: 500 })
  if (clientesRes.error) return NextResponse.json({ error: clientesRes.error.message }, { status: 500 })

  const cuotas = (cuotasRes.data ?? []) as Array<{ monto: number | null; semaforo: string }>
  const total = cuotas.reduce((s, c) => s + (c.monto || 0), 0)
  const vencido = cuotas.filter(c => c.semaforo === 'rojo').reduce((s, c) => s + (c.monto || 0), 0)
  const porVencer = cuotas.filter(c => c.semaforo === 'ambar').reduce((s, c) => s + (c.monto || 0), 0)

  return NextResponse.json({
    cuotas: cuotasRes.data ?? [],
    clientes: clientesRes.data ?? [],
    total,
    vencido,
    porVencer,
  })
}
