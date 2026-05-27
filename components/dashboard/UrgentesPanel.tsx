'use client'

import { useEffect, useState, useRef } from 'react'
import { Phone, Mail, MessageCircle, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

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

// ─── Panel inline para registrar seguimiento ─────────────────────────────
function ContactarPanel({ prospecto, onSaved, onClose }: {
  prospecto: ProspectoUrgente
  onSaved: () => void
  onClose: () => void
}) {
  const [tipo, setTipo] = useState<'llamada' | 'whatsapp' | 'correo' | 'otro'>('whatsapp')
  const [nota, setNota] = useState('')
  const [saving, setSaving] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  // Cerrar al hacer click fuera
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  async function guardar() {
    setSaving(true)
    const hoy = new Date().toISOString().slice(0, 10)
    const res = await fetch('/api/seguimientos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cliente_id: prospecto.id,
        tipo,
        notas: nota || `${tipo} registrado desde dashboard`,
        fecha: hoy,
      }),
    })
    setSaving(false)
    if (res.ok) {
      toast.success(`Seguimiento registrado para ${prospecto.nombre}`)
      onSaved()
      onClose()
    } else {
      toast.error('Error al registrar el seguimiento')
    }
  }

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full mt-1 z-50 bg-white rounded-xl shadow-xl border border-gray-200 p-3 w-60"
      onClick={e => e.stopPropagation()}
    >
      <p className="text-xs font-semibold text-gray-700 mb-2">
        Contactar a {prospecto.nombre.split(' ')[0]}
      </p>
      <div className="flex gap-1.5 mb-2 flex-wrap">
        {(['llamada', 'whatsapp', 'correo', 'otro'] as const).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setTipo(t)}
            className={`px-2 py-1 rounded text-xs border capitalize transition-colors ${
              tipo === t
                ? 'bg-orange-600 text-white border-orange-600'
                : 'bg-white text-gray-500 border-gray-200 hover:border-orange-300'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <input
        type="text"
        placeholder="Nota breve (opcional)..."
        value={nota}
        onChange={e => setNota(e.target.value)}
        className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 mb-2 focus:outline-none focus:border-orange-400"
        onKeyDown={e => e.key === 'Enter' && guardar()}
        autoFocus
      />
      <div className="flex gap-1.5">
        <button
          onClick={onClose}
          className="flex-1 text-xs py-1.5 rounded border border-gray-200 text-gray-500 hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          onClick={guardar}
          disabled={saving}
          className="flex-1 bg-orange-600 hover:bg-orange-700 text-white text-xs py-1.5 rounded font-medium transition-colors disabled:opacity-50"
        >
          {saving ? 'Guardando...' : '✓ Registrar'}
        </button>
      </div>
    </div>
  )
}

export function UrgentesPanel() {
  const [datos, setDatos] = useState<UrgentesResponse | null>(null)
  const [cargando, setCargando] = useState(true)
  const [contactandoId, setContactandoId] = useState<string | null>(null)

  const cargarDatos = () => {
    fetch('/api/dashboard/urgentes')
      .then(r => r.json())
      .then(d => { setDatos(d); setCargando(false) })
      .catch(() => setCargando(false))
  }

  useEffect(() => { cargarDatos() }, [])

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
                <th className="text-right text-xs text-gray-400 font-medium pb-2 pl-3 hidden sm:table-cell">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {datos.prospectos.map(p => {
                const s = SEMAFORO[p.semaforo]
                const isContactandoOpen = contactandoId === p.id

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

                    {/* Acciones: contactar rápido + registrar seguimiento */}
                    <td className="py-2.5 pl-3 text-right hidden sm:table-cell">
                      <div className="flex items-center justify-end gap-1.5">
                        {p.telefono && (
                          <a
                            href={`https://wa.me/${p.telefono.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-gray-400 hover:text-green-600 transition-colors"
                            title="WhatsApp"
                          >
                            <MessageCircle size={13} />
                          </a>
                        )}
                        {p.telefono && (
                          <a
                            href={`tel:${p.telefono}`}
                            className="text-gray-400 hover:text-blue-600 transition-colors"
                            title="Llamar"
                          >
                            <Phone size={13} />
                          </a>
                        )}
                        {p.correo && (
                          <a
                            href={`mailto:${p.correo}`}
                            className="text-gray-400 hover:text-orange-600 transition-colors"
                            title="Correo"
                          >
                            <Mail size={13} />
                          </a>
                        )}

                        {/* Botón registrar seguimiento (D3) */}
                        <div className="relative">
                          <button
                            onClick={e => {
                              e.stopPropagation()
                              setContactandoId(isContactandoOpen ? null : p.id)
                            }}
                            title="Registrar contacto"
                            className={cn(
                              'p-1 rounded transition-colors',
                              isContactandoOpen
                                ? 'text-orange-600 bg-orange-100'
                                : 'text-gray-400 hover:text-orange-600 hover:bg-orange-50'
                            )}
                          >
                            <CheckCircle2 size={13} />
                          </button>

                          {isContactandoOpen && (
                            <ContactarPanel
                              prospecto={p}
                              onSaved={cargarDatos}
                              onClose={() => setContactandoId(null)}
                            />
                          )}
                        </div>
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
