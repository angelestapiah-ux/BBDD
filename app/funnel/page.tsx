'use client'

import { useEffect, useState, useCallback } from 'react'
import { ETAPAS_FUNNEL, EtapaFunnel } from '@/lib/types'
import Link from 'next/link'
import { toast } from 'sonner'

type OpFunnel = {
  id: string
  cliente_id: string
  actividad_nombre: string
  etapa: EtapaFunnel
  clientes: { nombre: string; telefono: string | null; procedencia: string | null } | null
}

const ETAPA_BADGE: Record<EtapaFunnel, { bg: string; text: string }> = {
  nuevo:               { bg: 'bg-gray-100',   text: 'text-gray-600' },
  contactado:          { bg: 'bg-blue-100',   text: 'text-blue-700' },
  con_interes:         { bg: 'bg-violet-100', text: 'text-violet-700' },
  cotizacion_enviada:  { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  negociando:          { bg: 'bg-orange-100', text: 'text-orange-700' },
  inscrito:            { bg: 'bg-green-100',  text: 'text-green-700' },
}

export default function FunnelPage() {
  const [ops, setOps] = useState<OpFunnel[]>([])
  const [loading, setLoading] = useState(true)
  const [actividadFiltro, setActividadFiltro] = useState('')
  const [actividades, setActividades] = useState<string[]>([])
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [overEtapa, setOverEtapa] = useState<EtapaFunnel | null>(null)

  const fetchOps = useCallback(async () => {
    setLoading(true)
    const url = actividadFiltro
      ? `/api/oportunidades?actividad=${encodeURIComponent(actividadFiltro)}`
      : '/api/oportunidades'
    const res = await fetch(url)
    const data = await res.json()
    setOps(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [actividadFiltro])

  useEffect(() => { fetchOps() }, [fetchOps])

  useEffect(() => {
    fetch('/api/actividades')
      .then(r => r.ok ? r.json() : [])
      .then(d => setActividades(Array.isArray(d) ? d.map((a: { nombre: string }) => a.nombre) : []))
      .catch(() => {})
  }, [])

  async function mover(opId: string, etapa: EtapaFunnel) {
    setOps(prev => prev.map(o => o.id === opId ? { ...o, etapa } : o))
    const res = await fetch('/api/oportunidades', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: opId, etapa }),
    })
    if (res.ok) toast.success('Etapa actualizada')
    else { toast.error('Error al actualizar'); fetchOps() }
  }

  const porEtapa = ETAPAS_FUNNEL.reduce<Record<EtapaFunnel, OpFunnel[]>>((acc, e) => {
    acc[e.value] = ops.filter(o => o.etapa === e.value)
    return acc
  }, {} as Record<EtapaFunnel, OpFunnel[]>)

  return (
    <div className="p-6">
      <div className="flex items-end justify-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Funnel</h2>
          <p className="text-sm text-gray-500">
            {ops.length} oportunidad{ops.length === 1 ? '' : 'es'}{actividadFiltro ? ` · ${actividadFiltro}` : ' · todas las actividades'}
          </p>
        </div>
        <select
          value={actividadFiltro}
          onChange={e => setActividadFiltro(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
        >
          <option value="">Todas las actividades</option>
          {actividades.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400 animate-pulse">Cargando funnel...</p>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {ETAPAS_FUNNEL.map(etapa => {
            const cfg = ETAPA_BADGE[etapa.value]
            const col = porEtapa[etapa.value]
            const isOver = overEtapa === etapa.value
            return (
              <div
                key={etapa.value}
                className={`flex-shrink-0 w-60 rounded-xl border transition-colors ${
                  isOver ? 'border-orange-400 bg-orange-50' : 'border-gray-200 bg-gray-50'
                }`}
                onDragOver={e => { e.preventDefault(); setOverEtapa(etapa.value) }}
                onDragLeave={() => setOverEtapa(null)}
                onDrop={e => {
                  e.preventDefault()
                  setOverEtapa(null)
                  if (draggingId) mover(draggingId, etapa.value)
                  setDraggingId(null)
                }}
              >
                <div className="px-3 py-2.5 flex items-center justify-between border-b border-gray-200">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                    {etapa.label}
                  </span>
                  <span className="text-xs text-gray-400 font-medium">{col.length}</span>
                </div>
                <div className="p-2 space-y-2 min-h-[120px]">
                  {col.map(o => {
                    const tel = o.clientes?.telefono
                    return (
                      <div
                        key={o.id}
                        draggable
                        onDragStart={() => setDraggingId(o.id)}
                        onDragEnd={() => setDraggingId(null)}
                        className={`bg-white rounded-lg border border-gray-100 p-2.5 shadow-sm cursor-grab active:cursor-grabbing hover:border-orange-200 transition-all ${
                          draggingId === o.id ? 'opacity-50 scale-95' : ''
                        }`}
                      >
                        <Link href={`/clientes/${o.cliente_id}`} className="text-xs font-semibold text-gray-800 hover:text-orange-600 leading-tight block truncate">
                          {o.clientes?.nombre || '—'}
                        </Link>
                        <p className="text-xs text-orange-600 truncate" title={o.actividad_nombre}>{o.actividad_nombre}</p>
                        {tel && (
                          <a
                            href={`https://wa.me/${tel.replace(/\D/g, '')}`}
                            target="_blank" rel="noopener noreferrer"
                            className="text-xs text-green-600 hover:underline mt-0.5 block"
                            onClick={e => e.stopPropagation()}
                          >
                            WhatsApp
                          </a>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
