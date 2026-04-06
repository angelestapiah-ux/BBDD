'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface Resultado {
  total: number
  importados: number
  duplicados: number
  errores: string[]
}

export default function ImportarPage() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f && (f.name.endsWith('.xlsx') || f.name.endsWith('.xls'))) setFile(f)
    else toast.error('Solo se aceptan archivos Excel (.xlsx, .xls)')
  }

  async function handleImport() {
    if (!file) return
    setLoading(true)
    setResultado(null)
    const form = new FormData()
    form.append('file', file)
    const res = await fetch('/api/importar', { method: 'POST', body: form })
    const json = await res.json()
    setLoading(false)
    if (!res.ok) {
      toast.error(json.error || 'Error al importar')
      return
    }
    setResultado(json)
    toast.success(`Importación completada: ${json.importados} clientes nuevos`)
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Importar desde Excel</h2>
        <p className="text-gray-500 mt-1">
          Importa clientes desde los reportes de RENOVA. Se detectan automáticamente las columnas y hojas del archivo.
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Formato esperado</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-600 space-y-1">
          <p>El archivo puede tener una o varias hojas. En cada hoja se busca la fila con las columnas:</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {['Nombre', 'Correo', 'Teléfono', 'Comentario', 'Procedencia', 'Cumpleaños', 'Fecha incorporación', 'Asistencia actividad'].map(c => (
              <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>
            ))}
          </div>
          <p className="mt-2 text-gray-400">Los clientes duplicados (mismo correo o teléfono) se omiten automáticamente.</p>
        </CardContent>
      </Card>

      <div
        className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50 transition-colors mb-4"
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={e => setFile(e.target.files?.[0] || null)}
        />
        <FileSpreadsheet className="h-10 w-10 text-gray-300 mx-auto mb-3" />
        {file ? (
          <div>
            <p className="font-medium text-emerald-700">{file.name}</p>
            <p className="text-sm text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
        ) : (
          <div>
            <p className="font-medium text-gray-600">Arrastra el archivo aquí</p>
            <p className="text-sm text-gray-400 mt-1">o haz clic para seleccionar</p>
          </div>
        )}
      </div>

      <Button
        disabled={!file || loading}
        onClick={handleImport}
        className="w-full bg-emerald-600 hover:bg-emerald-700"
        size="lg"
      >
        <Upload className="h-4 w-4 mr-2" />
        {loading ? 'Importando...' : 'Importar clientes'}
      </Button>

      {resultado && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
              Resultado de importación
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-2xl font-bold text-gray-900">{resultado.total}</p>
                <p className="text-gray-500">Encontrados</p>
              </div>
              <div className="bg-emerald-50 rounded-lg p-3">
                <p className="text-2xl font-bold text-emerald-700">{resultado.importados}</p>
                <p className="text-emerald-600">Importados</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-3">
                <p className="text-2xl font-bold text-amber-700">{resultado.duplicados}</p>
                <p className="text-amber-600">Duplicados omitidos</p>
              </div>
            </div>
            {resultado.errores.length > 0 && (
              <div className="mt-4">
                <p className="flex items-center gap-1 font-medium text-red-600 mb-2">
                  <AlertCircle className="h-4 w-4" /> Errores ({resultado.errores.length})
                </p>
                <ul className="space-y-1 text-red-500">
                  {resultado.errores.map((e, i) => <li key={i}>• {e}</li>)}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
