'use client'

import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'
import {
  Upload, FileSpreadsheet, CheckCircle, AlertCircle,
  Plus, ChevronDown, Search, X, CalendarRange, TableProperties, Save, Undo2,
} from 'lucide-react'
import { toast } from 'sonner'
import { getSupabase } from '@/lib/supabase'
import { Actividad } from '@/lib/types'

// ─── Types ────────────────────────────────────────────────────────────────────
interface SeguimientoConCliente {
  id: string
  tipo: string
  fecha: string
  notas: string
  usuario: string | null
  actividad_nombre: string | null
  cliente_id: string
  clientes?: { nombre: string; correo: string | null; telefono: string | null }
}

interface ClienteBasico {
  id: string
  nombre: string
  correo: string | null
  telefono: string | null
}

interface ResultadoImport {
  importados: number
  actualizados: number
  noEncontrados: number
  errores: string[]
}

const TIPO_COLOR: Record<string, string> = {
  whatsapp: 'bg-green-100 text-green-700',
  llamada:  'bg-blue-100 text-blue-700',
  correo:   'bg-purple-100 text-purple-700',
  visita:   'bg-orange-100 text-orange-700',
  otro:     'bg-gray-100 text-gray-600',
}

// ─── Nuevo Seguimiento Dialog (S3) ────────────────────────────────────────────
function NuevoSeguimientoDialog({
  open, onOpenChange, defaultUsuario, onSaved,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  defaultUsuario: string
  onSaved: () => void
}) {
  // Step 1: client search
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState<ClienteBasico[]>([])
  const [buscando, setBuscando] = useState(false)
  const [clienteSeleccionado, setClienteSeleccionado] = useState<ClienteBasico | null>(null)

  // Step 2: form fields
  const [tipo, setTipo] = useState('whatsapp')
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 16))
  const [notas, setNotas] = useState('')
  const [usuario, setUsuario] = useState(defaultUsuario)
  const [actividadNombre, setActividadNombre] = useState('')
  const [actividades, setActividades] = useState<Actividad[]>([])
  const [saving, setSaving] = useState(false)

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Reset on open/close
  useEffect(() => {
    if (open) {
      setBusqueda('')
      setResultados([])
      setClienteSeleccionado(null)
      setTipo('whatsapp')
      setFecha(new Date().toISOString().slice(0, 16))
      setNotas('')
      setActividadNombre('')
      setUsuario(defaultUsuario)
      fetch('/api/actividades').then(r => r.json()).then(d => setActividades(Array.isArray(d) ? d : []))
    }
  }, [open, defaultUsuario])

  // Debounced client search
  useEffect(() => {
    if (!busqueda.trim() || clienteSeleccionado) {
      setResultados([])
      return
    }
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setBuscando(true)
      fetch(`/api/clientes?q=${encodeURIComponent(busqueda)}&limit=8`)
        .then(r => r.json())
        .then(json => { setResultados(json.data || []); setBuscando(false) })
        .catch(() => setBuscando(false))
    }, 300)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [busqueda, clienteSeleccionado])

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    if (!clienteSeleccionado) return
    setSaving(true)
    const res = await fetch('/api/seguimientos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cliente_id: clienteSeleccionado.id,
        tipo,
        fecha,
        notas,
        usuario,
        actividad_nombre: actividadNombre || null,
      }),
    })
    setSaving(false)
    if (res.ok) {
      toast.success(`Seguimiento guardado para ${clienteSeleccionado.nombre}`)
      onSaved()
      onOpenChange(false)
    } else {
      const err = await res.json()
      toast.error(err.error || 'Error al guardar')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuevo seguimiento</DialogTitle>
        </DialogHeader>

        <form onSubmit={guardar} className="space-y-4">
          {/* Client search */}
          <div>
            <Label>Cliente *</Label>
            {clienteSeleccionado ? (
              <div className="flex items-center gap-2 mt-1 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                <span className="flex-1 text-sm font-medium text-orange-800">{clienteSeleccionado.nombre}</span>
                <button
                  type="button"
                  onClick={() => { setClienteSeleccionado(null); setBusqueda('') }}
                  className="text-orange-400 hover:text-orange-600"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar cliente por nombre, correo o teléfono..."
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  autoFocus
                  className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400"
                />
                {(resultados.length > 0 || buscando) && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                    {buscando ? (
                      <div className="px-3 py-2 text-sm text-gray-400">Buscando...</div>
                    ) : resultados.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-gray-400">Sin resultados</div>
                    ) : resultados.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => { setClienteSeleccionado(c); setBusqueda(''); setResultados([]) }}
                        className="w-full text-left px-3 py-2 hover:bg-orange-50 text-sm"
                      >
                        <span className="font-medium text-gray-800">{c.nombre}</span>
                        {c.correo && <span className="ml-2 text-xs text-gray-400">{c.correo}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Seguimiento fields — only shown once a client is selected */}
          {clienteSeleccionado && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tipo</Label>
                  <Select value={tipo} onValueChange={v => v && setTipo(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="llamada">Llamada</SelectItem>
                      <SelectItem value="correo">Correo</SelectItem>
                      <SelectItem value="visita">Visita</SelectItem>
                      <SelectItem value="otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Fecha y hora</Label>
                  <Input type="datetime-local" value={fecha} onChange={e => setFecha(e.target.value)} />
                </div>
              </div>

              <div>
                <Label>Actividad relacionada</Label>
                <Select
                  value={actividadNombre || '__ninguna__'}
                  onValueChange={v => setActividadNombre(v === '__ninguna__' ? '' : (v ?? ''))}
                >
                  <SelectTrigger><SelectValue placeholder="Sin actividad específica" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__ninguna__">— Sin actividad específica —</SelectItem>
                    {actividades.map(a => (
                      <SelectItem key={a.id} value={a.nombre}>{a.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Responsable</Label>
                <Input
                  placeholder="Nombre de quien contactó"
                  value={usuario}
                  onChange={e => setUsuario(e.target.value)}
                />
              </div>

              <div>
                <Label>Notas *</Label>
                <Textarea
                  rows={3}
                  required
                  value={notas}
                  onChange={e => setNotas(e.target.value)}
                  placeholder="Describe el contacto..."
                />
              </div>
            </>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button
              type="submit"
              disabled={saving || !clienteSeleccionado}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {saving ? 'Guardando...' : 'Guardar seguimiento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function SeguimientosPage() {
  const [items, setItems]   = useState<SeguimientoConCliente[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal]   = useState(0)
  const [page, setPage]     = useState(1)
  const limit = 50

  // Filters
  const [tipoFilter, setTipoFilter]   = useState('')
  const [fechaDesde, setFechaDesde]   = useState('')
  const [fechaHasta, setFechaHasta]   = useState('')

  // S3 dialog
  const [nuevoOpen, setNuevoOpen]       = useState(false)
  const [currentUserEmail, setCurrentUserEmail] = useState('')

  // Import
  const [fileImport, setFileImport] = useState<File | null>(null)
  const [importing, setImporting]   = useState(false)
  const [resultado, setResultado]   = useState<ResultadoImport | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // ── Vista Excel ────────────────────────────────────────────────────────────
  const [vistaExcel, setVistaExcel] = useState(false)
  const [drafts, setDrafts] = useState<Record<string, Partial<SeguimientoConCliente>>>({})
  const [savingDrafts, setSavingDrafts] = useState(false)
  const [colFiltros, setColFiltros] = useState({ tipo: '', cliente: '', notas: '' })

  // Responsable por defecto — preferencia guardada en localStorage, fallback al email
  useEffect(() => {
    const guardado = typeof window !== 'undefined' ? localStorage.getItem('renova_responsable') : ''
    if (guardado) {
      setCurrentUserEmail(guardado)
    } else {
      getSupabase().auth.getUser().then(({ data }) => {
        if (data.user?.email) setCurrentUserEmail(data.user.email)
      })
    }
  }, [])

  // Reset page when filters change
  useEffect(() => { setPage(1) }, [tipoFilter, fechaDesde, fechaHasta])

  const fetchSeguimientos = useCallback(() => {
    setLoading(true)
    const currentLimit = vistaExcel ? 500 : limit
    const currentPage  = vistaExcel ? 1   : page
    const params = new URLSearchParams({ page: String(currentPage), limit: String(currentLimit) })
    if (tipoFilter) params.set('tipo', tipoFilter)
    if (fechaDesde) params.set('fecha_desde', fechaDesde)
    if (fechaHasta) params.set('fecha_hasta', fechaHasta)

    fetch(`/api/seguimientos?${params}`)
      .then(r => r.json())
      .then(json => { setItems(json.data || []); setTotal(json.count ?? 0); setLoading(false) })
      .catch(() => setLoading(false))
  }, [page, tipoFilter, fechaDesde, fechaHasta, vistaExcel])

  useEffect(() => { fetchSeguimientos() }, [fetchSeguimientos])

  // ── Vista Excel: helpers ──────────────────────────────────────────────────
  function updateDraft(id: string, field: 'tipo' | 'fecha' | 'notas' | 'usuario' | 'actividad_nombre', value: string) {
    setDrafts(prev => ({ ...prev, [id]: { ...(prev[id] || {}), [field]: value } }))
  }

  async function saveDrafts() {
    const entries = Object.entries(drafts)
    if (!entries.length) return
    setSavingDrafts(true)
    let ok = 0, fail = 0
    for (const [id, changes] of entries) {
      const res = await fetch(`/api/seguimientos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes),
      })
      if (res.ok) ok++ else fail++
    }
    setSavingDrafts(false)
    if (fail === 0) {
      toast.success(`${ok} seguimiento${ok !== 1 ? 's' : ''} actualizado${ok !== 1 ? 's' : ''}`)
      setDrafts({})
      fetchSeguimientos()
    } else {
      toast.error(`${fail} ${fail === 1 ? 'error' : 'errores'} al guardar`)
      fetchSeguimientos()
    }
  }

  async function handleImport() {
    if (!fileImport) return
    setImporting(true)
    setResultado(null)
    const form = new FormData()
    form.append('file', fileImport)
    const res = await fetch('/api/importar-seguimientos', { method: 'POST', body: form })
    const json = await res.json()
    setImporting(false)
    if (!res.ok) { toast.error(json.error || 'Error al importar'); return }
    setResultado(json)
    toast.success(`${json.importados} seguimientos importados`)
    fetchSeguimientos()
  }

  function fmt(d: string) {
    try { return format(new Date(d), 'dd/MM/yyyy HH:mm', { locale: es }) }
    catch { return d }
  }

  const hayFiltros = !!(tipoFilter || fechaDesde || fechaHasta)

  const itemsFiltrados = useMemo(() => {
    if (!vistaExcel) return items
    return items.filter(s => {
      const matchTipo    = !colFiltros.tipo    || s.tipo === colFiltros.tipo
      const matchCliente = !colFiltros.cliente || (s.clientes?.nombre || '').toLowerCase().includes(colFiltros.cliente.toLowerCase())
      const matchNotas   = !colFiltros.notas   || (s.notas || '').toLowerCase().includes(colFiltros.notas.toLowerCase())
      return matchTipo && matchCliente && matchNotas
    })
  }, [items, vistaExcel, colFiltros])

  return (
    <div className="p-6 max-w-6xl">

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Seguimientos</h2>
          <p className="text-gray-500 text-sm mt-1">Historial de contactos con prospectos y clientes.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setVistaExcel(v => !v); setDrafts({}); setColFiltros({ tipo: '', cliente: '', notas: '' }) }}
            className={`h-10 px-3 text-sm rounded-lg border flex items-center gap-2 transition-colors ${
              vistaExcel
                ? 'bg-orange-600 text-white border-orange-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'
            }`}
          >
            <TableProperties className="h-4 w-4" />
            Vista Excel
          </button>
          <Button
            onClick={() => setNuevoOpen(true)}
            className="bg-orange-600 hover:bg-orange-700 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Nuevo seguimiento
          </Button>
        </div>
      </div>

      {/* Filters (S1 + S2) */}
      <div className="flex flex-wrap gap-3 mb-5 items-end">
        {/* Tipo filter */}
        <div className="relative">
          <select
            value={tipoFilter}
            onChange={e => setTipoFilter(e.target.value)}
            className="h-10 pl-3 pr-8 rounded-lg border border-gray-200 text-sm text-gray-600 bg-white focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400 appearance-none cursor-pointer"
          >
            <option value="">Todos los tipos</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="llamada">Llamada</option>
            <option value="correo">Correo</option>
            <option value="visita">Visita</option>
            <option value="otro">Otro</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
        </div>

        {/* Date range (S1) */}
        <div className="flex items-center gap-2">
          <div className="relative flex items-center">
            <CalendarRange className="absolute left-2.5 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
            <input
              type="date"
              value={fechaDesde}
              onChange={e => setFechaDesde(e.target.value)}
              className="h-10 pl-8 pr-3 rounded-lg border border-gray-200 text-sm text-gray-600 bg-white focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400"
              title="Desde"
            />
          </div>
          <span className="text-gray-400 text-sm">—</span>
          <input
            type="date"
            value={fechaHasta}
            onChange={e => setFechaHasta(e.target.value)}
            className="h-10 px-3 rounded-lg border border-gray-200 text-sm text-gray-600 bg-white focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400"
            title="Hasta"
          />
        </div>

        {/* Clear filters */}
        {hayFiltros && (
          <button
            onClick={() => { setTipoFilter(''); setFechaDesde(''); setFechaHasta('') }}
            className="h-10 px-3 text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1 rounded-lg border border-gray-200 hover:border-gray-300 bg-white transition-colors"
          >
            <X className="h-3.5 w-3.5" /> Limpiar
          </button>
        )}

        {total > 0 && (
          <span className="ml-auto text-sm text-gray-400 self-center">
            {total} {total === 1 ? 'seguimiento' : 'seguimientos'}
            {hayFiltros && ' (filtrado)'}
          </span>
        )}
      </div>

      {/* ── Vista Normal ── */}
      {!vistaExcel && (
        loading ? (
          <div className="space-y-2">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <p className="text-gray-400 text-sm">
              {hayFiltros ? 'No hay seguimientos con los filtros aplicados.' : 'No hay seguimientos registrados.'}
            </p>
            {!hayFiltros && (
              <Button onClick={() => setNuevoOpen(true)} className="mt-4 bg-orange-600 hover:bg-orange-700" size="sm">
                <Plus className="h-4 w-4 mr-1" /> Registrar el primero
              </Button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Cliente</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Contacto</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Actividad</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Notas</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Responsable</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmt(s.fecha)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${TIPO_COLOR[s.tipo] || TIPO_COLOR.otro}`}>
                        {s.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium whitespace-nowrap">
                      {s.clientes?.nombre
                        ? <Link href={`/clientes/${s.cliente_id}`} className="hover:text-orange-600 transition-colors">{s.clientes.nombre}</Link>
                        : <span className="text-gray-400">—</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                      <div className="space-y-0.5">
                        {s.clientes?.correo   && <div className="text-xs">{s.clientes.correo}</div>}
                        {s.clientes?.telefono && <div className="text-xs">{s.clientes.telefono}</div>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs hidden lg:table-cell">{s.actividad_nombre || '—'}</td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="truncate text-gray-700" title={s.notas}>{s.notas}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap hidden md:table-cell">{s.usuario || '—'}</td>
                    <td className="px-4 py-3">
                      <Link href={`/clientes/${s.cliente_id}`} className="text-xs text-orange-600 hover:underline whitespace-nowrap">Ver →</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* ── Vista Excel ── */}
      {vistaExcel && (
        loading ? (
          <div className="space-y-1">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="h-9 bg-gray-100 animate-pulse rounded" />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* Filtros por columna */}
            <div className="bg-gray-50 border-b border-gray-200 px-3 py-2 flex flex-wrap gap-2 items-center">
              <span className="text-xs font-medium text-gray-500 mr-1">Filtrar:</span>
              <div className="relative">
                <select
                  value={colFiltros.tipo}
                  onChange={e => setColFiltros(f => ({ ...f, tipo: e.target.value }))}
                  className="h-7 pl-2 pr-6 rounded border border-gray-200 text-xs text-gray-600 bg-white focus:outline-none focus:border-orange-400 appearance-none"
                >
                  <option value="">Tipo (todos)</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="llamada">Llamada</option>
                  <option value="correo">Correo</option>
                  <option value="visita">Visita</option>
                  <option value="otro">Otro</option>
                </select>
                <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none" />
              </div>
              <input
                type="text"
                placeholder="Buscar cliente..."
                value={colFiltros.cliente}
                onChange={e => setColFiltros(f => ({ ...f, cliente: e.target.value }))}
                className="h-7 px-2 rounded border border-gray-200 text-xs text-gray-600 bg-white focus:outline-none focus:border-orange-400 w-36"
              />
              <input
                type="text"
                placeholder="Buscar en notas..."
                value={colFiltros.notas}
                onChange={e => setColFiltros(f => ({ ...f, notas: e.target.value }))}
                className="h-7 px-2 rounded border border-gray-200 text-xs text-gray-600 bg-white focus:outline-none focus:border-orange-400 w-40"
              />
              {(colFiltros.tipo || colFiltros.cliente || colFiltros.notas) && (
                <button
                  onClick={() => setColFiltros({ tipo: '', cliente: '', notas: '' })}
                  className="h-7 px-2 text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 rounded border border-gray-200 bg-white"
                >
                  <X className="h-3 w-3" /> Limpiar
                </button>
              )}
              <span className="ml-auto text-xs text-gray-400">
                {itemsFiltrados.length} de {items.length} filas
                {Object.keys(drafts).length > 0 && (
                  <span className="ml-2 text-orange-600 font-medium">• {Object.keys(drafts).length} con cambios</span>
                )}
              </span>
            </div>

            {/* Tabla editable */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold text-gray-600 w-32">Fecha</th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-600 w-28">Tipo</th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-600 w-40">Cliente</th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-600">Notas</th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-600 w-36 hidden lg:table-cell">Actividad</th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-600 w-32 hidden md:table-cell">Responsable</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {itemsFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">
                        Sin resultados con los filtros aplicados.
                      </td>
                    </tr>
                  ) : itemsFiltrados.map(s => {
                    const isDirty = !!drafts[s.id]
                    const get = (field: 'tipo' | 'fecha' | 'notas' | 'usuario' | 'actividad_nombre') =>
                      ((drafts[s.id]?.[field] ?? s[field]) as string) || ''

                    return (
                      <tr
                        key={s.id}
                        className={`group transition-colors ${isDirty ? 'bg-orange-50 hover:bg-orange-100' : 'hover:bg-gray-50'}`}
                      >
                        {/* Fecha */}
                        <td className="px-2 py-1">
                          <input
                            type="date"
                            value={get('fecha').slice(0, 10)}
                            onChange={e => updateDraft(s.id, 'fecha', e.target.value)}
                            className={`w-full h-7 px-1.5 rounded text-xs border focus:outline-none focus:ring-1 focus:ring-orange-400 transition-colors ${
                              isDirty && drafts[s.id]?.fecha !== undefined ? 'border-orange-300 bg-white' : 'border-transparent bg-transparent hover:border-gray-300'
                            }`}
                          />
                        </td>

                        {/* Tipo */}
                        <td className="px-2 py-1">
                          <select
                            value={get('tipo')}
                            onChange={e => updateDraft(s.id, 'tipo', e.target.value)}
                            className={`w-full h-7 px-1.5 rounded text-xs border focus:outline-none focus:ring-1 focus:ring-orange-400 transition-colors appearance-none ${
                              isDirty && drafts[s.id]?.tipo !== undefined ? 'border-orange-300 bg-white' : 'border-transparent bg-transparent hover:border-gray-300'
                            }`}
                          >
                            <option value="whatsapp">WhatsApp</option>
                            <option value="llamada">Llamada</option>
                            <option value="correo">Correo</option>
                            <option value="visita">Visita</option>
                            <option value="otro">Otro</option>
                          </select>
                        </td>

                        {/* Cliente — solo lectura */}
                        <td className="px-3 py-1 font-medium whitespace-nowrap">
                          {s.clientes?.nombre
                            ? <Link href={`/clientes/${s.cliente_id}`} className="hover:text-orange-600 transition-colors">{s.clientes.nombre}</Link>
                            : <span className="text-gray-400">—</span>
                          }
                        </td>

                        {/* Notas */}
                        <td className="px-2 py-1">
                          <input
                            type="text"
                            value={get('notas')}
                            onChange={e => updateDraft(s.id, 'notas', e.target.value)}
                            placeholder="—"
                            className={`w-full h-7 px-1.5 rounded text-xs border focus:outline-none focus:ring-1 focus:ring-orange-400 transition-colors ${
                              isDirty && drafts[s.id]?.notas !== undefined ? 'border-orange-300 bg-white' : 'border-transparent bg-transparent hover:border-gray-300'
                            }`}
                          />
                        </td>

                        {/* Actividad */}
                        <td className="px-2 py-1 hidden lg:table-cell">
                          <input
                            type="text"
                            value={get('actividad_nombre')}
                            onChange={e => updateDraft(s.id, 'actividad_nombre', e.target.value)}
                            placeholder="—"
                            className={`w-full h-7 px-1.5 rounded text-xs border focus:outline-none focus:ring-1 focus:ring-orange-400 transition-colors ${
                              isDirty && drafts[s.id]?.actividad_nombre !== undefined ? 'border-orange-300 bg-white' : 'border-transparent bg-transparent hover:border-gray-300'
                            }`}
                          />
                        </td>

                        {/* Responsable */}
                        <td className="px-2 py-1 hidden md:table-cell">
                          <input
                            type="text"
                            value={get('usuario')}
                            onChange={e => updateDraft(s.id, 'usuario', e.target.value)}
                            placeholder="—"
                            className={`w-full h-7 px-1.5 rounded text-xs border focus:outline-none focus:ring-1 focus:ring-orange-400 transition-colors ${
                              isDirty && drafts[s.id]?.usuario !== undefined ? 'border-orange-300 bg-white' : 'border-transparent bg-transparent hover:border-gray-300'
                            }`}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* Pagination (S5) */}
      {!loading && total > limit && (() => {
        const totalPages = Math.ceil(total / limit)
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
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</Button>
              {pages.map((p, i) => p === '…' ? (
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
              ))}
              <Button variant="outline" size="sm" disabled={page * limit >= total} onClick={() => setPage(p => p + 1)}>›</Button>
            </div>
          </div>
        )
      })()}

      {/* Import card */}
      <Card className="mt-8">
        <CardHeader className="py-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="h-4 w-4 text-orange-600" />
            Importar seguimientos desde Excel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-500">
            Usa el Excel exportado desde <strong>Clientes</strong>, completa las columnas de Seguimiento y súbelo aquí.
            El sistema reconocerá a cada cliente por nombre, RUT, correo o teléfono.
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg px-6 py-3 cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-colors flex items-center gap-2"
              onClick={() => inputRef.current?.click()}
            >
              <FileSpreadsheet className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-600">
                {fileImport ? fileImport.name : 'Seleccionar archivo .xlsx'}
              </span>
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={e => { setFileImport(e.target.files?.[0] || null); setResultado(null) }}
              />
            </div>
            <Button
              disabled={!fileImport || importing}
              onClick={handleImport}
              className="bg-orange-600 hover:bg-orange-700"
            >
              <Upload className="h-4 w-4 mr-2" />
              {importing ? 'Importando...' : 'Importar'}
            </Button>
          </div>

          {resultado && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
              <p className="flex items-center gap-2 font-medium text-gray-700">
                <CheckCircle className="h-4 w-4 text-green-500" /> Resultado
              </p>
              <div className="flex gap-4">
                <span className="text-orange-700 font-semibold">{resultado.importados} seguimientos importados</span>
                {resultado.actualizados > 0 && <span className="text-blue-700">{resultado.actualizados} actualizados</span>}
                {resultado.noEncontrados > 0 && <span className="text-red-600">{resultado.noEncontrados} clientes no encontrados</span>}
              </div>
              {resultado.errores.length > 0 && (
                <div className="mt-2">
                  <p className="flex items-center gap-1 text-red-600 font-medium">
                    <AlertCircle className="h-3 w-3" /> Errores
                  </p>
                  <ul className="text-red-500 space-y-0.5 mt-1">
                    {resultado.errores.slice(0, 10).map((e, i) => <li key={i}>• {e}</li>)}
                    {resultado.errores.length > 10 && <li>...y {resultado.errores.length - 10} más</li>}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Floating save bar — vista excel */}
      {vistaExcel && Object.keys(drafts).length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-2xl">
          <span className="text-sm font-medium">
            {Object.keys(drafts).length} fila{Object.keys(drafts).length !== 1 ? 's' : ''} con cambios
          </span>
          <button
            onClick={() => setDrafts({})}
            className="flex items-center gap-1.5 text-sm text-gray-300 hover:text-white transition-colors"
          >
            <Undo2 className="h-4 w-4" /> Descartar
          </button>
          <button
            onClick={saveDrafts}
            disabled={savingDrafts}
            className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-400 text-white px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {savingDrafts ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      )}

      {/* Nuevo seguimiento dialog (S3) */}
      <NuevoSeguimientoDialog
        open={nuevoOpen}
        onOpenChange={setNuevoOpen}
        defaultUsuario={currentUserEmail}
        onSaved={fetchSeguimientos}
      />
    </div>
  )
}
