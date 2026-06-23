'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { Bell, Plus, Check, Clock, Pencil, Trash2, MessageSquare, User, AlertCircle } from 'lucide-react'
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
  const difDias = Math.round((dia.getTime() - hoy.getTime()) / 86_400_000)
  const hora = d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
  if (difDias === 0) return `Hoy ${hora}`
  if (difDias === -1) return `Ayer ${hora}`
  if (difDias === 1) return `Mañana ${hora}`
  return `${d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })} ${hora}`
}

export function RecordatorioBell({ defaultUsuario }: { defaultUsuario?: string }) {
  const [items, setItems] = useState<Recordatorio[]>([])
  const [abierto, setAbierto] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editando, setEditando] = useState<Recordatorio | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)

  const cargar = useCallback(async () => {
    try {
      const res = await fetch('/api/recordatorios')
      const json = res.ok ? await res.json() : { data: [] }
      setItems(json.data || [])
    } catch { /* silencioso */ }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  // Cerrar el panel al hacer click afuera.
  useEffect(() => {
    function handler(e: MouseEvent) {
      const t = e.target as HTMLElement
      if (panelRef.current && !panelRef.current.contains(t) && !t.closest('[data-bell-btn]')) {
        setAbierto(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const limite = finDeHoy()
  const ahora = Date.now()
  const pendientes = items.filter(r => r.estado === 'pendiente')
  const vencidos = pendientes.filter(r => new Date(r.fecha_hora).getTime() < ahora)
  const deHoy = pendientes.filter(r => {
    const t = new Date(r.fecha_hora).getTime(); return t >= ahora && t <= limite
  })
  const proximos = pendientes.filter(r => new Date(r.fecha_hora).getTime() > limite)
  const badge = vencidos.length + deHoy.length

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
  function editar(r: Recordatorio) {
    setEditando(r); setFormOpen(true); setAbierto(false)
  }
  function nuevo() {
    setEditando(null); setFormOpen(true); setAbierto(false)
  }

  function Fila({ r, vencido }: { r: Recordatorio; vencido?: boolean }) {
    const tel = r.clientes?.telefono?.replace(/\D/g, '')
    return (
      <div className={cn('px-3 py-2.5 border-b border-gray-100 last:border-0', vencido && 'bg-red-50/50')}>
        <div className="flex items-start gap-2">
          {r.prioridad === 'alta' && <AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0" />}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 break-words">{r.titulo}</p>
            <p className={cn('text-xs mt-0.5', vencido ? 'text-red-600 font-medium' : 'text-gray-500')}>
              {fmtCuando(r.fecha_hora)}
              {r.categoria && CAT_LABEL[r.categoria] ? ` · ${CAT_LABEL[r.categoria]}` : ''}
              {r.recurrencia && r.recurrencia !== 'ninguna' ? ' · 🔁' : ''}
            </p>
            {r.clientes?.nombre && (
              <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                <User size={11} /> {r.clientes.nombre}
              </p>
            )}
            {r.notas && <p className="text-xs text-gray-400 mt-0.5 break-words">{r.notas}</p>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1 mt-1.5">
          <button onClick={() => marcarHecho(r)} className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-green-50 text-green-700 hover:bg-green-100">
            <Check size={12} /> Hecho
          </button>
          <button onClick={() => posponer(r, 1)} className="flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-600 hover:bg-gray-100" title="Posponer a mañana">
            <Clock size={12} /> Mañana
          </button>
          <button onClick={() => posponer(r, 7)} className="px-2 py-1 rounded text-xs text-gray-600 hover:bg-gray-100" title="Posponer una semana">
            +1 sem
          </button>
          {r.cliente_id && (
            <Link href={`/clientes/${r.cliente_id}`} onClick={() => setAbierto(false)} className="flex items-center gap-1 px-2 py-1 rounded text-xs text-orange-600 hover:bg-orange-50" title="Ir a la ficha">
              <User size={12} /> Ficha
            </Link>
          )}
          {tel && (
            <a href={`https://wa.me/${tel}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-2 py-1 rounded text-xs text-green-700 hover:bg-green-50" title="WhatsApp">
              <MessageSquare size={12} /> WhatsApp
            </a>
          )}
          <button onClick={() => editar(r)} className="px-1.5 py-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100" title="Editar">
            <Pencil size={12} />
          </button>
          <button onClick={() => eliminar(r)} className="px-1.5 py-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50" title="Eliminar">
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Campana fija arriba a la derecha, visible en todas las pantallas */}
      <button
        data-bell-btn
        onClick={() => setAbierto(o => !o)}
        className="fixed top-4 right-4 z-40 h-10 w-10 rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center text-gray-600 hover:text-orange-600 hover:border-orange-300 transition-colors"
        title="Recordatorios"
      >
        <Bell size={18} />
        {badge > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {badge}
          </span>
        )}
      </button>

      {abierto && (
        <div
          ref={panelRef}
          className="fixed top-16 right-4 z-40 w-80 max-h-[75vh] overflow-y-auto rounded-xl bg-white border border-gray-200 shadow-xl"
        >
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100 sticky top-0 bg-white">
            <h3 className="text-sm font-semibold text-gray-800">Recordatorios</h3>
            <button onClick={nuevo} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-orange-600 text-white hover:bg-orange-700">
              <Plus size={13} /> Nuevo
            </button>
          </div>

          {badge === 0 && proximos.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-gray-400">Sin recordatorios pendientes 🎉</p>
          )}

          {vencidos.length > 0 && (
            <div>
              <p className="px-3 pt-2 pb-1 text-xs font-semibold text-red-600">Atrasados ({vencidos.length})</p>
              {vencidos.map(r => <Fila key={r.id} r={r} vencido />)}
            </div>
          )}
          {deHoy.length > 0 && (
            <div>
              <p className="px-3 pt-2 pb-1 text-xs font-semibold text-gray-700">Hoy ({deHoy.length})</p>
              {deHoy.map(r => <Fila key={r.id} r={r} />)}
            </div>
          )}
          {proximos.length > 0 && (
            <div>
              <p className="px-3 pt-2 pb-1 text-xs font-semibold text-gray-500">Próximos</p>
              {proximos.slice(0, 10).map(r => <Fila key={r.id} r={r} />)}
            </div>
          )}
        </div>
      )}

      <RecordatorioForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSaved={cargar}
        recordatorio={editando}
        defaultUsuario={defaultUsuario}
      />
    </>
  )
}
