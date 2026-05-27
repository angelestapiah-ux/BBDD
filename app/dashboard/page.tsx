'use client'

import { useEffect, useState, useCallback } from 'react'
import { UserPlus, DollarSign, Clock, MessageSquare, RefreshCw } from 'lucide-react'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { FunnelChart } from '@/components/dashboard/FunnelChart'
import { CanalChart } from '@/components/dashboard/CanalChart'
import { ProgramasTable } from '@/components/dashboard/ProgramasTable'
import { UrgentesPanel } from '@/components/dashboard/UrgentesPanel'
import { ActividadFeed } from '@/components/dashboard/ActividadFeed'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface KpiData {
  contactosMes: number
  contactosMesAnterior: number
  ingresosMes: number
  ingresosMesAnterior: number
  pagosPendientesTotal: number
  pagosPendientesCantidad: number
  seguimientosSemana: number
}

function calcularVariacion(actual: number, anterior: number): number | undefined {
  if (anterior === 0) return undefined
  return ((actual - anterior) / anterior) * 100
}

function formatPesos(valor: number): string {
  if (valor >= 1_000_000) return `$${(valor / 1_000_000).toFixed(1)}M`
  if (valor >= 1_000) return `$${(valor / 1_000).toFixed(0)}K`
  return `$${valor.toLocaleString()}`
}

export default function DashboardPage() {
  const [datos, setDatos] = useState<KpiData | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(false)
  const [ultimaActualizacion, setUltimaActualizacion] = useState<Date | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const cargarDatos = useCallback(async () => {
    setCargando(true)
    setError(false)
    try {
      const r = await fetch('/api/dashboard/kpis')
      const d = await r.json()
      setDatos(d)
      setUltimaActualizacion(new Date())
    } catch {
      setError(true)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargarDatos()
  }, [cargarDatos, refreshKey])

  function handleRefresh() {
    setRefreshKey(k => k + 1)
  }

  const mesActual = new Date().toLocaleString('es-CL', { month: 'long', year: 'numeric' })

  return (
    <div className="p-6 max-w-5xl">
      {/* Encabezado */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1 capitalize">{mesActual}</p>
        </div>
        <div className="flex items-center gap-3">
          {ultimaActualizacion && !cargando && (
            <span className="text-xs text-gray-400 hidden sm:block">
              Actualizado {format(ultimaActualizacion, "HH:mm 'del' d 'de' MMMM", { locale: es })}
            </span>
          )}
          <button
            onClick={handleRefresh}
            disabled={cargando}
            title="Actualizar datos"
            className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-300 transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`h-4 w-4 ${cargando ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-6">
          No se pudieron cargar los KPIs. Revisa la conexión con Supabase.
        </div>
      )}

      {/* Bloque 1 — KPIs principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* KPI 1: Nuevos contactos del mes */}
        <KpiCard
          titulo="Nuevos contactos"
          valor={cargando ? '—' : String(datos?.contactosMes ?? 0)}
          icono={UserPlus}
          colorIcono="orange"
          variacion={datos ? calcularVariacion(datos.contactosMes, datos.contactosMesAnterior) : undefined}
          cargando={cargando}
        />

        {/* KPI 2: Ingresos del mes */}
        <KpiCard
          titulo="Ingresos del mes"
          valor={cargando ? '—' : formatPesos(datos?.ingresosMes ?? 0)}
          icono={DollarSign}
          colorIcono="green"
          variacion={datos ? calcularVariacion(datos.ingresosMes, datos.ingresosMesAnterior) : undefined}
          cargando={cargando}
        />

        {/* KPI 3: Pagos pendientes */}
        <KpiCard
          titulo="Por cobrar"
          valor={cargando ? '—' : formatPesos(datos?.pagosPendientesTotal ?? 0)}
          subtitulo={datos ? `${datos.pagosPendientesCantidad} pago${datos.pagosPendientesCantidad !== 1 ? 's' : ''} pendiente${datos.pagosPendientesCantidad !== 1 ? 's' : ''}` : undefined}
          icono={Clock}
          colorIcono="yellow"
          cargando={cargando}
        />

        {/* KPI 4: Seguimientos esta semana */}
        <KpiCard
          titulo="Seguimientos (7 días)"
          valor={cargando ? '—' : String(datos?.seguimientosSemana ?? 0)}
          subtitulo="últimos 7 días"
          icono={MessageSquare}
          colorIcono="blue"
          cargando={cargando}
        />
      </div>

      {/* Bloque 2 — Funnel */}
      <div className="mt-6">
        <FunnelChart />
      </div>

      {/* Bloque 3 — Actividad por canal */}
      <div className="mt-6">
        <CanalChart />
      </div>

      {/* Bloque 4 — Ingresos por programa */}
      <div className="mt-6">
        <ProgramasTable />
      </div>

      {/* Bloques 5 y 6 — grid de dos columnas */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <UrgentesPanel />
        <ActividadFeed />
      </div>
    </div>
  )
}
