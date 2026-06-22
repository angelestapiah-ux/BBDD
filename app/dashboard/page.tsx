import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UserPlus, TrendingUp, AlertCircle, MessageSquare, ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react'
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

  // Bloque 3 — Actividad por canal: clientes por procedencia
  const { data: canalData } = await supabase.rpc('dashboard_canales')
  const canales = (Array.isArray(canalData) ? canalData : []) as { procedencia: string; total: number }[]
  const totalClientes = canales.reduce((s, c) => s + c.total, 0)
  const maxCanal = Math.max(1, ...canales.map(c => c.total))

  // Bloque 4 — Ingresos por programa (mes actual vs anterior, normalizado, cuota a cuota)
  const { data: ingProgData } = await supabase.rpc('dashboard_ingresos_programa')
  const ingProg = (Array.isArray(ingProgData) ? ingProgData : []) as
    { programa: string; mes_actual: number; mes_anterior: number }[]
  const totalIngActual = ingProg.reduce((s, p) => s + Number(p.mes_actual), 0)
  const totalIngAnterior = ingProg.reduce((s, p) => s + Number(p.mes_anterior), 0)
  const maxIng = Math.max(1, ...ingProg.map(p => Number(p.mes_actual)))

  // Bloque 5 — Seguimientos urgentes: leads nuevos (7 días) sin contacto +72h (rojos)
  const { data: urgData } = await supabase.rpc('dashboard_seguimientos_urgentes')
  const urgentes = (Array.isArray(urgData) ? urgData : []) as {
    cliente_id: string; nombre: string; correo: string | null; telefono: string | null
    procedencia: string | null; etapa: string | null; ultimo_contacto: string; horas: number
    nunca_contactado: boolean
  }[]
  const tiempoDesde = (horas: number) =>
    horas >= 48 ? `${Math.floor(horas / 24)} d` : `${horas} h`

  // Bloque 6 — Actividad reciente: feed de últimos movimientos (7 días)
  const { data: feedData } = await supabase.rpc('dashboard_actividad_reciente')
  const feed = (Array.isArray(feedData) ? feedData : []) as {
    tipo: string; cliente_id: string; cliente_nombre: string
    titulo: string; detalle: string | null; monto: number | null; fecha: string
  }[]
  const FEED_COLOR: Record<string, string> = {
    seguimiento: 'bg-blue-500', pago: 'bg-green-500', cuota: 'bg-emerald-500', etapa: 'bg-orange-500',
  }
  const fechaCorta = (s: string) =>
    new Date(s).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

  const delta = k.ingresos_mes - k.ingresos_mes_anterior
  const deltaPct = k.ingresos_mes_anterior > 0 ? delta / k.ingresos_mes_anterior : 0
  const subio = delta >= 0

  const hoy = new Date()
  const mesNombre = hoy.toLocaleDateString('es-CL', { month: 'long' })
  const mesAntNombre = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)
    .toLocaleDateString('es-CL', { month: 'long' })

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

      {/* Bloque 3 — Actividad por canal */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Actividad por canal</CardTitle>
          <p className="text-xs text-gray-400">{totalClientes} clientes por procedencia (canal de origen)</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2.5">
            {canales.slice(0, 12).map(c => {
              const w = Math.round((c.total / maxCanal) * 100)
              const sinProc = c.procedencia === 'Sin procedencia'
              const pctTotal = totalClientes > 0 ? Math.round((c.total / totalClientes) * 100) : 0
              return (
                <div key={c.procedencia} className="flex items-center gap-3">
                  <span className={`w-40 shrink-0 truncate text-sm ${sinProc ? 'italic text-gray-400' : 'text-gray-600'}`}>{c.procedencia}</span>
                  <div className="flex-1 h-6 rounded bg-gray-100 overflow-hidden">
                    <div className={`h-full rounded ${sinProc ? 'bg-gray-300' : 'bg-orange-500'}`} style={{ width: `${w}%` }} />
                  </div>
                  <span className="w-20 text-right shrink-0 text-sm">
                    <span className="font-semibold text-gray-800">{c.total}</span>
                    <span className="text-xs text-gray-400"> · {pctTotal}%</span>
                  </span>
                </div>
              )
            })}
          </div>
          {canales.length > 12 && (
            <p className="text-xs text-gray-400 mt-2">y {canales.length - 12} canal{canales.length - 12 === 1 ? '' : 'es'} más</p>
          )}
        </CardContent>
      </Card>

      {/* Bloque 4 — Ingresos por programa */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Ingresos por programa</CardTitle>
          <p className="text-xs text-gray-400 capitalize">
            {mesNombre} {clp(totalIngActual)} · <span className="lowercase">vs</span> {mesAntNombre} {clp(totalIngAnterior)}
          </p>
        </CardHeader>
        <CardContent>
          {ingProg.length === 0 ? (
            <p className="text-sm text-gray-400">Sin ingresos registrados en estos dos meses.</p>
          ) : (
            <div className="space-y-3">
              {ingProg.map(p => {
                const actual = Number(p.mes_actual)
                const anterior = Number(p.mes_anterior)
                const w = Math.round((actual / maxIng) * 100)
                const d = actual - anterior
                const subePrg = d >= 0
                return (
                  <div key={p.programa}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-gray-700 truncate">{p.programa}</span>
                      <span className="text-sm font-semibold text-gray-900 shrink-0">{clp(actual)}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full rounded-full bg-orange-500" style={{ width: `${w}%` }} />
                      </div>
                      <span className="w-44 text-right text-xs shrink-0 flex items-center justify-end gap-1">
                        {anterior > 0 || actual > 0 ? (
                          subePrg
                            ? <ArrowUpRight className="h-3 w-3 text-green-600" />
                            : <ArrowDownRight className="h-3 w-3 text-rose-500" />
                        ) : null}
                        <span className={subePrg ? 'text-green-700' : 'text-rose-600'}>
                          {subePrg ? '+' : ''}{clp(d)}
                        </span>
                        <span className="text-gray-400">· antes {clp(anterior)}</span>
                      </span>
                    </div>
                  </div>
                )
              })}
              <div className="flex items-center justify-between gap-3 pt-3 mt-1 border-t border-gray-100">
                <span className="text-sm font-medium text-gray-700">Total</span>
                <span className="text-sm font-bold text-gray-900">{clp(totalIngActual)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bloque 5 — Seguimientos urgentes */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-rose-500" /> Seguimientos urgentes
              </CardTitle>
              <p className="text-xs text-gray-400 mt-0.5">
                Prospectos nuevos (últimos 7 días) sin contacto hace +72h
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-rose-100 text-rose-700 text-sm font-bold px-3 py-1">
              {urgentes.length}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {urgentes.length === 0 ? (
            <p className="text-sm text-green-700">Al día: ningún prospecto nuevo sin contacto +72h. 🎉</p>
          ) : (
            <>
              <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 -mt-1">
                {urgentes.map(u => (
                  <a
                    key={u.cliente_id}
                    href={`/clientes/${u.cliente_id}`}
                    className="flex items-center gap-3 py-2 hover:bg-gray-50 rounded px-1"
                  >
                    <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm text-gray-800 truncate">{u.nombre}</span>
                      <span className="block text-xs text-gray-400 truncate">
                        {u.procedencia || 'Sin procedencia'}
                        {u.nunca_contactado ? ' · sin primer contacto' : ''}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs font-medium text-rose-600">{tiempoDesde(u.horas)}</span>
                  </a>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-3">
                Siguiente paso sugerido: abrir cada ficha y registrar el primer contacto ·{' '}
                <a href="/seguimientos" className="text-orange-600 hover:underline">ir a Seguimientos</a>
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Bloque 6 — Actividad reciente */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Actividad reciente</CardTitle>
          <p className="text-xs text-gray-400">Últimos movimientos del CRM (7 días)</p>
        </CardHeader>
        <CardContent>
          {feed.length === 0 ? (
            <p className="text-sm text-gray-400">Sin movimientos en los últimos 7 días.</p>
          ) : (
            <div className="max-h-96 overflow-y-auto divide-y divide-gray-100 -mt-1">
              {feed.map((ev, i) => (
                <div key={i} className="flex items-center gap-3 py-2">
                  <span className={`h-2 w-2 rounded-full shrink-0 ${FEED_COLOR[ev.tipo] || 'bg-gray-400'}`} />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm text-gray-800 truncate">
                      {ev.titulo}
                      {ev.monto != null ? <span className="font-semibold"> · {clp(Number(ev.monto))}</span> : null}
                    </span>
                    <span className="block text-xs text-gray-400 truncate">
                      <a href={`/clientes/${ev.cliente_id}`} className="hover:underline">{ev.cliente_nombre}</a>
                      {ev.detalle ? ` · ${ev.detalle}` : ''}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-gray-400">{fechaCorta(ev.fecha)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-gray-400 mt-6">
        Dashboard completo · 6 bloques.
      </p>
    </div>
  )
}
