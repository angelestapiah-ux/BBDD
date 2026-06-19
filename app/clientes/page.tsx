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
import { usePerfil } from '@/components/shared/usePerfil'
import { toast } from 'sonner'
import { exportarClientesExcel, exportarClientesPDF, exportarTodoExcel } from '@/lib/export'

type ClienteEnriquecido = Cliente & { ultimo_seguimiento: string | null; oportunidades?: { id: string; actividad_nombre: string; etapa: EtapaFunnel }[] }

// ─── Colores por etapa ────────────────────────────────────────────────────
const ETAPA_BADGE: Record<EtapaFunnel, { bg: string; text: string; label: string }> = {
  nuevo:               { bg: 'bg-gray-100',   text: 'text-gray-600',   label: 'Nuevo' },
  contactado:          { bg: 'bg-blue-100',   text: 'text-blue-700',   label: 'Contactado' },
  con_interes:         { bg: 'bg-violet-100', text: 'text-violet-700', label: 'Con interés' },
  cotizacion_enviada:  { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Cotización' },
  negociando:          { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Negociando' },
  inscrito:            { bg: 'bg-green-100',  text: 'text-green-700',  label: 'Inscrito' },
  en_pausa:            { bg: 'bg-rose-100',   text: 'text-rose-700',   label: 'En pausa' },
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

// ─── Celda editable inline (click → input → Enter/blur guarda) ───────────
function CeldaEditable({ valor, placeholder, onSave }: {
  valor: string | null
  placeholder: string
  onSave: (v: string) => Promise<void>
}) {
  const [editando, setEditando] = useState(false)
  const [v, setV] = useState(valor || '')

  useEffect(() => { setV(valor || '') }, [valor])

  async function guardar() {
    setEditando(false)
    if ((valor || '') !== v.trim()) await onSave(v.trim())
  }

  if (editando) {
    return (
      <input
        autoFocus
        value={v}
        onChange={e => setV(e.target.value)}
        onBlur={guardar}
        onKeyDown={e => {
          if (e.key === 'Enter') guardar()
          if (e.key === 'Escape') { setV(valor || ''); setEditando(false) }
        }}
        className="w-full max-w-[170px] text-sm border border-orange-300 rounded px-1.5 py-0.5 focus:outline-none bg-white"
      />
    )
  }
  return (
    <span
      onClick={() => setEditando(true)}
      title="Click para editar"
      className={`cursor-text rounded px-1 -mx-1 hover:bg-orange-50 transition-colors truncate max-w-[170px] inline-block align-middle ${valor ? '' : 'text-gray-300'}`}
    >
      {valor || placeholder}
    </span>
  )
}

// ─── Kanban view (por oportunidad / actividad) ────────────────────────────
function KanbanView({
  clientes,
  onOportunidadEtapa,
}: {
  clientes: ClienteEnriquecido[]
  onOportunidadEtapa: (opId: string, etapa: EtapaFunnel) => void
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [overEtapa, setOverEtapa] = useState<EtapaFunnel | null>(null)

  type Card = { opId: string; clienteId: string; nombre: string; actividad: string; etapa: EtapaFunnel; telefono: string | null }
  const cards: Card[] = []
  for (const c of clientes) {
    for (const o of c.oportunidades ?? []) {
      cards.push({ opId: o.id, clienteId: c.id, nombre: c.nombre, actividad: o.actividad_nombre, etapa: o.etapa, telefono: c.telefono })
    }
  }
  const porEtapa = ETAPAS_FUNNEL.reduce<Record<EtapaFunnel, Card[]>>((acc, e) => {
    acc[e.value] = cards.filter(k => k.etapa === e.value)
    return acc
  }, {} as Record<EtapaFunnel, Card[]>)

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 mt-2">
      {ETAPAS_FUNNEL.map(etapa => {
        const cfg = ETAPA_BADGE[etapa.value]
        const columna = porEtapa[etapa.value]
        const isOver = overEtapa === etapa.value
        return (
          <div
            key={etapa.value}
            className={`flex-shrink-0 w-56 rounded-xl border transition-colors ${
              isOver ? 'border-orange-400 bg-orange-50' : 'border-gray-200 bg-gray-50'
            }`}
            onDragOver={e => { e.preventDefault(); setOverEtapa(etapa.value) }}
            onDragLeave={() => setOverEtapa(null)}
            onDrop={e => {
              e.preventDefault()
              setOverEtapa(null)
              if (draggingId) onOportunidadEtapa(draggingId, etapa.value)
              setDraggingId(null)
            }}
          >
            <div className="px-3 py-2.5 flex items-center justify-between border-b border-gray-200">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                {etapa.label}
              </span>
              <span className="text-xs text-gray-400 font-medium">{columna.length}</span>
            </div>
            <div className="p-2 space-y-2 min-h-[80px]">
              {columna.map(k => (
                <div
                  key={k.opId}
                  draggable
                  onDragStart={() => setDraggingId(k.opId)}
                  onDragEnd={() => setDraggingId(null)}
                  className={`bg-white rounded-lg border border-gray-100 p-2.5 shadow-sm cursor-grab active:cursor-grabbing hover:border-orange-200 transition-all ${
                    draggingId === k.opId ? 'opacity-50 scale-95' : ''
                  }`}
                >
                  <Link href={`/clientes/${k.clienteId}`} className="text-xs font-semibold text-gray-800 hover:text-orange-600 leading-tight block truncate">
                    {k.nombre}
                  </Link>
                  <p className="text-xs text-orange-600 truncate" title={k.actividad}>{k.actividad}</p>
                  {k.telefono && (
                    <a
                      href={`https://wa.me/${k.telefono.replace(/\D/g, '')}`}
                      target="_blank" rel="noopener noreferrer"
                      className="text-xs text-green-600 hover:underline mt-0.5 block"
                      onClick={e => e.stopPropagation()}
                    >
                      WhatsApp
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────
export default function ClientesPage() {
  const perfil = usePerfil()
  const puedeMasivas = perfil.permisos.has('masivas') || perfil.permisos.has('eliminar')
  const [clientes, setClientes] = useState<ClienteEnriquecido[]>([])
  const [total, setTotal] = useState(0)
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)

  // ?nuevo=1 abre directo el dialog de nuevo cliente (desde Ctrl+K)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('nuevo')) setDialogOpen(true)
  }, [])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [vista, setVista] = useState<'lista' | 'kanban'>('lista')
  const [contactadoId, setContactadoId] = useState<string | null>(null)
  const [contactadoPos, setContactadoPos] = useState<{ top: number; right: number } | null>(null)
  // Acciones masivas
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set())
  const [tiposDisponibles, setTiposDisponibles] = useState<string[]>([])
  const [bulkEliminarOpen, setBulkEliminarOpen] = useState(false)
  const [bulkSaving, setBulkSaving] = useState(false)
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const exportMenuRef = useRef<HTMLDivElement>(null)
  const limit = 50

  const fetchClientes = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ q, page: String(page), limit: String(limit) })
    const res = await fetch(`/api/clientes?${params}`)
    const json = await res.json()
    setClientes(json.data || [])
    setTotal(json.count || 0)
    setLoading(false)
  }, [q, page])

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

  // ─── Acciones masivas ────────────────────────────────────────────────
  function toggleSeleccion(id: string) {
    setSeleccion(prev => {
      const s = new Set(prev)
      if (s.has(id)) s.delete(id); else s.add(id)
      return s
    })
  }

  function toggleSeleccionTodos() {
    setSeleccion(prev =>
      prev.size === clientes.length ? new Set() : new Set(clientes.map(c => c.id))
    )
  }

  // Limpiar selección al cambiar de página/filtros
  useEffect(() => { setSeleccion(new Set()) }, [page, q])

  // Actividades del catálogo para la acción masiva "asignar tipo"
  // (los tipos de cliente son las actividades — 100% sincronizados)
  useEffect(() => {
    fetch('/api/actividades')
      .then(r => r.ok ? r.json() : [])
      .then(d => setTiposDisponibles(Array.isArray(d) ? d.map((a: { nombre: string }) => a.nombre) : []))
      .catch(() => {})
  }, [])

  async function accionMasiva(payload: { accion: string; etapa?: string; tipo?: string }) {
    setBulkSaving(true)
    const res = await fetch('/api/clientes/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: Array.from(seleccion), ...payload }),
    })
    setBulkSaving(false)
    if (res.ok) {
      const json = await res.json()
      toast.success(`${json.afectados} cliente${json.afectados === 1 ? '' : 's'} actualizado${json.afectados === 1 ? '' : 's'}`)
      setSeleccion(new Set())
      setBulkEliminarOpen(false)
      fetchClientes()
    } else {
      const err = await res.json().catch(() => ({}))
      toast.error(err.error || 'Error en la acción masiva')
    }
  }

  async function handleOportunidadEtapa(opId: string, etapa: EtapaFunnel) {
    // Optimista: actualizar la oportunidad en la lista cargada
    setClientes(prev => prev.map(c => ({
      ...c,
      oportunidades: c.oportunidades?.map(o => o.id === opId ? { ...o, etapa } : o),
    })))
    const res = await fetch('/api/oportunidades', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: opId, etapa }),
    })
    if (res.ok) toast.success('Etapa actualizada')
    else { toast.error('Error al actualizar etapa'); fetchClientes() }
  }

  // Edición inline de un campo (teléfono/correo) directo en la tabla
  async function editarCampoInline(id: string, campo: 'telefono' | 'correo', valor: string) {
    const res = await fetch(`/api/clientes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [campo]: valor || null }),
    })
    if (res.ok) {
      setClientes(prev => prev.map(c => c.id === id ? { ...c, [campo]: valor || null } : c))
      toast.success('Actualizado')
    } else {
      toast.error('Error al actualizar')
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
          {/* C3: Dropdown exportación consolidado (requiere permiso) */}
          {perfil.permisos.has('exportar') && (
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
          )}
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
        <>
          <div className="flex justify-end mb-2">
            <Link href="/funnel" className="text-xs text-orange-600 hover:underline">Ver funnel completo (todas las oportunidades) →</Link>
          </div>
          <KanbanView clientes={clientes} onOportunidadEtapa={handleOportunidadEtapa} />
        </>
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
                  {puedeMasivas && (
                    <th className="px-3 py-3 w-8">
                      <input
                        type="checkbox"
                        checked={clientes.length > 0 && seleccion.size === clientes.length}
                        onChange={toggleSeleccionTodos}
                        className="h-3.5 w-3.5 accent-orange-600 cursor-pointer"
                        title="Seleccionar todos"
                      />
                    </th>
                  )}
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-6"></th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Nombre</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Contacto</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Funnel</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Canal</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {clientes.map(c => {
                  const sem = calcSemaforo(c)
                  const isContactadoOpen = contactadoId === c.id

                  return (
                    <tr key={c.id} className={`hover:bg-gray-50 transition-colors group ${seleccion.has(c.id) ? 'bg-orange-50/50' : ''}`}>
                      {/* Checkbox de selección */}
                      {puedeMasivas && (
                        <td className="px-3 py-3">
                          <input
                            type="checkbox"
                            checked={seleccion.has(c.id)}
                            onChange={() => toggleSeleccion(c.id)}
                            className="h-3.5 w-3.5 accent-orange-600 cursor-pointer"
                          />
                        </td>
                      )}

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

                      {/* Contacto — correo / teléfono (editables inline) */}
                      <td className="px-4 py-3 text-gray-500">
                        <div className="flex flex-col gap-0.5">
                          <CeldaEditable
                            valor={c.correo}
                            placeholder="+ correo"
                            onSave={v => editarCampoInline(c.id, 'correo', v)}
                          />
                          <CeldaEditable
                            valor={c.telefono}
                            placeholder="+ teléfono"
                            onSave={v => editarCampoInline(c.id, 'telefono', v)}
                          />
                        </div>
                      </td>

                      {/* Funnel — oportunidades por actividad (chips) */}
                      <td className="px-4 py-3">
                        {c.oportunidades && c.oportunidades.length > 0 ? (
                          <div className="flex flex-col gap-1 items-start">
                            {c.oportunidades.map((o, i) => {
                              const cfg = ETAPA_BADGE[o.etapa]
                              return (
                                <span
                                  key={i}
                                  className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${cfg ? `${cfg.bg} ${cfg.text}` : 'bg-gray-100 text-gray-500'}`}
                                  title={`${o.actividad_nombre} - ${cfg ? cfg.label : o.etapa}`}
                                >
                                  <span className="font-medium truncate max-w-[130px]">{o.actividad_nombre}</span>
                                  <span className="opacity-70">- {cfg ? cfg.label : o.etapa}</span>
                                </span>
                              )
                            })}
                          </div>
                        ) : (
                          <Link href={`/clientes/${c.id}`} className="text-xs text-gray-300 hover:text-orange-500">+ funnel</Link>
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

      {/* Barra flotante de acciones masivas */}
      {seleccion.size > 0 && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[8000] bg-white rounded-2xl shadow-2xl border border-gray-200 px-4 py-3 flex items-center gap-3 flex-wrap">
          <span className="text-sm font-semibold text-gray-800">
            {seleccion.size} seleccionado{seleccion.size === 1 ? '' : 's'}
          </span>

          <div className="h-5 w-px bg-gray-200" />

          {/* Cambiar etapa */}
          {perfil.permisos.has('masivas') && (
          <div className="relative">
            <select
              disabled={bulkSaving}
              value=""
              onChange={e => e.target.value && accionMasiva({ accion: 'etapa', etapa: e.target.value })}
              className="h-8 pl-2 pr-7 rounded-lg border border-gray-200 text-xs text-gray-600 bg-white focus:outline-none focus:border-orange-400 appearance-none cursor-pointer"
            >
              <option value="">Cambiar etapa...</option>
              {ETAPAS_FUNNEL.map(e => (
                <option key={e.value} value={e.value}>{e.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none" />
          </div>
          )}

          {/* Asignar tipo */}
          {perfil.permisos.has('masivas') && tiposDisponibles.length > 0 && (
            <div className="relative">
              <select
                disabled={bulkSaving}
                value=""
                onChange={e => e.target.value && accionMasiva({ accion: 'tipo', tipo: e.target.value })}
                className="h-8 pl-2 pr-7 rounded-lg border border-gray-200 text-xs text-gray-600 bg-white focus:outline-none focus:border-orange-400 appearance-none cursor-pointer"
              >
                <option value="">Asignar tipo...</option>
                {tiposDisponibles.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none" />
            </div>
          )}

          {/* Eliminar */}
          {perfil.permisos.has('eliminar') && (
            <button
              disabled={bulkSaving}
              onClick={() => setBulkEliminarOpen(true)}
              className="h-8 px-3 rounded-lg border border-red-200 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              Eliminar
            </button>
          )}

          <button
            onClick={() => setSeleccion(new Set())}
            title="Limpiar selección"
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X size={14} />
          </button>

          {bulkSaving && <span className="text-xs text-gray-400">Aplicando...</span>}
        </div>
      )}

      {/* Confirmación de eliminación masiva */}
      {bulkEliminarOpen && (
        <div className="fixed inset-0 z-[9000] bg-black/40 flex items-center justify-center p-4" onClick={() => setBulkEliminarOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-sm w-full p-5" onClick={e => e.stopPropagation()}>
            <p className="text-sm font-semibold text-red-600 mb-2">⚠ Eliminar {seleccion.size} cliente{seleccion.size === 1 ? '' : 's'}</p>
            <p className="text-sm text-gray-600 mb-4">
              Esta acción también elimina sus seguimientos, pagos y asistencias, y <span className="font-semibold">no se puede deshacer</span>.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setBulkEliminarOpen(false)}>Cancelar</Button>
              <Button
                size="sm"
                disabled={bulkSaving}
                onClick={() => accionMasiva({ accion: 'eliminar' })}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {bulkSaving ? 'Eliminando...' : 'Sí, eliminar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ClienteFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleCreate}
        title="Nuevo cliente"
      />
    </div>
  )
}
