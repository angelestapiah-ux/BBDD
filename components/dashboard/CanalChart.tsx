'use client'

import { useEffect, useState } from 'react'

interface CanalData {
  canal: string
  cantidad: number
}

interface CanalesResponse {
  canales: CanalData[]
  total: number
}

// Paleta de colores para los canales
const PALETA = [
  '#f97316', // orange-500
  '#fb923c', // orange-400
  '#fdba74', // orange-300
  '#3b82f6', // blue-500
  '#60a5fa', // blue-400
  '#93c5fd', // blue-300
  '#8b5cf6', // violet-500
  '#a78bfa', // violet-400
  '#10b981', // emerald-500
  '#6b7280', // gray-500 (Otros)
]

export function CanalChart() {
  const [datos, setDatos] = useState<CanalesResponse | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard/canales')
      .then(r => r.json())
      .then(d => { setDatos(d); setCargando(false) })
      .catch(() => setCargando(false))
  }, [])

  const maximo = datos ? Math.max(...datos.canales.map(c => c.cantidad), 1) : 1

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">Actividad por canal</h2>
          {datos && (
            <p className="text-xs text-gray-400 mt-0.5">{datos.total} clientes en total</p>
          )}
        </div>
      </div>

      {cargando ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-8 bg-gray-100 animate-pulse rounded-lg" />
          ))}
        </div>
      ) : !datos ? (
        <p className="text-sm text-gray-400">No se pudo cargar los canales.</p>
      ) : (
        <div className="space-y-2">
          {datos.canales.map((item, i) => {
            const pct = maximo > 0 ? (item.cantidad / maximo) * 100 : 0
            const porcentajeDel = datos.total > 0 ? Math.round((item.cantidad / datos.total) * 100) : 0
            const color = PALETA[i % PALETA.length]

            return (
              <div key={item.canal} className="flex items-center gap-3">
                {/* Indicador de color */}
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />

                {/* Nombre del canal */}
                <span className="text-xs text-gray-600 w-32 shrink-0 truncate" title={item.canal}>
                  {item.canal}
                </span>

                {/* Barra */}
                <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.max(pct, item.cantidad > 0 ? 1 : 0)}%`,
                      backgroundColor: color,
                      opacity: 0.85,
                    }}
                  />
                </div>

                {/* Cantidad */}
                <span className="text-sm font-semibold text-gray-700 w-10 text-right shrink-0">
                  {item.cantidad}
                </span>

                {/* % del total */}
                <span className="text-xs text-gray-400 w-8 shrink-0">
                  {porcentajeDel}%
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
