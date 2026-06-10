'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Cliente, ETAPAS_FUNNEL, EtapaFunnel } from '@/lib/types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Search, Plus, FileSpreadsheet, FileText, LayoutGrid, List, MessageSquare, Phone, Mail, CheckCircle2, X, Download, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { ClienteFormDialog } from '@/components/clientes/ClienteFormDialog'
import { ContactadoPanel } from '@/components/clientes/ContactadoPanel'
import { toast } from 'sonner'
import { exportarClientesExcel, exportarClientesPDF, exportarTodoExcel } from '@/lib/export'

type ClienteEnriquecido = Cliente & { ultimo_seguimiento: string | null }

// ─── Colores por etapa ────────────────────────────────────────────────────
const ETAPA_BADGE: Record<EtapaFunnel, { bg: string; text: string; label: string }> = {
  nuevo:               { bg: 'bg-gray-100',   text: 'text-gray-600',   label: 'Nuevo' },
  contactado:          { bg: 'bg-blue-100',   text: 'text-blue-700',   label: 'Contactado' },
  con_interes:         { bg: 'bg-violet-100', text: 'text-violet-700', label: 'Con interés' },
  cotizacion_enviada:  { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Cotización' },
  negociando:          { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Negociando' },
  inscrito:            { bg: 'bg-green-100',  text: 'text-green-700',  label: 'Inscrito' },
}

// ─── Semáforo por horas sin contacto ─────────────────────────────────────
function calcSemaforo(c: ClienteEnriquecido): 'verde' | 'ambar' | 'rojo' {
  const ref = c.ultimo_seguimiento || c.created_at
  const horas = (Date.now() - new Date(ref).getTime()) / 3_600_000
  if (horas < 48) return 'verde'
  if (horas < 72) return 'ambar'
  return 'rojo'
}

const SEMAFORO_DOT: Record<string, string> = {
  verde: 'bg-green-400',
  ambar: 'bg-yellow-400',
  rojo:  'bg-red-500',
}

const SEMAFORO_TITLE: Record<string, string> = {
  verde: 'Contactado hace menos de 48h',
  ambar: 'Sin contacto 48-72h',
  rojo:  'Sin contacto más de 72h',
}

// ─── Kanban view ──────────────────────────────────────────────────────────
function KanbanView({
  clientes,
  onEtapaChange,
}: {
  clientes: ClienteEnriquecido[]
  onEtapaChange: (id: string, etapa: EtapaFunnel) => void
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [overEtapa, setOverEtapa] = useState<EtapaFunnel | null>(null)

  const porEtapa = ETAPAS_FUNNEL.reduce<Record<EtapaFunnel, ClienteEnriquecido[]>>((acc, e) => {
    acc[e.value] = clientes.filter(c => (c.etapa || 'nuevo') === e.value)
    return acc
  }, {} as Record<EtapaFunnel, ClienteEnriquecido[]>)

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 mt-2">
      {ETAPAS_FUNNEL.map(etapa => {
        const cfg = ETAPA_BADGE[etapa.value]
        const cards = porEtapa[etapa.value]
        const isOver = overEtapa === etapa.value

        return (
          <div
            key={etapa.value}
            className={`flex-shrink-0 w-52 rounded-xl border transition-colors ${
              isOver ? 'border-orange-400 bg-orange-50' : 'border-gray-200 bg-gray-50'
            }`}
            onDragOver={e => { e.preventDefault(); setOverEtapa(etapa.value) }}
            onDragLeave={() => setOverEtapa(null)}
            onDrop={e => {
              e.preventDefault()
              setOverEtapa(null)
              if (draggingId) onEtapaChange(draggingId, etapa.value)
              setDraggingId(null)
            }}
          >
            {/* Column header */}
            <div className="px-3 py-2.5 flex items-center justify-between border-b border-gray-200">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                {etapa.label}
              </span>
              <span className="text-xs text-gray-400 font-medium">{cards.length}</span>
            </div>

            {/* Cards */}
            <div className="p-2 space-y-2 min-h-[80px]">
              {cards.map(c => {
                const sem = calcSemaforo(c)
                return (
                  <div
                    key={c.id}
                    draggable
                    onDragStart={() => setDraggingId(c.id)}
                    onDragEnd={() => setDraggingId(null)}
                    className={`bg-white rounded-lg border border-gray-100 p-2.5 shadow-sm cursor-grab active:cursor-grabbing hover:border-orange-200 transition-all ${
                      draggingId === c.id ? 'opacity-50 scale-95' : ''
                    }`}
                  >
                    <div className="flex items-start gap-1.5">
                      <div className={`w-2 h-2 rounded-full mt-1 shrink-0 ${SEMAFORO_DOT[sem]}`} title={SEMAFORO_TITLE[sem]} />
                      <div className="min-w-0">
                        <Link href={`/clientes/${c.id}`} className="text-xs font-semibold text-gray-800 hover:text-orange-600 leading-tight block truncate">
                          {c.nombre}
                        </Link>
                        {c.procedencia && (
                          <p className="text-xs text-gray-400 truncate">{c.procedencia}</p>
                        )}
                        {c.telefono && (
                          <a
                            href={`https://wa.me/${c.telefono.replace(/\D/g, '')}`}
                            target="_blank" rel="noopener noreferrer"
                            className="text-xs text-green-600 hover:underline mt-0.5 block"
                            onClick={e => e.stopPropagation()}
                          >
                            WhatsApp
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────
export default function ClientesPage() {
  const [clientes, setClientes] = useState<ClienteEnriquecido[]>([])
  const [total, setTotal] = useState(0)
  const [q, setQ] = useState('')
  const [etapaFilter, setEtapaFilter] = useState<EtapaFunnel | ''>('')
  const [page, setPage] = useState(1)

  // Pre-populate etapaFilter from URL (?etapa=...) when coming from the funnel chart
  useEffect(() => {
    const etapa = new URLSearchParams(window.location.search).get('etapa') as EtapaFunnel
    if (etapa) setEtapaFilter(etapa)
  }, [])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [vista, setVista] = useState<'lista' | 'kanban'>('lista')
  const [contactadoId, setContactadoId] = useState<string | null>(null)
  const [contactadoPos, setContactadoPos] = useState<{ top: number; right: number } | null>(null)
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const exportMenuRef = useRef<HTMLDivElement>(null)
  const limit = 50

  const fetchClientes = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ q, page: String(page), limit: String(limit) })
    if (etapaFilter) params.set('etapa', etapaFilter)
    const res = await fetch(`/api/clientes?${params}`)
    const json = await res.json()
    setClientes(json.data || [])
    setTotal(json.count || 0)
    setLoading(false)
  }, [q, page, etapaFilter])

  useEffect(() => {
    const t = setTimeout(fetchClientes, 300)
    return () => clearTimeout(t)
  }, [fetchClientes])

  // Close contactado panel on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (!target.closest('[data-contactado-panel]')) {
        setContactadoId(null)
        setContactadoPos(null)
      }
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  // Close export menu on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function exportarTodos(tipo: 'excel' | 'pdf') {
    toast.info('Preparando exportación...')
    if (tipo === 'excel') {
      const res = await fetch('/api/exportar-clientes')
      if (!res.ok) { toast.error('Error al exportar'); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `clientes_renova_${new Date().toISOString().slice(0, 10)}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Excel exportado')
    } else {
      const res = await fetch(`/api/clientes?q=${q}&limit=9999&page=1`)
      const json = await res.json()
      await exportarClientesPDF(json.data || [])
    }
  }

  async function exportarCompleto() {
    toast.info('Generando base completa...')
    const res = await fetch('/api/exportar')
    if (!res.ok) { toast.error('Error al exportar'); return }
    const data = await res.json()
    exportarTodoExcel(data)
    toast.success('Base completa exportada')
  }

  async function handleCreate(data: Partial<Cliente>) {
    const res = await fetch('/api/clientes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      toast.success('Cliente creado correctamente')
      setDialogOpen(false)
      fetchClientes()
    } else {
      const err = await res.json()
      toast.error(err.error || 'Error al crear cliente')
    }
  }

  async function handleEtapaChange(id: string, etapa: EtapaFunnel) {
    const res = await fetch(`/api/clientes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ etapa }),
    })
    if (res.ok) {
      setClientes(prev => prev.map(c => c.id === id ? { ...c, etapa } : c))
      toast.success('Etapa actualizada')
    } else {
      toast.error('Error al actualizar etapa')
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Clientes</h2>
          <p className="text-sm text-gray-500">{total} clientes en total</p>
        </div>
        <div className="flex gap-2">
          {/* C3: Dropdown exportación consolidado */}
          <div ref={exportMenuRef} className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExportMenuOpen(o => !o)}
              className="flex items-center gap-1"
            >
              <Download className="h-4 w-4" />
              Exportar
              <ChevronDown className="h-3 w-3 ml-0.5" />
            </Button>
            {exportMenuOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white rounded-lg border border-gray-200 shadow-lg z-20 w-48 py-1">
                <button
                  onClick={() => { exportarTodos('excel'); setExportMenuOpen(false) }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <FileSpreadsheet className="h-4 w-4 text-green-600" /> Excel (filtrado)
                </button>
                <button
                  onClick={() => { exportarTodos('pdf'); setExportMenuOpen(false) }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <FileText className="h-4 w-4 text-red-500" /> PDF (filtrado)
                </button>
                <div className="border-t border-gray-100 my-1" />
                <button
                  onClick={() => { exportarCompleto(); setExportMenuOpen(false) }}
                  className="w-full text-left px-4 py-2 text-sm text-orange-700 hover:bg-orange-50 flex items-center gap-2"
                >
                  <FileSpreadsheet className="h-4 w-4 text-orange-600" /> Base completa
                </button>
              </div>
            )}
          </div>
          <Button onClick={() => setDialogOpen(true)} className="bg-orange-600 hover:bg-orange-700">
            <Plus className="h-4 w-4 mr-2" /> Nuevo cliente
          </Button>
        </div>
      </div>

      {/* Buscador + filtro etapa + toggle de vista */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            className="pl-9"
            placeholder="Buscar por nombre, correo o teléfono..."
            value={q}
            onChange={e => { setQ(e.target.value); setPage(1) }}
          />
        </div>

        {/* C5: Filtro etapa */}
        <div className="relative">
          <select
            value={etapaFilter}
            onChange={e => { setEtapaFilter(e.target.value as EtapaFunnel | ''); setPage(1) }}
            className="h-10 pl-3 pr-8 rounded-lg border border-gray-200 text-sm text-gray-600 bg-white focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400 appearance-none cursor-pointer"
          >
            <option value="">Todas las etapas</option>
            {ETAPAS_FUNNEL.map(e => (
              <option key={e.value} value={e.value}>{e.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
        </div>

        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          <button
            onClick={() => setVista('lista')}
            className={`px-3 py-2 transition-colors ${vista === 'lista' ? 'bg-orange-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
            title="Vista lista"
          >
            <List size={16} />
          </button>
          <button
            onClick={() => setVista('kanban')}
            className={`px-3 py-2 transition-colors border-l border-gray-200 ${vista === 'kanban' ? 'bg-orange-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
            title="Vista kanban"
          >
            <LayoutGrid size={16} />
          </button>
        </div>
      </div>

      {/* ─── VISTA KANBAN ─── */}
      {vista === 'kanban' && !loading && (
        <KanbanView clientes={clientes} onEtapaChange={handleEtapaChange} />
      )}

      {/* ─── VISTA LISTA ─── */}
      {vista === 'lista' && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Cargando...</div>
          ) : clientes.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              {q ? 'No se encontraron clientes' : 'No hay clientes registrados'}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-6"></th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Nombre</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Contacto</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Etapa</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Canal</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {clientes.map(c => {
                  const sem = calcSemaforo(c)
                  const etapaCfg = c.etapa ? ETAPA_BADGE[c.etapa] : null
                  const isContactadoOpen = contactadoId === c.id

                  return (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors group">
                      {/* Semáforo dot */}
                      <td className="px-4 py-3">
                        <div
                          className={`w-2.5 h-2.5 rounded-full ${SEMAFORO_DOT[sem]}`}
                          title={SEMAFORO_TITLE[sem]}
                        />
                      </td>

                      {/* C1: Nombre clickeable → perfil */}
                      <td className="px-4 py-3 font-medium text-gray-900">
                        <Link
                          href={`/clientes/${c.id}`}
                          className="hover:text-orange-600 transition-colors"
                        >
                          {c.nombre}
                        </Link>
                      </td>

                      {/* Contacto — correo / teléfono */}
                      <td className="px-4 py-3 text-gray-500">
                        <div className="flex flex-col gap-0.5">
                          {c.correo && <span className="truncate max-w-[160px]">{c.correo}</span>}
                          {c.telefono && <span>{c.telefono}</span>}
                          {!c.correo && !c.telefono && <span>—</span>}
                        </div>
                      </td>

                      {/* Etapa badge */}
                      <td className="px-4 py-3">
                        {etapaCfg ? (
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${etapaCfg.bg} ${etapaCfg.text}`}>
                            {etapaCfg.label}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>

                      {/* Canal */}
                      <td className="px-4 py-3">
                        {c.procedencia ? (
                          <Badge variant="secondary" className="text-xs">{c.procedencia}</Badge>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          {/* Quick actions — visibles al hover */}
                          {c.telefono && (
                            <a
                              href={`https://wa.me/${c.telefono.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="WhatsApp"
                              className="p-1.5 rounded-lg text-gray-300 hover:text-green-600 hover:bg-green-50 transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <MessageSquare size={14} />
                            </a>
                          )}
                          {c.telefono && (
                            <a
                              href={`tel:${c.telefono}`}
                              title="Llamar"
                              className="p-1.5 rounded-lg text-gray-300 hover:text-blue-600 hover:bg-blue-50 transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <Phone size={14} />
                            </a>
                          )}
                          {c.correo && (
                            <a
                              href={`https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(c.correo)}`}
                              target="_blank" rel="noopener noreferrer"
                              title={`Enviar correo a ${c.correo}`}
                              className="p-1.5 rounded-lg text-gray-300 hover:text-orange-600 hover:bg-orange-50 transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <Mail size={14} />
                            </a>
                          )}

                          {/* Botón Contactado */}
                          <div className="relative" data-contactado-panel>
                            <button
                              onClick={e => {
                                e.stopPropagation()
                                if (isContactadoOpen) {
                                  setContactadoId(null)
                                  setContactadoPos(null)
                                } else {
                                  const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect()
                                  setContactadoPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
                                  setContactadoId(c.id)
                                }
                              }}
                              title="Registrar contacto"
                              className={`p-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100 ${
                                isContactadoOpen
                                  ? 'text-orange-600 bg-orange-50'
                                  : 'text-gray-300 hover:text-orange-600 hover:bg-orange-50'
                              }`}
                            >
                              <CheckCircle2 size={14} />
                            </button>
                            {isContactadoOpen && contactadoPos && (
                              <ContactadoPanel
                                clienteId={c.id}
                                pos={contactadoPos}
                                onSaved={() => {
                                  setContactadoId(null)
                                  setContactadoPos(null)
                                  fetchClientes()
                                }}
                              />
                            )}
                          </div>

                          {/* Ver perfil */}
                          <Link href={`/clientes/${c.id}`}>
                            <Button size="sm" variant="outline" className="text-orange-600 border-orange-200 hover:bg-orange-50 opacity-0 group-hover:opacity-100 ml-1">
                              Ver
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* C4: Paginación con números de página */}
      {vista === 'lista' && total > limit && (() => {
        const totalPages = Math.ceil(total / limit)
        // Build page window: always show first, last, and up to 3 around current
        const pages: (number | '…')[] = []
        if (totalPages <= 7) {
          for (let i = 1; i <= totalPages; i++) pages.push(i)
        } else {
          pages.push(1)
          if (page > 3) pages.push('…')
          for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i)
          if (page < totalPages - 2) pages.push('…')
          pages.push(totalPages)
        }

        return (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-500">
              Mostrando {Math.min((page - 1) * limit + 1, total)}–{Math.min(page * limit, total)} de {total}
            </p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                ‹
              </Button>
              {pages.map((p, i) =>
                p === '…' ? (
                  <span key={`ellipsis-${i}`} className="px-2 text-gray-400 text-sm select-none">…</span>
                ) : (
                  <Button
                    key={p}
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p as number)}
                    className={page === p ? 'bg-orange-600 text-white border-orange-600 hover:bg-orange-700' : ''}
                  >
                    {p}
                  </Button>
                )
              )}
              <Button variant="outline" size="sm" disabled={page * limit >= total} onClick={() => setPage(p => p + 1)}>
                ›
              </Button>
            </div>
          </div>
        )
      })()}

      <ClienteFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleCreate}
        title="Nuevo cliente"
      />
    </div>
  )
}
