'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface EtapaData {
  etapa: string
  label: string
  cantidad: number
  porcentaje: number
}

interface FunnelData {
  etapas: EtapaData[]
  total: number
}

const COLORES: Record<string, string> = {
  nuevo:              'bg-gray-200 text-gray-700',
  contactado:         'bg-blue-100 text-blue-700',
  con_interes:        'bg-indigo-100 text-indigo-700',
  cotizacion_enviada: 'bg-yellow-100 text-yellow-700',
  negociando:         'bg-orange-100 text-orange-700',
  inscrito:           'bg-green-100 text-green-700',
}

const BARRA: Record<string, string> = {
  nuevo:              'bg-gray-300',
  contactado:         'bg-blue-300',
  con_interes:        'bg-indigo-400',
  cotizacion_enviada: 'bg-yellow-400',
  negociando:         'bg-orange-400',
  inscrito:           'bg-green-500',
}

export function FunnelChart() {
  const [datos, setDatos] = useState<FunnelData | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard/funnel')
      .then(r => r.json())
      .then(d => { setDatos(d); setCargando(false) })
      .catch(() => setCargando(false))
  }, [])

  const maximo = datos ? Math.max(...datos.etapas.map(e => e.cantidad), 1) : 1

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">Funnel de prospectos</h2>
          {datos && (
            <p className="text-xs text-gray-400 mt-0.5">{datos.total} contactos en total</p>
          )}
        </div>
      </div>

      {cargando ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 animate-pulse rounded-lg" />
          ))}
        </div>
      ) : !datos ? (
        <p className="text-sm text-gray-400">No se pudo cargar el funnel.</p>
      ) : (
        <div className="space-y-2">
          {datos.etapas.map((etapa, i) => {
            const anchoPct = maximo > 0 ? (etapa.cantidad / maximo) * 100 : 0
            return (
              <div key={etapa.etapa} className="flex items-center gap-3">
                {/* Número de etapa */}
                <span className="text-xs text-gray-400 w-3 shrink-0">{i + 1}</span>

                {/* Label */}
                <span className={cn(
                  'text-xs font-medium px-2 py-0.5 rounded-full shrink-0 w-36 text-center',
                  COLORES[etapa.etapa]
                )}>
                  {etapa.label}
                </span>

                {/* Barra */}
                <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all duration-500', BARRA[etapa.etapa])}
                    style={{ width: `${Math.max(anchoPct, etapa.cantidad > 0 ? 2 : 0)}%` }}
                  />
                </div>

                {/* Cantidad */}
                <span className="text-sm font-semibold text-gray-700 w-8 text-right shrink-0">
                  {etapa.cantidad}
                </span>

                {/* Porcentaje */}
                <span className="text-xs text-gray-400 w-9 shrink-0">
                  {etapa.porcentaje}%
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
