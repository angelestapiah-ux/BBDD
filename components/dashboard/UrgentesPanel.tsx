'use client'

import { useEffect, useState } from 'react'
import { Phone, Mail, MessageCircle, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProspectoUrgente {
  id: string
  nombre: string
  correo: string | null
  telefono: string | null
  procedencia: string | null
  created_at: string
  ultimoSeguimiento: string | null
  horasSinContacto: number
  semaforo: 'rojo' | 'ambar' | 'verde'
}

interface UrgentesResponse {
  prospectos: ProspectoUrgente[]
  total: number
  rojos: number
  ambar: number
  verdes: number
}

const SEMAFORO = {
  rojo: {
    dot:    'bg-red-500',
    badge:  'bg-red-50 text-red-700 border border-red-200',
    label:  '+72h sin contacto',
    row:    'hover:bg-red-50/40',
  },
  ambar: {
    dot:    'bg-yellow-400',
    badge:  'bg-yellow-50 text-yellow-700 border border-yellow-200',
    label:  '48–72h',
    row:    'hover:bg-yellow-50/40',
  },
  verde: {
    dot:    'bg-green-500',
    badge:  'bg-green-50 text-green-700 border border-green-200',
    label:  'Al día',
    row:    'hover:bg-green-50/40',
  },
}

function formatHoras(h: number): string {
  if (h < 24) return `${h}h`
  const dias = Math.floor(h / 24)
  const resto = h % 24
  return resto > 0 ? `${dias}d ${resto}h` : `${dias}d`
}

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })
}

export function UrgentesPanel() {
  const [datos, setDatos] = useState<UrgentesResponse | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard/urgentes')
      .then(r => r.json())
      .then(d => { setDatos(d); setCargando(false) })
      .catch(() => setCargando(false))
  }, [])

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">Seguimientos urgentes</h2>
          <p className="text-xs text-gray-400 mt-0.5">Prospectos de los últimos 7 días</p>
        </div>

        {/* Contadores semáforo */}
        {datos && (
          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
              <span className="font-semibold text-red-600">{datos.rojos}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />
              <span className="font-semibold text-yellow-600">{datos.ambar}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
              <span className="font-semibold text-green-600">{datos.verdes}</span>
            </span>
          </div>
        )}
      </div>

      {cargando ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 animate-pulse rounded-lg" />
          ))}
        </div>
      ) : !datos ? (
        <p className="text-sm text-gray-400">No se pudo cargar.</p>
      ) : datos.prospectos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-gray-400">
          <AlertTriangle size={28} className="mb-2 text-gray-300" />
          <p className="text-sm">No hay prospectos nuevos esta semana.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs text-gray-400 font-medium pb-2 w-4" />
                <th className="text-left text-xs text-gray-400 font-medium pb-2">Nombre</th>
                <th className="text-left text-xs text-gray-400 font-medium pb-2 hidden sm:table-cell">Canal</th>
                <th className="text-left text-xs text-gray-400 font-medium pb-2 hidden md:table-cell">Ingresó</th>
                <th className="text-right text-xs text-gray-400 font-medium pb-2">Sin contacto</th>
                <th className="text-right text-xs text-gray-400 font-medium pb-2 pl-3">Estado</th>
                <th className="text-right text-xs text-gray-400 font-medium pb-2 pl-3 hidden sm:table-cell">Contactar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {datos.prospectos.map(p => {
                const s = SEMAFORO[p.semaforo]
                return (
                  <tr key={p.id} className={cn('transition-colors', s.row)}>
                    {/* Dot */}
                    <td className="py-2.5 pr-2">
                      <span className={cn('w-2 h-2 rounded-full inline-block', s.dot)} />
                    </td>

                    {/* Nombre */}
                    <td className="py-2.5">
                      <a
                        href={`/clientes?q=${encodeURIComponent(p.nombre)}`}
                        className="font-medium text-gray-800 hover:text-orange-600 transition-colors"
                      >
                        {p.nombre}
                      </a>
                    </td>

                    {/* Canal */}
                    <td className="py-2.5 text-gray-500 hidden sm:table-cell">
                      {p.procedencia || <span className="text-gray-300">—</span>}
                    </td>

                    {/* Fecha de ingreso */}
                    <td className="py-2.5 text-gray-400 hidden md:table-cell">
                      {formatFecha(p.created_at)}
                    </td>

                    {/* Horas sin contacto */}
                    <td className="py-2.5 text-right">
                      <span className={cn(
                        'font-semibold',
                        p.semaforo === 'rojo' ? 'text-red-600' :
                        p.semaforo === 'ambar' ? 'text-yellow-600' : 'text-green-600'
                      )}>
                        {formatHoras(p.horasSinContacto)}
                      </span>
                    </td>

                    {/* Badge estado */}
                    <td className="py-2.5 pl-3 text-right">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', s.badge)}>
                        {s.label}
                      </span>
                    </td>

                    {/* Botones de contacto rápido */}
                    <td className="py-2.5 pl-3 text-right hidden sm:table-cell">
                      <div className="flex items-center justify-end gap-2">
                        {p.telefono && (
                          <a
                            href={`https://wa.me/${p.telefono.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-gray-400 hover:text-green-600 transition-colors"
                            title="WhatsApp"
                          >
                            <MessageCircle size={14} />
                          </a>
                        )}
                        {p.telefono && (
                          <a
                            href={`tel:${p.telefono}`}
                            className="text-gray-400 hover:text-blue-600 transition-colors"
                            title="Llamar"
                          >
                            <Phone size={14} />
                          </a>
                        )}
                        {p.correo && (
                          <a
                            href={`mailto:${p.correo}`}
                            className="text-gray-400 hover:text-orange-600 transition-colors"
                            title="Correo"
                          >
                            <Mail size={14} />
                          </a>
                        )}
                        {!p.telefono && !p.correo && (
                          <span className="text-gray-300 text-xs">Sin datos</span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
