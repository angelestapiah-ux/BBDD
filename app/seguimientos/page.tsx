'use client'

import { useEffect, useState, useRef } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

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

const TIPO_COLOR: Record<string, string> = {
  whatsapp: 'bg-green-100 text-green-700',
  llamada: 'bg-blue-100 text-blue-700',
  correo: 'bg-purple-100 text-purple-700',
  visita: 'bg-orange-100 text-orange-700',
  otro: 'bg-gray-100 text-gray-600',
}

interface ResultadoImport {
  importados: number
  actualizados: number
  noEncontrados: number
  errores: string[]
}

export default function SeguimientosPage() {
  const [items, setItems] = useState<SeguimientoConCliente[]>([])
  const [loading, setLoading] = useState(true)
  const [fileImport, setFileImport] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [resultado, setResultado] = useState<ResultadoImport | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/seguimientos')
      .then(r => r.json())
      .then(data => { setItems(data || []); setLoading(false) })
  }, [])

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
    // Recargar lista
    fetch('/api/seguimientos').then(r => r.json()).then(data => setItems(data || []))
  }

  function fmt(d: string) {
    try { return format(new Date(d), 'dd/MM/yyyy HH:mm', { locale: es }) }
    catch { return d }
  }

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Seguimientos</h2>
        <p className="text-gray-500 text-sm mt-1">Historial de contactos. Para agregar uno, ve al perfil del cliente o importa desde Excel.</p>
      </div>

      {/* Sección importar */}
      <Card className="mb-6">
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
                {resultado.actualizados > 0 && <span className="text-blue-700">{resultado.actualizados} comentarios actualizados</span>}
                {resultado.noEncontrados > 0 && <span className="text-red-600">{resultado.noEncontrados} clientes no encontrados</span>}
              </div>
              {resultado.errores.length > 0 && (
                <div className="mt-2">
                  <p className="flex items-center gap-1 text-red-600 font-medium"><AlertCircle className="h-3 w-3" /> Errores</p>
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

      {loading ? (
        <p className="text-gray-400">Cargando...</p>
      ) : items.length === 0 ? (
        <p className="text-gray-400">No hay seguimientos registrados</p>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Cliente</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Contacto</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Actividad</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Notas</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Responsable</th>
                <th className="px-4 py-3"></th>
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
                  <td className="px-4 py-3 font-medium whitespace-nowrap">{s.clientes?.nombre || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">
                    <div className="space-y-0.5">
                      {s.clientes?.correo && <div className="text-xs">{s.clientes.correo}</div>}
                      {s.clientes?.telefono && <div className="text-xs">{s.clientes.telefono}</div>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{s.actividad_nombre || '—'}</td>
                  <td className="px-4 py-3 max-w-xs">
                    <p className="truncate text-gray-700" title={s.notas}>{s.notas}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{s.usuario || '—'}</td>
                  <td className="px-4 py-3">
                    <Link href={`/clientes/${s.cliente_id}`} className="text-xs text-orange-600 hover:underline whitespace-nowrap">
                      Ver →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
