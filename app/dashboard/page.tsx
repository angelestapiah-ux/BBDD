import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { Card, CardContent } from '@/components/ui/card'
import { UserPlus, TrendingUp, AlertCircle, MessageSquare, ArrowUpRight, ArrowDownRight } from 'lucide-react'

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

export default async function DashboardPage() {
  const supabase = createSupabaseAdminClient()
  const { data } = await supabase.rpc('dashboard_kpis')
  const k: DashboardKpis = (Array.isArray(data) && data[0]) || {
    nuevos_mes: 0, ingresos_mes: 0, ingresos_mes_anterior: 0, por_cobrar: 0, seguimientos_semana: 0,
  }

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

      <p className="text-xs text-gray-400 mt-6">
        Bloque 1 de 6 · próximos: funnel de avance, actividad por canal, ingresos por programa, seguimientos urgentes y actividad reciente.
      </p>
    </div>
  )
}
