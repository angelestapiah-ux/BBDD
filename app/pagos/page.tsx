'use client'

import { useEffect, useState, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PagoForm } from '@/components/clientes/PagoForm'
import Link from 'next/link'
import { Plus, Search, Receipt } from 'lucide-react'
import { toast } from 'sonner'
import { Asistencia, Cliente } from '@/lib/types'

interface PagoConCliente {
  id: string
  actividad_nombre: string
  monto: number | null
  fecha_pago: string | null
  metodo_pago: string | null
  estado: string
  notas: string | null
  requiere_factura: boolean
  cliente_id: string
  clientes: { nombre: string } | null
}

export default function PagosPage() {
  const [pagos, setPagos] = useState<PagoConCliente[]>([])
  const [loading, setLoading] = useState(true)

  // Nuevo pago desde esta página
  const [nuevoPagoOpen, setNuevoPagoOpen] = useState(false)
  const [busquedaCliente, setBusquedaCliente] = useState('')
  const [resultadosCliente, setResultadosCliente] = useState<Cliente[]>([])
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null)
  const [asistenciasCliente, setAsistenciasCliente] = useState<Asistencia[]>([])
  const [pagoFormOpen, setPagoFormOpen] = useState(false)
  const [buscando, setBuscando] = useState(false)

  const fetchPagos = useCallback(async () => {
    const res = await fetch('/api/pagos')
    if (res.ok) setPagos(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetchPagos() }, [fetchPagos])

  async function buscarCliente(q: string) {
    if (!q.trim()) { setResultadosCliente([]); return }
    setBuscando(true)
    const res = await fetch(`/api/clientes?q=${encodeURIComponent(q)}&limit=8`)
    if (res.ok) {
      const json = await res.json()
      setResultadosCliente(json.data || [])
    }
    setBuscando(false)
  }

  async function seleccionarCliente(cliente: Cliente) {
    setClienteSeleccionado(cliente)
    setResultadosCliente([])
    setBusquedaCliente(cliente.nombre)
    // Cargar asistencias del cliente
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

  async function guardarPago(data: Record<string, string | boolean>) {
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

  const total = pagos.filter(p => p.estado === 'pagado').reduce((s, p) => s + (p.monto || 0), 0)
  const totalPendiente = pagos.filter(p => p.estado === 'pendiente').reduce((s, p) => s + (p.monto || 0), 0)
  const totalParcial = pagos.filter(p => p.estado === 'parcial').reduce((s, p) => s + (p.monto || 0), 0)
  const countPendiente = pagos.filter(p => p.estado === 'pendiente').length
  const countParcial = pagos.filter(p => p.estado === 'parcial').length

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Pagos</h2>
          <p className="text-gray-500 text-sm mt-1">Registro de todos los pagos del sistema</p>
        </div>
        <Button onClick={abrirNuevoPago} className="bg-orange-600 hover:bg-orange-700">
          <Plus className="h-4 w-4 mr-2" /> Nuevo pago
        </Button>
      </div>

      {!loading && pagos.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <p className="text-sm text-orange-600">Total pagado</p>
            <p className="text-2xl font-bold text-orange-700">${total.toLocaleString()}</p>
          </div>
          {countPendiente > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-700">Pendientes ({countPendiente})</p>
              <p className="text-2xl font-bold text-yellow-800">${totalPendiente.toLocaleString()}</p>
            </div>
          )}
          {countParcial > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-700">Parciales ({countParcial})</p>
              <p className="text-2xl font-bold text-blue-800">${totalParcial.toLocaleString()}</p>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <p className="text-gray-400">Cargando...</p>
      ) : pagos.length === 0 ? (
        <p className="text-gray-400">No hay pagos registrados</p>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Cliente</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Actividad</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Monto</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Método</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pagos.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
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
                  <td className="px-4 py-3">{p.actividad_nombre}</td>
                  <td className="px-4 py-3">{p.monto ? `$${p.monto.toLocaleString()}` : '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{p.metodo_pago || '—'}</td>
                  <td className="px-4 py-3">
                    <Badge variant={p.estado === 'pagado' ? 'default' : p.estado === 'parcial' ? 'secondary' : 'outline'}>
                      {p.estado}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{p.fecha_pago || '—'}</td>
                  <td className="px-4 py-3">
                    <Link href={`/clientes/${p.cliente_id}`} className="text-xs text-orange-600 hover:underline">
                      Ver →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Dialog: seleccionar cliente */}
      <Dialog open={nuevoPagoOpen} onOpenChange={setNuevoPagoOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Nuevo pago — seleccionar cliente</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Buscar cliente</Label>
              <div className="relative">
                <Input
                  placeholder="Nombre, correo o teléfono..."
                  value={busquedaCliente}
                  onChange={e => {
                    setBusquedaCliente(e.target.value)
                    setClienteSeleccionado(null)
                    buscarCliente(e.target.value)
                  }}
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
