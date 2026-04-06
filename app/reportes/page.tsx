'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Search, Download } from 'lucide-react'
import * as XLSX from 'xlsx'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

export default function ReportesPage() {
  const [actividadQ, setActividadQ] = useState('')
  const [mesQ, setMesQ] = useState(String(new Date().getMonth() + 1))
  const [asistentes, setAsistentes] = useState<Record<string, string>[]>([])
  const [pagosData, setPagosData] = useState<{ pagos: Record<string, string>[]; total: number } | null>(null)
  const [cumpleaneros, setCumpleaneros] = useState<Record<string, string>[]>([])
  const [procedencias, setProcedencias] = useState<{ procedencia: string; cantidad: number }[]>([])
  const [loading, setLoading] = useState<string | null>(null)

  async function buscarAsistentes() {
    setLoading('asistentes')
    const res = await fetch(`/api/reportes?tipo=asistentes_actividad&actividad=${encodeURIComponent(actividadQ)}`)
    const data = await res.json()
    setAsistentes(data || [])
    setLoading(null)
  }

  async function buscarPagos() {
    setLoading('pagos')
    const res = await fetch(`/api/reportes?tipo=pagos_actividad&actividad=${encodeURIComponent(actividadQ)}`)
    const data = await res.json()
    setPagosData(data)
    setLoading(null)
  }

  async function buscarCumpleaneros() {
    setLoading('cumpleanos')
    const res = await fetch(`/api/reportes?tipo=cumpleanos_mes&mes=${mesQ}`)
    const data = await res.json()
    setCumpleaneros(data || [])
    setLoading(null)
  }

  async function buscarProcedencias() {
    setLoading('procedencias')
    const res = await fetch('/api/reportes?tipo=procedencias')
    const data = await res.json()
    setProcedencias(data || [])
    setLoading(null)
  }

  function exportar(data: Record<string, unknown>[], nombre: string) {
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte')
    XLSX.writeFile(wb, `${nombre}.xlsx`)
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Reportes</h2>
      </div>

      <Tabs defaultValue="asistentes">
        <TabsList className="mb-4">
          <TabsTrigger value="asistentes">Asistentes por actividad</TabsTrigger>
          <TabsTrigger value="pagos">Pagos por actividad</TabsTrigger>
          <TabsTrigger value="cumpleanos">Cumpleaños del mes</TabsTrigger>
          <TabsTrigger value="procedencias">Procedencias</TabsTrigger>
        </TabsList>

        <TabsContent value="asistentes">
          <Card>
            <CardHeader><CardTitle className="text-base">¿Quién asistió a una actividad?</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Nombre de la actividad..."
                  value={actividadQ}
                  onChange={e => setActividadQ(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && buscarAsistentes()}
                />
                <Button onClick={buscarAsistentes} disabled={loading === 'asistentes'}>
                  <Search className="h-4 w-4 mr-2" /> Buscar
                </Button>
              </div>
              {asistentes.length > 0 && (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">{asistentes.length} resultado(s)</p>
                    <Button size="sm" variant="outline" onClick={() => exportar(asistentes, `asistentes_${actividadQ}`)}>
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
              <div className="flex gap-2">
                <Input
                  placeholder="Nombre de la actividad..."
                  value={actividadQ}
                  onChange={e => setActividadQ(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && buscarPagos()}
                />
                <Button onClick={buscarPagos} disabled={loading === 'pagos'}>
                  <Search className="h-4 w-4 mr-2" /> Buscar
                </Button>
              </div>
              {pagosData && (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-emerald-700">
                      Total recaudado: ${pagosData.total.toLocaleString()}
                    </p>
                    <Button size="sm" variant="outline" onClick={() => exportar(pagosData.pagos, `pagos_${actividadQ}`)}>
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
              <div className="flex gap-2 items-end">
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
              {cumpleaneros.length > 0 ? (
                <ul className="space-y-2">
                  {cumpleaneros.map((c, i) => (
                    <li key={i} className="flex items-center justify-between text-sm border rounded-lg px-3 py-2">
                      <span className="font-medium">{c.nombre}</span>
                      <div className="flex items-center gap-4 text-gray-400">
                        <span>{c.telefono || c.correo || ''}</span>
                        <span>{c.cumpleanos}</span>
                      </div>
                    </li>
                  ))}
                </ul>
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
      </Tabs>
    </div>
  )
}
