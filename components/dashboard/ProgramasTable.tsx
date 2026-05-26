'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface Programa {
  nombre: string
  total: number
  mesActual: number
  mesAnterior: number
  cantidad: number
}

interface ProgramasResponse {
  programas: Programa[]
  totalGeneral: number
  totalMesActual: number
  totalMesAnterior: number
  mesLabel: string
  mesAnteriorLabel: string
}

function formatPesos(valor: number): string {
  if (valor >= 1_000_000) return `$${(valor / 1_000_000).toFixed(1)}M`
  if (valor >= 1_000) return `$${(valor / 1_000).toFixed(0)}K`
  if (valor === 0) return '—'
  return `$${valor.toLocaleString('es-CL')}`
}

function Variacion({ actual, anterior }: { actual: number; anterior: number }) {
  if (anterior === 0 && actual === 0) return <span className="text-gray-300">—</span>
  if (anterior === 0) return <span className="text-green-500 text-xs font-medium">Nuevo</span>

  const pct = ((actual - anterior) / anterior) * 100
  const abs = Math.abs(pct)

  if (abs < 1) return <span className="text-gray-400 flex items-center gap-0.5 text-xs"><Minus size={12} />0%</span>

  if (actual >= anterior) {
    return (
      <span className="text-green-600 flex items-center gap-0.5 text-xs font-medium">
        <TrendingUp size={12} />+{abs.toFixed(0)}%
      </span>
    )
  }
  return (
    <span className="text-red-500 flex items-center gap-0.5 text-xs font-medium">
      <TrendingDown size={12} />-{abs.toFixed(0)}%
    </span>
  )
}

export function ProgramasTable() {
  const [datos, setDatos] = useState<ProgramasResponse | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard/programas')
      .then(r => r.json())
      .then(d => { setDatos(d); setCargando(false) })
      .catch(() => setCargando(false))
  }, [])

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">Ingresos por programa</h2>
          {datos && (
            <p className="text-xs text-gray-400 mt-0.5">
              Total cobrado: {formatPesos(datos.totalGeneral)}
            </p>
          )}
        </div>
        {datos && (
          <div className="text-right text-xs text-gray-400">
            <span className="capitalize">{datos.mesLabel}</span>
            {' vs '}
            <span className="capitalize">{datos.mesAnteriorLabel}</span>
          </div>
        )}
      </div>

      {cargando ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-8 bg-gray-100 animate-pulse rounded" />
          ))}
        </div>
      ) : !datos ? (
        <p className="text-sm text-gray-400">No se pudieron cargar los ingresos.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs text-gray-400 font-medium pb-2">Programa</th>
                <th className="text-right text-xs text-gray-400 font-medium pb-2 pr-3 capitalize">
                  {datos.mesLabel}
                </th>
                <th className="text-right text-xs text-gray-400 font-medium pb-2 pr-3 capitalize">
                  {datos.mesAnteriorLabel}
                </th>
                <th className="text-right text-xs text-gray-400 font-medium pb-2 pr-3">Variación</th>
                <th className="text-right text-xs text-gray-400 font-medium pb-2">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {datos.programas.map((prog) => (
                <tr key={prog.nombre} className="hover:bg-gray-50 transition-colors">
                  <td className="py-2.5 text-sm text-gray-700 font-medium">{prog.nombre}</td>
                  <td className="py-2.5 text-right text-sm text-gray-700 pr-3">
                    {formatPesos(prog.mesActual)}
                  </td>
                  <td className="py-2.5 text-right text-sm text-gray-500 pr-3">
                    {formatPesos(prog.mesAnterior)}
                  </td>
                  <td className="py-2.5 text-right pr-3">
                    <Variacion actual={prog.mesActual} anterior={prog.mesAnterior} />
                  </td>
                  <td className="py-2.5 text-right text-sm font-semibold text-gray-800">
                    {formatPesos(prog.total)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200">
                <td className="pt-2.5 text-xs font-semibold text-gray-500">Total</td>
                <td className="pt-2.5 text-right text-sm font-semibold text-orange-600 pr-3">
                  {formatPesos(datos.totalMesActual)}
                </td>
                <td className="pt-2.5 text-right text-sm font-semibold text-gray-500 pr-3">
                  {formatPesos(datos.totalMesAnterior)}
                </td>
                <td className="pt-2.5 pr-3">
                  <Variacion actual={datos.totalMesActual} anterior={datos.totalMesAnterior} />
                </td>
                <td className="pt-2.5 text-right text-sm font-bold text-gray-900">
                  {formatPesos(datos.totalGeneral)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
