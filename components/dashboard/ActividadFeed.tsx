'use client'

import { useEffect, useState, useCallback } from 'react'
import { UserPlus, DollarSign, MessageSquare, Clock, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

type TipoEvento = 'cliente_nuevo' | 'pago' | 'seguimiento' | 'pago_pendiente'

interface Evento {
  id: string
  tipo: TipoEvento
  titulo: string
  detalle: string | null
  fecha: string
  clienteNombre: string | null
  monto?: number | null
  estado?: string | null
}

const TIPO_CONFIG: Record<TipoEvento, {
  icon: React.ElementType
  iconBg: string
  iconColor: string
}> = {
  cliente_nuevo: {
    icon: UserPlus,
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-600',
  },
  pago: {
    icon: DollarSign,
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
  },
  pago_pendiente: {
    icon: Clock,
    iconBg: 'bg-yellow-100',
    iconColor: 'text-yellow-600',
  },
  seguimiento: {
    icon: MessageSquare,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
  },
}

function formatPesos(valor: number): string {
  if (valor >= 1_000_000) return `$${(valor / 1_000_000).toFixed(1)}M`
  if (valor >= 1_000) return `$${(valor / 1_000).toFixed(0)}K`
  return `$${valor.toLocaleString('es-CL')}`
}

function tiempoRelativo(isoFecha: string): string {
  const diff = Date.now() - new Date(isoFecha).getTime()
  const mins  = Math.floor(diff / 60_000)
  const horas = Math.floor(diff / 3_600_000)
  const dias  = Math.floor(diff / 86_400_000)

  if (mins < 1)   return 'ahora mismo'
  if (mins < 60)  return `hace ${mins} min`
  if (horas < 24) return `hace ${horas}h`
  if (dias === 1) return 'ayer'
  if (dias < 7)   return `hace ${dias} días`
  return new Date(isoFecha).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })
}

export function ActividadFeed() {
  const [eventos, setEventos] = useState<Evento[]>([])
  const [cargando, setCargando] = useState(true)
  const [ultimaActualizacion, setUltimaActualizacion] = useState<Date | null>(null)
  const [refrescando, setRefrescando] = useState(false)

  const cargar = useCallback(async (silencioso = false) => {
    if (!silencioso) setCargando(true)
    else setRefrescando(true)

    try {
      const r = await fetch('/api/dashboard/actividad')
      const d = await r.json()
      setEventos(d.eventos ?? [])
      setUltimaActualizacion(new Date())
    } catch {
      // silencioso en auto-refresh
    } finally {
      setCargando(false)
      setRefrescando(false)
    }
  }, [])

  // Carga inicial
  useEffect(() => { cargar() }, [cargar])

  // Auto-refresh cada 60 segundos
  useEffect(() => {
    const interval = setInterval(() => cargar(true), 60_000)
    return () => clearInterval(interval)
  }, [cargar])

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">Actividad reciente</h2>
          {ultimaActualizacion && (
            <p className="text-xs text-gray-400 mt-0.5">
              Actualizado {tiempoRelativo(ultimaActualizacion.toISOString())}
            </p>
          )}
        </div>
        <button
          onClick={() => cargar(true)}
          disabled={refrescando}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-orange-600 transition-colors disabled:opacity-50"
          title="Refrescar"
        >
          <RefreshCw size={13} className={cn(refrescando && 'animate-spin')} />
          Refrescar
        </button>
      </div>

      {/* Feed */}
      {cargando ? (
        <div className="space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse shrink-0" />
              <div className="flex-1 space-y-1.5 pt-1">
                <div className="h-3 bg-gray-100 animate-pulse rounded w-3/4" />
                <div className="h-3 bg-gray-100 animate-pulse rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : eventos.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">Sin actividad registrada aún.</p>
      ) : (
        <div className="relative">
          {/* Línea vertical del timeline */}
          <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-100" />

          <div className="space-y-4">
            {eventos.map((ev) => {
              const cfg = TIPO_CONFIG[ev.tipo]
              const Icon = cfg.icon

              return (
                <div key={ev.id} className="flex gap-3 relative">
                  {/* Ícono */}
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10',
                    cfg.iconBg
                  )}>
                    <Icon size={14} className={cfg.iconColor} />
                  </div>

                  {/* Contenido */}
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-gray-700">
                          {ev.titulo}
                        </span>
                        {ev.clienteNombre && (
                          <span className="text-xs text-gray-500"> · {ev.clienteNombre}</span>
                        )}
                        {ev.monto != null && ev.monto > 0 && (
                          <span className={cn(
                            'ml-1.5 text-xs font-semibold',
                            ev.tipo === 'pago' ? 'text-green-600' : 'text-yellow-600'
                          )}>
                            {formatPesos(ev.monto)}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 shrink-0 whitespace-nowrap">
                        {tiempoRelativo(ev.fecha)}
                      </span>
                    </div>

                    {ev.detalle && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate" title={ev.detalle}>
                        {ev.detalle}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
