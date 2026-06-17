'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Download, Mail, Phone, MessageSquare } from 'lucide-react'
import * as XLSX from 'xlsx'
import { Actividad } from '@/lib/types'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

export default function ReportesPage() {
  const [actividadQ, setActividadQ] = useState('')
  const [mesQ, setMesQ] = useState(String(new Date().getMonth() + 1))
  const [asistentes, setAsistentes] = useState<Record<string, string>[]>([])
  const [pagosData, setPagosData] = useState<{ pagos: Record<string, string>[]; total: number } | null>(null)
  const [cumpleaneros, setCumpleaneros] = useState<Record<string, string>[]>([])
  const [procedencias, setProcedencias] = useState<{ procedencia: string; cantidad: number }[]>([])
  const [pendientesData, setPendientesData] = useState<{ pagos: Record<string, unknown>[]; total: number } | null>(null)
  const [facturacionData, setFacturacionData] = useState<{ pagos: Record<string, unknown>[]; total: number; pendientes: number } | null>(null)
  const [sinContacto, setSinContacto] = useState<{ clientes: Record<string, string>[]; total: number } | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [actividades, setActividades] = useState<Actividad[]>([])

  useEffect(() => {
    fetch('/api/actividades').then(r => r.json()).then(d => setActividades(Array.isArray(d) ? d : []))
  }, [])

  async function buscarAsistentes() {
    setLoading('asistentes')
    const res = await fetch(`/api/reportes?tipo=asistentes_actividad&actividad=${encodeURIComponent(actividadQ)}`)
    setAsistentes(await res.json() || [])
    setLoading(null)
  }

  async function buscarPagos() {
    setLoading('pagos')
    const res = await fetch(`/api/reportes?tipo=pagos_actividad&actividad=${encodeURIComponent(actividadQ)}`)
    setPagosData(await res.json())
    setLoading(null)
  }

  async function buscarCumpleaneros() {
    setLoading('cumpleanos')
    const res = await fetch(`/api/reportes?tipo=cumpleanos_mes&mes=${mesQ}`)
    setCumpleaneros(await res.json() || [])
    setLoading(null)
  }

  async function cargarPendientes() {
    setLoading('pendientes')
    const res = await fetch('/api/reportes?tipo=pagos_pendientes')
    setPendientesData(await res.json())
    setLoading(null)
  }

  function exportarPendientes(data: Record<string, unknown>[], nombre: string) {
    const filas = data.map(p => ({
      'Cliente': (p.clientes as Record<string, string>)?.nombre || '—',
      'Correo': (p.clientes as Record<string, string>)?.correo || '',
      'Teléfono': (p.clientes as Record<string, string>)?.telefono || '',
      'Actividad': p.actividad_nombre as string || '',
      'Monto': p.monto ?? '',
      'Estado': p.estado as string || '',
      'Fecha pago': p.fecha_pago as string || '',
      'Notas': p.notas as string || '',
    }))
    const ws = XLSX.utils.json_to_sheet(filas)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Por cobrar')
    XLSX.writeFile(wb, `${nombre}.xlsx`)
  }

  async function cargarFacturacion() {
    setLoading('facturacion')
    const res = await fetch('/api/reportes?tipo=facturacion')
    setFacturacionData(await res.json())
    setLoading(null)
  }

  function exportarFacturacion(data: Record<string, unknown>[], nombre: string) {
    const filas = data.map(p => ({
      'Cliente': (p.clientes as Record<string, string>)?.nombre || '—',
      'RUT': (p.clientes as Record<string, string>)?.documento_identidad || '',
      'Actividad': p.actividad_nombre as string || '',
      'Monto': p.monto ?? '',
      'Método': p.metodo_pago as string || '',
      'Fecha pago': p.fecha_pago as string || '',
      'Fecha actividad': p.fecha_actividad as string || '',
      'Requiere factura': p.requiere_factura ? 'Sí' : 'No',
      'N° factura': p.numero_factura as string || '',
      'Facturación interna': p.factura_interna as string || '',
    }))
    const ws = XLSX.utils.json_to_sheet(filas)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Facturación')
    XLSX.writeFile(wb, `${nombre}.xlsx`)
  }

  async function buscarProcedencias() {
    setLoading('procedencias')
    const res = await fetch('/api/reportes?tipo=procedencias')
    setProcedencias(await res.json() || [])
    setLoading(null)
  }

  async function cargarSinContacto() {
    setLoading('sin_contacto')
    const res = await fetch('/api/reportes/sin-contacto')
    setSinContacto(await res.json())
    setLoading(null)
  }

  function exportarSinContacto(data: Record<string, string>[]) {
    const filas = data.map(c => ({ 'Cliente': c.nombre || '—', 'Procedencia': c.procedencia || '' }))
    const ws = XLSX.utils.json_to_sheet(filas)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Sin contacto')
    XLSX.writeFile(wb, 'clientes_sin_contacto.xlsx')
  }

  function exportarAsistentes(data: Record<string, unknown>[], nombre: string) {
    const filas = data.map(a => ({
      'Cliente': (a.clientes as Record<string, string>)?.nombre || '—',
      'Correo': (a.clientes as Record<string, string>)?.correo || '',
      'Teléfono': (a.clientes as Record<string, string>)?.telefono || '',
      'Actividad': a.actividad_nombre || '',
      'Fecha': a.fecha_asistencia || '',
    }))
    const ws = XLSX.utils.json_to_sheet(filas)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte')
    XLSX.writeFile(wb, `${nombre}.xlsx`)
  }

  function exportarPagos(data: Record<string, unknown>[], nombre: string) {
    const filas = data.map(p => ({
      'Cliente': (p.clientes as Record<string, string>)?.nombre || '—',
      'Correo': (p.clientes as Record<string, string>)?.correo || '',
      'Teléfono': (p.clientes as Record<string, string>)?.telefono || '',
      'Actividad': p.actividad_nombre || '',
      'Monto': p.monto ?? '',
      'Fecha': p.fecha_pago || '',
      'Método': p.metodo_pago || '',
      'Estado': p.estado || '',
      'Notas': p.notas || '',
    }))
    const ws = XLSX.utils.json_to_sheet(filas)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte')
    XLSX.writeFile(wb, `${nombre}.xlsx`)
  }

  function exportar(data: Record<string, unknown>[], nombre: string) {
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte')
    XLSX.writeFile(wb, `${nombre}.xlsx`)
  }

  // Selector de actividad compartido para asistentes y pagos
  function SelectorActividad({ onBuscar }: { onBuscar: () => void }) {
    return (
      <div className="flex gap-2 flex-wrap">
        <div className="flex-1 min-w-48">
          <Select value={actividadQ || '__todas__'} onValueChange={v => setActividadQ(v === '__todas__' ? '' : (v || ''))}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar del catálogo..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__todas__">— Todas las actividades —</SelectItem>
              {actividades.map(a => (
                <SelectItem key={a.id} value={a.nombre}>{a.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 min-w-40">
          <Input
            placeholder="O escribe para filtrar..."
            value={actividadQ}
            onChange={e => setActividadQ(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onBuscar()}
          />
        </div>
        <Button onClick={onBuscar}>
          <Search className="h-4 w-4 mr-2" /> Buscar
        </Button>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Reportes</h2>
      </div>

      <Tabs defaultValue="pendientes">
        <TabsList className="mb-4 flex-wrap h-auto gap-1">
          <TabsTrigger value="pendientes" className="text-orange-700 data-[state=active]:bg-orange-600 data-[state=active]:text-white">💰 Por cobrar</TabsTrigger>
          <TabsTrigger value="asistentes">Asistentes por actividad</TabsTrigger>
          <TabsTrigger value="pagos">Pagos por actividad</TabsTrigger>
          <TabsTrigger value="cumpleanos">Cumpleaños del mes</TabsTrigger>
          <TabsTrigger value="procedencias">Procedencias</TabsTrigger>
          <TabsTrigger value="facturacion">🧾 Facturación</TabsTrigger>
          <TabsTrigger value="sin_contacto">📇 Sin contacto</TabsTrigger>
        </TabsList>

        {/* ─── Facturación (SII) ──────────────────────────────────────── */}
        <TabsContent value="facturacion">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Registro de facturación</CardTitle>
                <p className="text-xs text-gray-400 mt-0.5">
                  Pagos con factura solicitada, factura emitida o folio de facturación interna (SII)
                </p>
              </div>
              <Button onClick={cargarFacturacion} size="sm" disabled={loading === 'facturacion'}>
                <Search className="h-4 w-4 mr-2" /> {loading === 'facturacion' ? 'Cargando...' : 'Cargar'}
              </Button>
            </CardHeader>
            <CardContent>
              {!facturacionData && loading !== 'facturacion' && (
                <p className="text-sm text-gray-400">Haz clic en Cargar para ver el registro de facturación</p>
              )}
              {loading === 'facturacion' && <p className="text-sm text-gray-400 animate-pulse">Cargando...</p>}
              {facturacionData && (
                <>
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-sm font-semibold text-orange-700">
                        Total facturable: ${facturacionData.total.toLocaleString('es-CL')}
                      </span>
                      <Badge variant="secondary">{facturacionData.pagos.length} registro{facturacionData.pagos.length !== 1 ? 's' : ''}</Badge>
                      {facturacionData.pendientes > 0 && (
                        <Badge variant="outline" className="border-yellow-400 text-yellow-700">
                          {facturacionData.pendientes} factura{facturacionData.pendientes === 1 ? '' : 's'} sin emitir
                        </Badge>
                      )}
                    </div>
                    <Button size="sm" variant="outline" onClick={() => exportarFacturacion(facturacionData.pagos, 'facturacion')}>
                      <Download className="h-3 w-3 mr-1" /> Exportar Excel
                    </Button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-orange-50">
                        <tr>
                          <th className="text-left p-2 font-medium text-gray-600">Cliente</th>
                          <th className="text-left p-2 font-medium text-gray-600">RUT</th>
                          <th className="text-left p-2 font-medium text-gray-600">Actividad</th>
                          <th className="text-right p-2 font-medium text-gray-600">Monto</th>
                          <th className="text-left p-2 font-medium text-gray-600">Fecha pago</th>
                          <th className="text-left p-2 font-medium text-gray-600">N° factura</th>
                          <th className="text-left p-2 font-medium text-gray-600">Fact. interna</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {facturacionData.pagos.map((p, i) => {
                          const cliente = p.clientes as Record<string, string> | null
                          const sinEmitir = p.requiere_factura && !p.numero_factura
                          return (
                            <tr key={i} className={`hover:bg-orange-50/40 transition-colors ${sinEmitir ? 'bg-yellow-50/40' : ''}`}>
                              <td className="p-2 font-medium">
                                {cliente?.id ? (
                                  <a href={`/clientes/${cliente.id}`} className="hover:text-orange-600 hover:underline">
                                    {cliente.nombre || '—'}
                                  </a>
                                ) : (cliente?.nombre || '—')}
                              </td>
                              <td className="p-2 text-gray-500">{cliente?.documento_identidad || '—'}</td>
                              <td className="p-2 text-gray-600 max-w-[160px] truncate">{p.actividad_nombre as string || '—'}</td>
                              <td className="p-2 text-right font-semibold">
                                {p.monto ? `$${Number(p.monto).toLocaleString('es-CL')}` : '—'}
                              </td>
                              <td className="p-2 text-gray-500">{(p.fecha_pago as string) || '—'}</td>
                              <td className="p-2">
                                {p.numero_factura ? (
                                  <span className="font-medium text-green-700">{p.numero_factura as string}</span>
                                ) : p.requiere_factura ? (
                                  <span className="text-xs text-yellow-700 font-medium">⚠ sin emitir</span>
                                ) : '—'}
                              </td>
                              <td className="p-2 text-gray-500">{(p.factura_interna as string) || '—'}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Por cobrar ─────────────────────────────────────────────── */}
        <TabsContent value="pendientes">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Pagos pendientes y parciales</CardTitle>
                <p className="text-xs text-gray-400 mt-0.5">Todos los pagos sin confirmar — ordenados por monto</p>
              </div>
              <Button onClick={cargarPendientes} size="sm" disabled={loading === 'pendientes'}>
                <Search className="h-4 w-4 mr-2" /> {loading === 'pendientes' ? 'Cargando...' : 'Cargar'}
              </Button>
            </CardHeader>
            <CardContent>
              {!pendientesData && loading !== 'pendientes' && (
                <p className="text-sm text-gray-400">Haz clic en Cargar para ver los pagos por cobrar</p>
              )}
              {loading === 'pendientes' && <p className="text-sm text-gray-400 animate-pulse">Cargando...</p>}
              {pendientesData && (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-orange-700">
                        Total por cobrar: ${pendientesData.total.toLocaleString('es-CL')}
                      </span>
                      <Badge variant="secondary">{pendientesData.pagos.length} registro{pendientesData.pagos.length !== 1 ? 's' : ''}</Badge>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => exportarPendientes(pendientesData.pagos, 'por_cobrar')}>
                      <Download className="h-3 w-3 mr-1" /> Exportar Excel
                    </Button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-orange-50">
                        <tr>
                          <th className="text-left p-2 font-medium text-gray-600">Cliente</th>
                          <th className="text-left p-2 font-medium text-gray-600">Actividad</th>
                          <th className="text-right p-2 font-medium text-gray-600">Monto</th>
                          <th className="text-left p-2 font-medium text-gray-600">Estado</th>
                          <th className="text-left p-2 font-medium text-gray-600">Contacto</th>
                          <th className="text-left p-2 font-medium text-gray-600">Notas</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {pendientesData.pagos.map((p, i) => {
                          const cliente = p.clientes as Record<string, string> | null
                          return (
                            <tr key={i} className="hover:bg-orange-50/40 transition-colors">
                              <td className="p-2 font-medium">
                                {cliente?.id ? (
                                  <a href={`/clientes/${cliente.id}`} className="hover:text-orange-600 hover:underline">
                                    {cliente.nombre || '—'}
                                  </a>
                                ) : (cliente?.nombre || '—')}
                              </td>
                              <td className="p-2 text-gray-600">{p.actividad_nombre as string || '—'}</td>
                              <td className="p-2 text-right font-semibold text-gray-800">
                                {p.monto ? `$${Number(p.monto).toLocaleString('es-CL')}` : '—'}
                              </td>
                              <td className="p-2">
                                <Badge variant={p.estado === 'parcial' ? 'outline' : 'secondary'} className={p.estado === 'parcial' ? 'border-yellow-400 text-yellow-700' : ''}>
                                  {p.estado as string}
                                </Badge>
                              </td>
                              <td className="p-2">
                                <div className="flex items-center gap-1">
                                  {cliente?.telefono && (
                                    <a
                                      href={`https://wa.me/${(cliente.telefono).replace(/\D/g, '')}`}
                                      target="_blank" rel="noopener noreferrer"
                                      title="WhatsApp"
                                      className="p-1 rounded text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                                    >
                                      <MessageSquare size={13} />
                                    </a>
                                  )}
                                  {cliente?.telefono && (
                                    <a
                                      href={`tel:${cliente.telefono}`}
                                      title="Llamar"
                                      className="p-1 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                    >
                                      <Phone size={13} />
                                    </a>
                                  )}
                                  {cliente?.correo && (
                                    <a
                                      href={`https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(cliente.correo)}`}
                                      target="_blank" rel="noopener noreferrer"
                                      title="Enviar correo"
                                      className="p-1 rounded text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                                    >
                                      <Mail size={13} />
                                    </a>
                                  )}
                                </div>
                              </td>
                              <td className="p-2 text-gray-400 text-xs max-w-[180px] truncate">{p.notas as string || '—'}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="asistentes">
          <Card>
            <CardHeader><CardTitle className="text-base">¿Quién asistió a una actividad?</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <SelectorActividad onBuscar={buscarAsistentes} />
              {loading === 'asistentes' && <p className="text-sm text-gray-400">Buscando...</p>}
              {asistentes.length > 0 && (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">{asistentes.length} resultado(s)</p>
                    <Button size="sm" variant="outline" onClick={() => exportarAsistentes(asistentes, `asistentes_${actividadQ}`)}>
                      <Download className="h-3 w-3 mr-1" /> Exportar Excel
                    </Button>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-2 font-medium text-gray-600">Cliente</th>
                        <th className="text-left p-2 font-medium text-gray-600">Actividad</th>
                        <th className="text-left p-2 font-medium text-gray-600">Fecha</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {asistentes.map((a, i) => (
                        <tr key={i}>
                          <td className="p-2">{(a.clientes as unknown as Record<string, string>)?.nombre || '—'}</td>
                          <td className="p-2">{a.actividad_nombre}</td>
                          <td className="p-2 text-gray-400">{a.fecha_asistencia || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pagos">
          <Card>
            <CardHeader><CardTitle className="text-base">Pagos por actividad</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <SelectorActividad onBuscar={buscarPagos} />
              {loading === 'pagos' && <p className="text-sm text-gray-400">Buscando...</p>}
              {pagosData && (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-orange-700">
                      Total recaudado: ${pagosData.total.toLocaleString()}
                    </p>
                    <Button size="sm" variant="outline" onClick={() => exportarPagos(pagosData.pagos, `pagos_${actividadQ}`)}>
                      <Download className="h-3 w-3 mr-1" /> Exportar Excel
                    </Button>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-2 font-medium text-gray-600">Cliente</th>
                        <th className="text-left p-2 font-medium text-gray-600">Actividad</th>
                        <th className="text-left p-2 font-medium text-gray-600">Monto</th>
                        <th className="text-left p-2 font-medium text-gray-600">Estado</th>
                        <th className="text-left p-2 font-medium text-gray-600">Comentarios</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {pagosData.pagos.map((p, i) => (
                        <tr key={i}>
                          <td className="p-2">{(p.clientes as unknown as Record<string, string>)?.nombre || '—'}</td>
                          <td className="p-2">{p.actividad_nombre}</td>
                          <td className="p-2">{p.monto ? `$${Number(p.monto).toLocaleString()}` : '—'}</td>
                          <td className="p-2">
                            <Badge variant={p.estado === 'pagado' ? 'default' : 'secondary'}>{p.estado}</Badge>
                          </td>
                          <td className="p-2 text-gray-500">{p.notas || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cumpleanos">
          <Card>
            <CardHeader><CardTitle className="text-base">Cumpleaños del mes</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2 items-end flex-wrap">
                <div>
                  <Label>Mes</Label>
                  <select
                    className="mt-1 block border border-gray-200 rounded-md px-3 py-2 text-sm"
                    value={mesQ}
                    onChange={e => setMesQ(e.target.value)}
                  >
                    {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                <Button onClick={buscarCumpleaneros} disabled={loading === 'cumpleanos'}>
                  <Search className="h-4 w-4 mr-2" /> Buscar
                </Button>
                {cumpleaneros.length > 0 && (
                  <Button size="sm" variant="outline" onClick={() => exportar(cumpleaneros, `cumpleanos_${MESES[parseInt(mesQ)-1]}`)}>
                    <Download className="h-3 w-3 mr-1" /> Exportar
                  </Button>
                )}
              </div>
              {loading === 'cumpleanos' && <p className="text-sm text-gray-400">Buscando...</p>}
              {cumpleaneros.length > 0 ? (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-2 font-medium text-gray-600">Nombre</th>
                      <th className="text-left p-2 font-medium text-gray-600">Correo</th>
                      <th className="text-left p-2 font-medium text-gray-600">Teléfono</th>
                      <th className="text-left p-2 font-medium text-gray-600">Cumpleaños</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {cumpleaneros.map((c, i) => (
                      <tr key={i}>
                        <td className="p-2 font-medium">{c.nombre}</td>
                        <td className="p-2 text-gray-500">{c.correo || '—'}</td>
                        <td className="p-2 text-gray-500">{c.telefono || '—'}</td>
                        <td className="p-2 text-gray-400">{c.cumpleanos}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-gray-400">Haz clic en Buscar para ver los cumpleaños del mes</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="procedencias">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Origen de clientes</CardTitle>
              <Button onClick={buscarProcedencias} size="sm" disabled={loading === 'procedencias'}>
                <Search className="h-4 w-4 mr-2" /> Cargar
              </Button>
            </CardHeader>
            <CardContent>
              {procedencias.length === 0 ? (
                <p className="text-sm text-gray-400">Haz clic en Cargar para ver las procedencias</p>
              ) : (
                <ul className="space-y-2">
                  {procedencias.map((p, i) => (
                    <li key={i} className="flex items-center justify-between text-sm">
                      <span className="font-medium">{p.procedencia}</span>
                      <Badge variant="secondary">{p.cantidad} clientes</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        {/* ─── Clientes sin datos de contacto ─────────────────────────── */}
        <TabsContent value="sin_contacto">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Clientes sin datos de contacto</CardTitle>
                <p className="text-xs text-gray-400 mt-0.5">Sin teléfono ni correo (ni los secundarios) — para completar su perfil</p>
              </div>
              <Button onClick={cargarSinContacto} size="sm" disabled={loading === 'sin_contacto'}>
                <Search className="h-4 w-4 mr-2" /> {loading === 'sin_contacto' ? 'Cargando...' : 'Cargar'}
              </Button>
            </CardHeader>
            <CardContent>
              {!sinContacto && loading !== 'sin_contacto' && (
                <p className="text-sm text-gray-400">Haz clic en Cargar para ver los clientes sin contacto</p>
              )}
              {loading === 'sin_contacto' && <p className="text-sm text-gray-400 animate-pulse">Cargando...</p>}
              {sinContacto && (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant="secondary">{sinContacto.total} cliente{sinContacto.total === 1 ? '' : 's'} sin contacto</Badge>
                    {sinContacto.total > 0 && (
                      <Button size="sm" variant="outline" onClick={() => exportarSinContacto(sinContacto.clientes)}>
                        <Download className="h-3 w-3 mr-1" /> Exportar Excel
                      </Button>
                    )}
                  </div>
                  {sinContacto.total === 0 ? (
                    <p className="text-sm text-green-600">Todos los clientes tienen al menos un dato de contacto.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left p-2 font-medium text-gray-600">Cliente</th>
                            <th className="text-left p-2 font-medium text-gray-600">Canal</th>
                            <th className="text-right p-2 font-medium text-gray-600">Completar</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {sinContacto.clientes.map((c, i) => (
                            <tr key={i} className="hover:bg-gray-50 transition-colors">
                              <td className="p-2 font-medium">
                                <a href={`/clientes/${c.id}`} className="hover:text-orange-600 hover:underline">{c.nombre || '—'}</a>
                              </td>
                              <td className="p-2">
                                {c.procedencia ? <Badge variant="secondary" className="text-xs">{c.procedencia}</Badge> : <span className="text-gray-300 text-xs">—</span>}
                              </td>
                              <td className="p-2 text-right">
                                <a href={`/clientes/${c.id}`} className="text-xs text-orange-600 hover:underline">Abrir ficha</a>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
