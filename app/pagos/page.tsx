'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PagoForm } from '@/components/clientes/PagoForm'
import Link from 'next/link'
import { Plus, Search, Receipt, ChevronDown, X, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { Asistencia, Cliente, PagoFormPayload } from '@/lib/types'
import { cn } from '@/lib/utils'
import { usePerfil } from '@/components/shared/usePerfil'

// ─── Types ────────────────────────────────────────────────────────────────────
interface PagoConCliente {
  id: string
  actividad_nombre: string
  monto: number | null
  fecha_pago: string | null
  metodo_pago: string | null
  estado: string
  notas: string | null
  requiere_factura: boolean
  tiene_plan_cuotas?: boolean
  cliente_id: string
  clientes: { nombre: string } | null
}

const ESTADO_STYLE: Record<string, { badge: string; label: string }> = {
  pagado:    { badge: 'bg-green-100 text-green-700',   label: 'Pagado' },
  pendiente: { badge: 'bg-yellow-100 text-yellow-700', label: 'Pendiente' },
  parcial:   { badge: 'bg-blue-100 text-blue-700',     label: 'Parcial' },
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PagosPage() {
  const perfil = usePerfil()
  const [pagos, setPagos]     = useState<PagoConCliente[]>([])
  const [total, setTotal]     = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage]       = useState(1)
  const limit = 100

  // Filters
  const [estadoFilter, setEstadoFilter]   = useState('')
  const [periodoFilter, setPeriodoFilter] = useState('')   // YYYY-MM

  // PA3: inline mark as paid
  const [marcandoId, setMarcandoId] = useState<string | null>(null)

  // Nuevo pago (existing two-step flow)
  const [nuevoPagoOpen, setNuevoPagoOpen]         = useState(false)
  const [busquedaCliente, setBusquedaCliente]     = useState('')
  const [resultadosCliente, setResultadosCliente] = useState<Cliente[]>([])
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null)
  const [asistenciasCliente, setAsistenciasCliente]   = useState<Asistencia[]>([])
  const [pagoFormOpen, setPagoFormOpen] = useState(false)
  const [buscando, setBuscando]         = useState(false)

  // Reset page on filter change
  useEffect(() => { setPage(1) }, [estadoFilter, periodoFilter])

  const fetchPagos = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: String(limit) })
    if (estadoFilter) params.set('estado', estadoFilter)
    if (periodoFilter) {
      const [year, month] = periodoFilter.split('-')
      const lastDay = new Date(Number(year), Number(month), 0).getDate()
      params.set('fecha_desde', `${year}-${month}-01`)
      params.set('fecha_hasta', `${year}-${month}-${String(lastDay).padStart(2, '0')}`)
    }
    const res = await fetch(`/api/pagos?${params}`)
    if (res.ok) {
      const json = await res.json()
      setPagos(json.data || [])
      setTotal(json.count ?? 0)
    }
    setLoading(false)
  }, [page, estadoFilter, periodoFilter])

  useEffect(() => { fetchPagos() }, [fetchPagos])

  // KPI totals from loaded data (reflects current filters)
  const kpiPagado      = pagos.filter(p => p.estado === 'pagado').reduce((s, p) => s + (p.monto || 0), 0)
  const kpiPendiente   = pagos.filter(p => p.estado === 'pendiente').reduce((s, p) => s + (p.monto || 0), 0)
  const kpiParcial     = pagos.filter(p => p.estado === 'parcial').reduce((s, p) => s + (p.monto || 0), 0)
  const countPendiente = pagos.filter(p => p.estado === 'pendiente').length
  const countParcial   = pagos.filter(p => p.estado === 'parcial').length

  // PA3: Mark payment as paid inline
  async function marcarPagado(pago: PagoConCliente) {
    if (!pago.monto || pago.monto <= 0) {
      toast.error('Este pago no tiene monto. Agrégalo desde el perfil del cliente (lápiz en la pestaña Pagos) antes de marcarlo pagado.')
      return
    }
    setMarcandoId(pago.id)
    const res = await fetch(`/api/pagos/${pago.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        estado: 'pagado',
        fecha_pago: pago.fecha_pago || new Date().toISOString().slice(0, 10),
      }),
    })
    setMarcandoId(null)
    if (res.ok) {
      toast.success(`Pago de ${pago.clientes?.nombre || 'cliente'} marcado como pagado`)
      fetchPagos()
    } else {
      toast.error('Error al actualizar el pago')
    }
  }

  // ─── Nuevo pago: client search ───────────────────────────────────────────
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!busquedaCliente.trim() || clienteSeleccionado) { setResultadosCliente([]); return }
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setBuscando(true)
      fetch(`/api/clientes?q=${encodeURIComponent(busquedaCliente)}&limit=8`)
        .then(r => r.json())
        .then(json => { setResultadosCliente(json.data || []); setBuscando(false) })
        .catch(() => setBuscando(false))
    }, 300)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [busquedaCliente, clienteSeleccionado])

  async function seleccionarCliente(cliente: Cliente) {
    setClienteSeleccionado(cliente)
    setResultadosCliente([])
    setBusquedaCliente(cliente.nombre)
    const res = await fetch(`/api/clientes/${cliente.id}`)
    if (res.ok) {
      const data = await res.json()
      setAsistenciasCliente(data.asistencias || [])
    }
  }

  function abrirNuevoPago() {
    setClienteSeleccionado(null)
    setBusquedaCliente('')
    setResultadosCliente([])
    setAsistenciasCliente([])
    setNuevoPagoOpen(true)
  }

  function confirmarCliente() {
    if (!clienteSeleccionado) return
    setNuevoPagoOpen(false)
    setPagoFormOpen(true)
  }

  async function guardarPago(data: PagoFormPayload) {
    if (!clienteSeleccionado) return
    const res = await fetch('/api/pagos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, cliente_id: clienteSeleccionado.id }),
    })
    if (res.ok) {
      toast.success(`Pago registrado para ${clienteSeleccionado.nombre}`)
      setPagoFormOpen(false)
      fetchPagos()
    } else {
      toast.error('Error al registrar el pago')
    }
  }

  const hayFiltros = !!(estadoFilter || periodoFilter)

  return (
    <div className="p-6 max-w-5xl">

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Pagos</h2>
          <p className="text-gray-500 text-sm mt-1">Registro de todos los pagos del sistema</p>
        </div>
        <Button onClick={abrirNuevoPago} className="bg-orange-600 hover:bg-orange-700">
          <Plus className="h-4 w-4 mr-2" /> Nuevo pago
        </Button>
      </div>

      {/* KPI Cards — solo con permiso de ver totales */}
      {perfil.permisos.has('totales_pagos') && !loading && pagos.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-6">
          {(!estadoFilter || estadoFilter === 'pagado') && kpiPagado > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3">
              <p className="text-xs text-orange-600">Total pagado{hayFiltros && ' (filtrado)'}</p>
              <p className="text-xl font-bold text-orange-700">${kpiPagado.toLocaleString('es-CL')}</p>
            </div>
          )}
          {(!estadoFilter || estadoFilter === 'pendiente') && countPendiente > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3">
              <p className="text-xs text-yellow-700">Pendientes ({countPendiente})</p>
              <p className="text-xl font-bold text-yellow-800">${kpiPendiente.toLocaleString('es-CL')}</p>
            </div>
          )}
          {(!estadoFilter || estadoFilter === 'parcial') && countParcial > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
              <p className="text-xs text-blue-700">Parciales ({countParcial})</p>
              <p className="text-xl font-bold text-blue-800">${kpiParcial.toLocaleString('es-CL')}</p>
            </div>
          )}
        </div>
      )}

      {/* Filters (PA1 + PA2) */}
      <div className="flex flex-wrap gap-3 mb-5 items-center">
        {/* PA1 - Estado filter */}
        <div className="relative">
          <select
            value={estadoFilter}
            onChange={e => setEstadoFilter(e.target.value)}
            className="h-10 pl-3 pr-8 rounded-lg border border-gray-200 text-sm text-gray-600 bg-white focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400 appearance-none cursor-pointer"
          >
            <option value="">Todos los estados</option>
            <option value="pagado">Pagado</option>
            <option value="pendiente">Pendiente</option>
            <option value="parcial">Parcial</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
        </div>

        {/* PA2 - Período filter (month picker) */}
        <div className="relative">
          <input
            type="month"
            value={periodoFilter}
            onChange={e => setPeriodoFilter(e.target.value)}
            className="h-10 px-3 rounded-lg border border-gray-200 text-sm text-gray-600 bg-white focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400 cursor-pointer"
            title="Filtrar por mes"
          />
        </div>

        {/* Clear filters */}
        {hayFiltros && (
          <button
            onClick={() => { setEstadoFilter(''); setPeriodoFilter('') }}
            className="h-10 px-3 text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1 rounded-lg border border-gray-200 hover:border-gray-300 bg-white transition-colors"
          >
            <X className="h-3.5 w-3.5" /> Limpiar
          </button>
        )}

        {total > 0 && (
          <span className="ml-auto text-sm text-gray-400 self-center">
            {total} {total === 1 ? 'pago' : 'pagos'}
            {hayFiltros && ' (filtrado)'}
          </span>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 animate-pulse rounded-lg" />
          ))}
        </div>
      ) : pagos.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-400 text-sm">
            {hayFiltros ? 'No hay pagos con los filtros aplicados.' : 'No hay pagos registrados.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Cliente</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Actividad</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Monto</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Método</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Fecha</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pagos.map(p => {
                const estilo = ESTADO_STYLE[p.estado] || ESTADO_STYLE.pendiente
                const esPendienteOParcial = p.estado === 'pendiente' || p.estado === 'parcial'

                return (
                  <tr key={p.id} className={cn(
                    'hover:bg-gray-50 transition-colors',
                    esPendienteOParcial && 'bg-yellow-50/30'
                  )}>
                    <td className="px-4 py-3 font-medium">
                      <div className="flex items-center gap-1">
                        {p.clientes?.nombre || '—'}
                        {p.requiere_factura && (
                          <span title="Requiere factura">
                            <Receipt className="h-3.5 w-3.5 text-orange-500 ml-1" />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{p.actividad_nombre}</td>
                    <td className="px-4 py-3 font-medium">{p.monto ? `$${p.monto.toLocaleString('es-CL')}` : '—'}</td>
                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{p.metodo_pago || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', estilo.badge)}>
                        {estilo.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 hidden md:table-cell">{p.fecha_pago || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {/* Plan de cuotas: se gestiona cuota a cuota desde la ficha */}
                        {p.tiene_plan_cuotas ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                            Plan de cuotas
                          </span>
                        ) : esPendienteOParcial && (
                          <button
                            onClick={() => marcarPagado(p)}
                            disabled={marcandoId === p.id}
                            title="Marcar como pagado"
                            className={cn(
                              'flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border transition-colors',
                              marcandoId === p.id
                                ? 'opacity-50 cursor-not-allowed bg-gray-50 border-gray-200 text-gray-400'
                                : 'bg-white border-green-200 text-green-700 hover:bg-green-50 hover:border-green-300'
                            )}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {marcandoId === p.id ? 'Guardando...' : 'Pagado'}
                          </button>
                        )}
                        <Link href={`/clientes/${p.cliente_id}`} className="text-xs text-orange-600 hover:underline whitespace-nowrap">
                          Ver →
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
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

      {/* Dialog: seleccionar cliente */}
      <Dialog open={nuevoPagoOpen} onOpenChange={setNuevoPagoOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Nuevo pago — seleccionar cliente</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Buscar cliente</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <Input
                  className="pl-8"
                  placeholder="Nombre, correo o teléfono..."
                  value={busquedaCliente}
                  onChange={e => { setBusquedaCliente(e.target.value); setClienteSeleccionado(null) }}
                  autoFocus
                />
                {buscando && (
                  <span className="absolute right-3 top-2.5 text-xs text-gray-400">Buscando...</span>
                )}
              </div>
              {resultadosCliente.length > 0 && (
                <div className="mt-1 border border-gray-200 rounded-md shadow-sm bg-white max-h-48 overflow-auto">
                  {resultadosCliente.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-orange-50 text-sm"
                      onClick={() => seleccionarCliente(c)}
                    >
                      <span className="font-medium">{c.nombre}</span>
                      {c.correo && <span className="text-gray-400 ml-2 text-xs">{c.correo}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {clienteSeleccionado && (
              <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded px-3 py-2 text-sm">
                <Search className="h-4 w-4 text-orange-500" />
                <span className="font-medium text-orange-700">{clienteSeleccionado.nombre}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setNuevoPagoOpen(false)}>Cancelar</Button>
              <Button
                disabled={!clienteSeleccionado}
                onClick={confirmarCliente}
                className="bg-orange-600 hover:bg-orange-700"
              >
                Continuar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: formulario de pago */}
      {clienteSeleccionado && (
        <PagoForm
          open={pagoFormOpen}
          onOpenChange={setPagoFormOpen}
          onSubmit={guardarPago}
          asistencias={asistenciasCliente}
        />
      )}
    </div>
  )
}
