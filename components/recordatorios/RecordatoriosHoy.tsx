'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { BellRing, Plus, Check, Clock, Pencil, Trash2, MessageSquare, User, AlertCircle } from 'lucide-react'
import { Recordatorio } from '@/lib/types'
import { RecordatorioForm } from './RecordatorioForm'
import { cn } from '@/lib/utils'

const CAT_LABEL: Record<string, string> = {
  pago: 'Pago', llamada: 'Llamada', reunion: 'Reunión', personal: 'Personal', otro: 'Otro',
}

function finDeHoy(): number {
  const d = new Date(); d.setHours(23, 59, 59, 999); return d.getTime()
}
function fmtCuando(iso: string): string {
  const d = new Date(iso)
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  const dia = new Date(d); dia.setHours(0, 0, 0, 0)
  const dif = Math.round((dia.getTime() - hoy.getTime()) / 86_400_000)
  const hora = d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
  if (dif === 0) return `Hoy ${hora}`
  if (dif === -1) return `Ayer ${hora}`
  if (dif < -1) return `${d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })} ${hora}`
  return `${d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })} ${hora}`
}

// Semáforo por cercanía: rojo = atrasado, ámbar = hoy / próximas 48h, verde = más adelante.
function sem(iso: string): { bar: string; text: string; soft: string } {
  const t = new Date(iso).getTime(); const now = Date.now()
  if (t < now) return { bar: 'border-red-400', text: 'text-red-600', soft: 'bg-red-50/50' }
  if (t <= now + 48 * 3600 * 1000) return { bar: 'border-amber-400', text: 'text-amber-600', soft: 'bg-amber-50/50' }
  return { bar: 'border-green-400', text: 'text-gray-500', soft: '' }
}

export function RecordatoriosHoy() {
  const [items, setItems] = useState<Recordatorio[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editando, setEditando] = useState<Recordatorio | null>(null)

  const cargar = useCallback(async () => {
    try {
      const res = await fetch('/api/recordatorios')
      const json = res.ok ? await res.json() : { data: [] }
      setItems(json.data || [])
    } catch { /* silencioso */ }
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const limite = finDeHoy()
  const pendientes = items.filter(r => r.estado === 'pendiente')
  const delDia = pendientes
    .filter(r => new Date(r.fecha_hora).getTime() <= limite)
    .sort((a, b) => new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime())

  async function marcarHecho(r: Recordatorio) {
    await fetch(`/api/recordatorios/${r.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: 'hecho' }),
    })
    cargar()
  }
  async function posponer(r: Recordatorio, dias: number) {
    const orig = new Date(r.fecha_hora)
    const base = orig.getTime() < Date.now() ? new Date() : new Date(orig)
    base.setDate(base.getDate() + dias)
    base.setHours(orig.getHours(), orig.getMinutes(), 0, 0)
    await fetch(`/api/recordatorios/${r.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fecha_hora: base.toISOString() }),
    })
    cargar()
  }
  async function eliminar(r: Recordatorio) {
    if (!confirm(`¿Eliminar el recordatorio "${r.titulo}"?`)) return
    await fetch(`/api/recordatorios/${r.id}`, { method: 'DELETE' })
    cargar()
  }

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <BellRing size={15} className="text-orange-500" /> Recordatorios ({delDia.length})
        </h3>
        <button
          onClick={() => { setEditando(null); setFormOpen(true) }}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100"
        >
          <Plus size={13} /> Nuevo recordatorio
        </button>
      </div>

      {!loading && delDia.length === 0 && (
        <p className="text-sm text-gray-400 rounded-lg border border-dashed border-gray-200 px-4 py-3">
          Sin recordatorios para hoy.
        </p>
      )}

      {delDia.length > 0 && (
        <div className="rounded-lg border border-gray-200 overflow-hidden">
          {delDia.map(r => {
            const s = sem(r.fecha_hora)
            const tel = r.clientes?.telefono?.replace(/\D/g, '')
            return (
              <div key={r.id} className={cn('px-4 py-3 border-b border-gray-100 last:border-0 border-l-4', s.bar, s.soft)}>
                <div className="flex items-start gap-2">
                  {r.prioridad === 'alta' && <AlertCircle size={15} className="text-red-500 mt-0.5 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 break-words">{r.titulo}</p>
                    <p className={cn('text-xs mt-0.5 font-medium', s.text)}>
                      {fmtCuando(r.fecha_hora)}
                      {r.categoria && CAT_LABEL[r.categoria] ? ` · ${CAT_LABEL[r.categoria]}` : ''}
                      {r.recurrencia && r.recurrencia !== 'ninguna' ? ' · 🔁' : ''}
                      {r.clientes?.nombre ? ` · ${r.clientes.nombre}` : ''}
                    </p>
                    {r.notas && <p className="text-xs text-gray-400 mt-0.5 break-words">{r.notas}</p>}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <button onClick={() => marcarHecho(r)} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-green-50 text-green-700 border border-green-200 hover:bg-green-100">
                    <Check size={13} /> Hecho
                  </button>
                  <button onClick={() => posponer(r, 1)} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-gray-600 hover:bg-gray-100" title="Posponer a mañana">
                    <Clock size={12} /> Mañana
                  </button>
                  <button onClick={() => posponer(r, 7)} className="px-2 py-1 rounded-lg text-xs text-gray-600 hover:bg-gray-100" title="Posponer una semana">
                    +1 sem
                  </button>
                  {r.cliente_id && (
                    <Link href={`/clientes/${r.cliente_id}`} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-orange-600 hover:bg-orange-50" title="Ir a la ficha">
                      <User size={12} /> Ficha
                    </Link>
                  )}
                  {tel && (
                    <a href={`https://wa.me/${tel}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-green-700 hover:bg-green-50" title="WhatsApp">
                      <MessageSquare size={12} /> WhatsApp
                    </a>
                  )}
                  <button onClick={() => { setEditando(r); setFormOpen(true) }} className="px-1.5 py-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100" title="Editar">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => eliminar(r)} className="px-1.5 py-1 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50" title="Eliminar">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <RecordatorioForm open={formOpen} onOpenChange={setFormOpen} onSaved={cargar} recordatorio={editando} />
    </section>
  )
}
