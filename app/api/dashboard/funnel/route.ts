import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { requirePermiso } from '@/lib/permisos-server'
import { NextResponse } from 'next/server'
import { EtapaFunnel, ETAPAS_FUNNEL } from '@/lib/types'

export async function GET() {
  const bloqueo = await requirePermiso('dashboard')
  if (bloqueo) return bloqueo
  try {
    const supabase = createSupabaseAdminClient()

    // Una query de conteo por etapa — sin límite de filas
    const conteos = await Promise.all(
      ETAPAS_FUNNEL.map(async (e) => {
        const { count } = await supabase
          .from('clientes')
          .select('*', { count: 'exact', head: true })
          .eq('etapa', e.value)
        return { etapa: e.value, label: e.label, cantidad: count ?? 0 }
      })
    )

    // También contar los que tienen etapa null (quedan como 'nuevo')
    const { count: sinEtapa } = await supabase
      .from('clientes')
      .select('*', { count: 'exact', head: true })
      .is('etapa', null)

    // Sumar los null al bucket 'nuevo'
    const resultado = conteos.map(e =>
      e.etapa === 'nuevo'
        ? { ...e, cantidad: e.cantidad + (sinEtapa ?? 0) }
        : e
    )

    const total = resultado.reduce((s, e) => s + e.cantidad, 0)

    const final = resultado.map(e => ({
      ...e,
      porcentaje: total > 0 ? Math.round((e.cantidad / total) * 100) : 0,
    }))

    return NextResponse.json({ etapas: final, total })
  } catch (error) {
    console.error('[dashboard/funnel]', error)
    return NextResponse.json({ error: 'Error al obtener funnel' }, { status: 500 })
  }
}
