import Link from 'next/link'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, AlertCircle } from 'lucide-react'
import CargaResultados from '@/components/metas/CargaResultados'
import { aMeta, aResultado, type Meta, type Resultado } from '@/lib/metas'

export const dynamic = 'force-dynamic'

export type FilaCalculo = { meta_id: string; metodo: string; activo: boolean; nota: string | null }

export default async function CargaResultadosPage() {
  const supabase = createSupabaseAdminClient()

  const [resMetas, resResultados, resCalculo] = await Promise.all([
    supabase.from('metas').select('*').order('nivel').order('id'),
    supabase.from('resultados').select('meta_id, periodicidad, periodo_etiqueta, periodo_inicio, periodo_fin, valor, fuente, metodo_crm, nota, updated_at'),
    supabase.from('metas_calculo_crm').select('meta_id, metodo, activo, nota'),
  ])

  const mensajeError =
    (resMetas.error?.message as string | undefined) ??
    (resResultados.error?.message as string | undefined) ??
    (resCalculo.error?.message as string | undefined) ??
    null

  if (mensajeError !== null) {
    return (
      <div className="max-w-5xl p-6">
        <h2 className="text-2xl font-bold text-gray-900">Cargar mediciones</h2>
        <Card className="mt-6 border-l-4 border-l-rose-500">
          <CardContent className="flex items-start gap-3 p-5">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
            <div>
              <p className="text-sm font-medium text-gray-900">La lectura de mediciones quedó en pausa</p>
              <p className="mt-1 text-sm text-gray-500">{mensajeError}</p>
              <p className="mt-2 text-xs text-gray-400">
                Siguiente paso: confirmar que la migración de la tabla <code className="rounded bg-gray-100 px-1">resultados</code> esté aplicada en Supabase.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const metas: Meta[] = ((resMetas.data ?? []) as unknown as Record<string, unknown>[]).map(aMeta)
  const resultados: Resultado[] =
    ((resResultados.data ?? []) as unknown as Record<string, unknown>[]).map(aResultado)
  const calculo = ((resCalculo.data ?? []) as unknown as FilaCalculo[])

  const hoyISO = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })

  return (
    <div className="max-w-5xl p-6">
      <div className="mb-6">
        <Link href="/dashboard/metas" className="inline-flex items-center gap-1.5 text-sm text-orange-600 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Metas de marketing
        </Link>
        <h2 className="mt-2 text-2xl font-bold text-gray-900">Cargar mediciones</h2>
        <p className="mt-0.5 text-sm text-gray-400">
          El valor real de cada meta · a mano, o calculado desde el propio CRM
        </p>
      </div>

      <CargaResultados metas={metas} resultados={resultados} calculo={calculo} hoyISO={hoyISO} />
    </div>
  )
}
