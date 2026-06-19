import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UserPlus, TrendingUp, AlertCircle, MessageSquare, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { ETAPAS_FUNNEL, EtapaFunnel } from '@/lib/types'

export const dynamic = 'force-dynamic'

type DashboardKpis = {
  nuevos_mes: number
  ingresos_mes: number
  ingresos_mes_anterior: number
  por_cobrar: number
  seguimientos_semana: number
}

const META_CONTACTOS = 50
const META_SEGUIMIENTOS = 20

const clp = (n: number) => `$${Math.round(n).toLocaleString('es-CL')}`

const ETAPA_COLOR: Record<EtapaFunnel, string> = {
  nuevo:              'bg-gray-400',
  contactado:         'bg-blue-500',
  con_interes:        'bg-violet-500',
  cotizacion_enviada: 'bg-yellow-500',
  negociando:         'bg-orange-500',
  inscrito:           'bg-green-500',
  en_pausa:           'bg-rose-400',
}

export default async function DashboardPage() {
  const supabase = createSupabaseAdminClient()
  const { data } = await supabase.rpc('dashboard_kpis')
  const k: DashboardKpis = (Array.isArray(data) && data[0]) || {
    nuevos_mes: 0, ingresos_mes: 0, ingresos_mes_anterior: 0, por_cobrar: 0, seguimientos_semana: 0,
  }

  // Bloque 2 — Funnel de avance: oportunidades por etapa
  const { data: funnelData } = await supabase.rpc('dashboard_funnel')
  const conteo: Record<string, number> = {}
  if (Array.isArray(funnelData)) {
    for (const f of funnelData as { etapa: string; total: number }[]) conteo[f.etapa] = f.total
  }
  const etapasLineales = ETAPAS_FUNNEL.filter(e => e.value !== 'en_pausa')
  const maxEtapa = Math.max(1, ...etapasLineales.map(e => conteo[e.value] || 0))
  const totalActivos = etapasLineales.reduce((s, e) => s + (conteo[e.value] || 0), 0)
  const enPausa = conteo['en_pausa'] || 0

  const delta = k.ingresos_mes - k.ingresos_mes_anterior
  const deltaPct = k.ingresos_mes_anterior > 0 ? delta / k.ingresos_mes_anterior : 0
  const subio = delta >= 0

  const hoy = new Date()
  const mesNombre = hoy.toLocaleDateString('es-CL', { month: 'long' })

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-sm text-gray-400 mt-0.5 capitalize">{mesNombre} {hoy.getFullYear()} · resumen comercial del mes</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Nuevos contactos del mes */}
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Nuevos contactos del mes</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{k.nuevos_mes}</p>
              </div>
              <div className="p-2 rounded-lg bg-orange-100"><UserPlus className="h-5 w-5 text-orange-600" /></div>
            </div>
            <div className="mt-3">
              <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full rounded-full bg-orange-500" style={{ width: `${Math.min(100, (k.nuevos_mes / META_CONTACTOS) * 100)}%` }} />
              </div>
              <p className="text-xs text-gray-400 mt-1">Meta: {META_CONTACTOS} · {Math.round((k.nuevos_mes / META_CONTACTOS) * 100)}%</p>
            </div>
          </CardContent>
        </Card>

        {/* Ingresos del mes vs mes anterior */}
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Ingresos del mes</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{clp(k.ingresos_mes)}</p>
              </div>
              <div className="p-2 rounded-lg bg-green-100"><TrendingUp className="h-5 w-5 text-green-600" /></div>
            </div>
            <div className="mt-3 flex items-center gap-1 text-xs">
              {subio
                ? <ArrowUpRight className="h-3.5 w-3.5 text-green-600" />
                : <ArrowDownRight className="h-3.5 w-3.5 text-rose-500" />}
              <span className={subio ? 'text-green-700 font-medium' : 'text-rose-600 font-medium'}>
                {subio ? '+' : ''}{clp(delta)} ({(deltaPct * 100).toFixed(0)}%)
              </span>
              <span className="text-gray-400">vs mes anterior ({clp(k.ingresos_mes_anterior)})</span>
            </div>
          </CardContent>
        </Card>

        {/* Por cobrar */}
        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Por cobrar</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{clp(k.por_cobrar)}</p>
              </div>
              <div className="p-2 rounded-lg bg-yellow-100"><AlertCircle className="h-5 w-5 text-yellow-600" /></div>
            </div>
            <p className="text-xs text-gray-400 mt-3">
              Cuotas pendientes y pagos por confirmar · <a href="/cobranza" className="text-orange-600 hover:underline">ver Cobranza</a>
            </p>
          </CardContent>
        </Card>

        {/* Seguimientos esta semana */}
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Seguimientos esta semana</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{k.seguimientos_semana}</p>
              </div>
              <div className="p-2 rounded-lg bg-blue-100"><MessageSquare className="h-5 w-5 text-blue-600" /></div>
            </div>
            <div className="mt-3">
              <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.min(100, (k.seguimientos_semana / META_SEGUIMIENTOS) * 100)}%` }} />
              </div>
              <p className="text-xs text-gray-400 mt-1">Meta: {META_SEGUIMIENTOS}/semana · últimos 7 días</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bloque 2 — Funnel de avance */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Funnel de avance</CardTitle>
          <p className="text-xs text-gray-400">
            {totalActivos} oportunidad{totalActivos === 1 ? '' : 'es'} en el funnel{enPausa > 0 ? ` · ${enPausa} en pausa` : ''}
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2.5">
            {etapasLineales.map(e => {
              const n = conteo[e.value] || 0
              const w = Math.round((n / maxEtapa) * 100)
              return (
                <div key={e.value} className="flex items-center gap-3">
                  <span className="w-36 text-sm text-gray-600 shrink-0">{e.label}</span>
                  <div className="flex-1 h-6 rounded bg-gray-100 overflow-hidden">
                    <div className={`h-full ${ETAPA_COLOR[e.value]} rounded`} style={{ width: `${w}%` }} />
                  </div>
                  <span className="w-10 text-right text-sm font-semibold text-gray-800 shrink-0">{n}</span>
                </div>
              )
            })}
          </div>
          {enPausa > 0 && (
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100">
              <span className="w-36 text-sm text-rose-600 shrink-0">En pausa</span>
              <div className="flex-1 h-6 rounded bg-gray-100 overflow-hidden">
                <div className={`h-full ${ETAPA_COLOR['en_pausa']} rounded`} style={{ width: `${Math.round((enPausa / maxEtapa) * 100)}%` }} />
              </div>
              <span className="w-10 text-right text-sm font-semibold text-rose-600 shrink-0">{enPausa}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-gray-400 mt-6">
        Bloques 1-2 de 6 · próximos: actividad por canal, ingresos por programa, seguimientos urgentes y actividad reciente.
      </p>
    </div>
  )
}
