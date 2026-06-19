'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Download, MessageSquare, Phone, Mail, RefreshCw } from 'lucide-react'
import * as XLSX from 'xlsx'

interface CobranzaCuota {
  cuota_id: string
  pago_id: string
  cliente_id: string
  cliente: string
  telefono: string | null
  correo: string | null
  actividad: string | null
  numero_cuota: number
  total_cuotas: number
  monto: number | null
  fecha_vencimiento: string
  dias_para_vencer: number
  semaforo: string
  estado: string
}

interface ResumenCliente {
  cliente_id: string
  cliente: string
  cuotas_pendientes: number
  total_por_cobrar: number | null
  proxima_fecha: string | null
  prioridad: number
}

interface CobranzaData {
  cuotas: CobranzaCuota[]
  clientes: ResumenCliente[]
  total: number
  vencido: number
  porVencer: number
}

function fmtFecha(d: string | null) {
  if (!d) return '—'
  return d.slice(0, 10).split('-').reverse().join('/')
}

function venceLabel(dias: number) {
  if (dias < 0) return `hace ${Math.abs(dias)}d`
  if (dias === 0) return 'hoy'
  return `en ${dias}d`
}

function dotColor(semaforo: string) {
  if (semaforo === 'rojo') return 'bg-red-500'
  if (semaforo === 'ambar') return 'bg-amber-500'
  return 'bg-green-500'
}

function textColor(semaforo: string) {
  if (semaforo === 'rojo') return 'text-red-600'
  if (semaforo === 'ambar') return 'text-amber-600'
  return 'text-gray-500'
}

// Mensaje de WhatsApp en tono PNL (sin negaciones), listo para enviar
function waLink(c: CobranzaCuota) {
  const fono = (c.telefono || '').replace(/\D/g, '')
  const primer = (c.cliente || '').split(' ')[0]
  const monto = c.monto ? `$${c.monto.toLocaleString('es-CL')}` : ''
  const msg = `Hola ${primer} 🌷 Te acompaño desde Renova PNL con tu cuota ${c.numero_cuota}/${c.total_cuotas} de ${c.actividad ?? ''} ${monto}, con fecha ${fmtFecha(c.fecha_vencimiento)}. ¿Coordinamos el siguiente paso para dejarla al día? Un abrazo 🧡`
  return `https://wa.me/${fono}?text=${encodeURIComponent(msg)}`
}

export default function CobranzaPage() {
  const [data, setData] = useState<CobranzaData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [filtro, setFiltro] = useState<'todas' | 'rojo' | 'ambar'>('todas')

  const cargar = useCallback(async () => {
    setLoading(true); setError(false)
    const res = await fetch('/api/cobranza')
    if (res.ok) setData(await res.json())
    else setError(true)
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const cuotas = data?.cuotas ?? []
  const cuotasFiltradas = filtro === 'todas' ? cuotas : cuotas.filter(c => c.semaforo === filtro)
  const nVencidas = cuotas.filter(c => c.semaforo === 'rojo').length
  const nPorVencer = cuotas.filter(c => c.semaforo === 'ambar').length

  function exportar() {
    const filas = cuotasFiltradas.map(c => ({
      'Cliente': c.cliente,
      'Teléfono': c.telefono || '',
      'Correo': c.correo || '',
      'Actividad': c.actividad || '',
      'Cuota': `${c.numero_cuota}/${c.total_cuotas}`,
      'Monto': c.monto ?? '',
      'Vencimiento': fmtFecha(c.fecha_vencimiento),
      'Estado': c.semaforo === 'rojo' ? 'Vencida' : c.semaforo === 'ambar' ? 'Por vencer' : 'Al día',
    }))
    const ws = XLSX.utils.json_to_sheet(filas)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Cobranza')
    XLSX.writeFile(wb, 'cobranza_cuotas.xlsx')
  }

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Cobranza por cuotas</h2>
          <p className="text-gray-500 text-sm mt-1">Cuotas por cobrar con semáforo y contacto rápido.</p>
        </div>
        <Button variant="outline" size="sm" onClick={cargar} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Actualizar
        </Button>
      </div>

      {/* KPIs */}
      {data && (
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3">
            <p className="text-xs text-orange-600">Total por cobrar</p>
            <p className="text-xl font-bold text-orange-700">${data.total.toLocaleString('es-CL')}</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <p className="text-xs text-red-600">Vencido ({nVencidas})</p>
            <p className="text-xl font-bold text-red-700">${data.vencido.toLocaleString('es-CL')}</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            <p className="text-xs text-amber-700">Por vencer ≤3 días ({nPorVencer})</p>
            <p className="text-xl font-bold text-amber-800">${data.porVencer.toLocaleString('es-CL')}</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
            <p className="text-xs text-gray-500">Clientes con cuotas</p>
            <p className="text-xl font-bold text-gray-700">{data.clientes.length}</p>
          </div>
        </div>
      )}

      {loading && <p className="text-sm text-gray-400 animate-pulse">Cargando cobranza...</p>}
      {error && <p className="text-sm text-gray-500">Tu perfil avanza con permiso de reportes para ver esta sección.</p>}

      {data && !loading && (
        <Tabs defaultValue="cuotas">
          <TabsList className="mb-4">
            <TabsTrigger value="cuotas">Por cuota ({cuotas.length})</TabsTrigger>
            <TabsTrigger value="clientes">Por cliente ({data.clientes.length})</TabsTrigger>
          </TabsList>

          {/* ─── Por cuota ─── */}
          <TabsContent value="cuotas">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
                <div className="flex gap-1">
                  <FiltroBtn activo={filtro === 'todas'} onClick={() => setFiltro('todas')}>Todas</FiltroBtn>
                  <FiltroBtn activo={filtro === 'rojo'} onClick={() => setFiltro('rojo')}>Vencidas</FiltroBtn>
                  <FiltroBtn activo={filtro === 'ambar'} onClick={() => setFiltro('ambar')}>Por vencer</FiltroBtn>
                </div>
                <Button size="sm" variant="outline" onClick={exportar} disabled={cuotasFiltradas.length === 0}>
                  <Download className="h-3 w-3 mr-1" /> Exportar Excel
                </Button>
              </CardHeader>
              <CardContent>
                {cuotasFiltradas.length === 0 ? (
                  <p className="text-sm text-gray-400 py-6 text-center">Sin cuotas por cobrar en este filtro. 🎉</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left p-2 font-medium text-gray-600">Cliente</th>
                          <th className="text-left p-2 font-medium text-gray-600">Actividad</th>
                          <th className="text-left p-2 font-medium text-gray-600">Cuota</th>
                          <th className="text-right p-2 font-medium text-gray-600">Monto</th>
                          <th className="text-left p-2 font-medium text-gray-600">Vence</th>
                          <th className="text-left p-2 font-medium text-gray-600">Contacto</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {cuotasFiltradas.map(c => (
                          <tr key={c.cuota_id} className="hover:bg-orange-50/40 transition-colors">
                            <td className="p-2 font-medium">
                              <a href={`/clientes/${c.cliente_id}`} className="hover:text-orange-600 hover:underline">{c.cliente}</a>
                            </td>
                            <td className="p-2 text-gray-600 max-w-[180px] truncate">{c.actividad || '—'}</td>
                            <td className="p-2 text-gray-500">{c.numero_cuota}/{c.total_cuotas}</td>
                            <td className="p-2 text-right font-semibold text-gray-800">
                              {c.monto ? `$${c.monto.toLocaleString('es-CL')}` : '—'}
                            </td>
                            <td className="p-2">
                              <span className="inline-flex items-center gap-1.5">
                                <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${dotColor(c.semaforo)}`} />
                                <span className="text-xs text-gray-400">{fmtFecha(c.fecha_vencimiento)}</span>
                                <span className={`text-xs font-medium ${textColor(c.semaforo)}`}>{venceLabel(c.dias_para_vencer)}</span>
                              </span>
                            </td>
                            <td className="p-2">
                              <div className="flex items-center gap-1">
                                {c.telefono && (
                                  <a href={waLink(c)} target="_blank" rel="noopener noreferrer" title="WhatsApp"
                                     className="p-1 rounded text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors">
                                    <MessageSquare size={13} />
                                  </a>
                                )}
                                {c.telefono && (
                                  <a href={`tel:${c.telefono}`} title="Llamar"
                                     className="p-1 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                                    <Phone size={13} />
                                  </a>
                                )}
                                {c.correo && (
                                  <a href={`https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(c.correo)}`}
                                     target="_blank" rel="noopener noreferrer" title="Enviar correo"
                                     className="p-1 rounded text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition-colors">
                                    <Mail size={13} />
                                  </a>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Por cliente ─── */}
          <TabsContent value="clientes">
            <Card>
              <CardHeader><CardTitle className="text-base">Resumen por cliente (prioridad de cobro)</CardTitle></CardHeader>
              <CardContent>
                {data.clientes.length === 0 ? (
                  <p className="text-sm text-gray-400 py-6 text-center">Sin clientes con cuotas por cobrar.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left p-2 font-medium text-gray-600">Cliente</th>
                          <th className="text-center p-2 font-medium text-gray-600">Cuotas</th>
                          <th className="text-right p-2 font-medium text-gray-600">Total por cobrar</th>
                          <th className="text-left p-2 font-medium text-gray-600">Próximo vencimiento</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {data.clientes.map(c => (
                          <tr key={c.cliente_id} className="hover:bg-orange-50/40 transition-colors">
                            <td className="p-2 font-medium">
                              <a href={`/clientes/${c.cliente_id}`} className="hover:text-orange-600 hover:underline">{c.cliente}</a>
                            </td>
                            <td className="p-2 text-center">
                              <Badge variant="secondary">{c.cuotas_pendientes}</Badge>
                            </td>
                            <td className="p-2 text-right font-semibold text-orange-700">
                              ${Number(c.total_por_cobrar || 0).toLocaleString('es-CL')}
                            </td>
                            <td className="p-2 text-gray-500">{fmtFecha(c.proxima_fecha)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

function FiltroBtn({ activo, onClick, children }: { activo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
        activo ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
      }`}
    >
      {children}
    </button>
  )
}
