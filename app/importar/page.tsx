'use client'

import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Download, Eye, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

// ─── Tipos ─────────────────────────────────────────────────────────────────────

interface Resultado {
  total: number
  importados: number
  actualizados: number
  errores: string[]
}

interface FilaPreview {
  Nombre?: string
  Correo?: string
  Teléfono?: string
  Procedencia?: string
  'Etapa Funnel'?: string
  Comentario?: string
  [key: string]: string | undefined
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Clasifica una columna del Excel en tres categorías:
 * - 'clave'       → campos principales que el usuario debe conocer
 * - 'adicional'   → campos reconocidos por el importador pero menos frecuentes
 * - 'desconocida' → no se importará, se ignorará
 */
function clasificarColumna(header: string): 'clave' | 'adicional' | 'desconocida' {
  const key = header.toLowerCase().trim()

  // ── Columnas CLAVE ────────────────────────────────────────────────────
  if (key.includes('nombre')) return 'clave'
  if (key.includes('correo') && !key.includes('2') && !key.includes('two') && !key.includes('segundo')) return 'clave'
  if ((key.includes('tel') || key.includes('fono')) && !key.includes('2') && !key.includes('two') && !key.includes('segundo')) return 'clave'
  if (key.includes('procedencia')) return 'clave'
  if (key.includes('etapa') || key.includes('funnel')) return 'clave'
  if (key.includes('comentario') || key.includes('contacto')) return 'clave'

  // ── Columnas ADICIONALES ──────────────────────────────────────────────
  if (key.includes('correo') && (key.includes('2') || key.includes('two') || key.includes('segundo'))) return 'adicional'
  if ((key.includes('tel') || key.includes('fono')) && (key.includes('2') || key.includes('two') || key.includes('segundo'))) return 'adicional'
  if (key.includes('género') || key.includes('genero')) return 'adicional'
  if (key.includes('tipo')) return 'adicional'
  if (key.includes('modalidad')) return 'adicional'
  if (key.includes('terapeuta')) return 'adicional'
  if (key.includes('edad')) return 'adicional'
  if (key.includes('rut') || key.includes('dni') || key.includes('pasaporte') || key.includes('documento')) return 'adicional'
  if (key.includes('estado')) return 'adicional'
  if (key.includes('profesi')) return 'adicional'
  if (key.includes('ciudad')) return 'adicional'
  if (key.includes('país') || key.includes('pais')) return 'adicional'
  if (key.includes('cumplea')) return 'adicional'
  if (key.includes('incorporaci')) return 'adicional'
  if (key.includes('asistencia')) return 'adicional'

  return 'desconocida'
}

function parsearExcel(file: File): Promise<FilaPreview[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })

        const todasLasFilas: FilaPreview[] = []
        for (const sheetName of wb.SheetNames) {
          const ws = wb.Sheets[sheetName]
          const rows = XLSX.utils.sheet_to_json<FilaPreview>(ws, { defval: '' })
          todasLasFilas.push(...rows)
        }
        resolve(todasLasFilas)
      } catch {
        reject(new Error('No se pudo leer el archivo Excel'))
      }
    }
    reader.onerror = () => reject(new Error('Error al leer el archivo'))
    reader.readAsArrayBuffer(file)
  })
}

// ─── Componente ────────────────────────────────────────────────────────────────

export default function ImportarPage() {
  const [file, setFile] = useState<File | null>(null)
  const [step, setStep] = useState<'select' | 'preview' | 'result'>('select')
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [loadingImport, setLoadingImport] = useState(false)
  const [previews, setPreviews] = useState<FilaPreview[]>([])
  const [totalFilas, setTotalFilas] = useState(0)
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // ── Drag & drop ──────────────────────────────────────────────────────────────

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f && (f.name.endsWith('.xlsx') || f.name.endsWith('.xls'))) {
      setFile(f)
      setStep('select')
    } else {
      toast.error('Solo se aceptan archivos Excel (.xlsx, .xls)')
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null
    setFile(f)
    setStep('select')
    setPreviews([])
    setResultado(null)
  }

  // ── Previsualizar ────────────────────────────────────────────────────────────

  async function handlePreview() {
    if (!file) return
    setLoadingPreview(true)
    try {
      const filas = await parsearExcel(file)
      setTotalFilas(filas.length)
      // Mostrar solo las primeras 10 filas en la preview
      setPreviews(filas.slice(0, 10))
      setStep('preview')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al leer el archivo')
    } finally {
      setLoadingPreview(false)
    }
  }

  // ── Importar ─────────────────────────────────────────────────────────────────

  async function handleImport() {
    if (!file) return
    setLoadingImport(true)
    const form = new FormData()
    form.append('file', file)
    const res = await fetch('/api/importar', { method: 'POST', body: form })
    const json = await res.json()
    setLoadingImport(false)
    if (!res.ok) {
      toast.error(json.error || 'Error al importar')
      return
    }
    setResultado(json)
    setStep('result')
    toast.success(`Importación completada: ${json.importados} clientes nuevos`)
  }

  // ── Resetear ─────────────────────────────────────────────────────────────────

  function handleReset() {
    setFile(null)
    setStep('select')
    setPreviews([])
    setResultado(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  // ── Clasificar columnas del archivo en preview ───────────────────────────────

  const todasLasColumnas: string[] = previews.length > 0 ? Object.keys(previews[0]) : []
  const columnasClavePresentes    = todasLasColumnas.filter(c => clasificarColumna(c) === 'clave')
  const columnasAdicionalesPresentes = todasLasColumnas.filter(c => clasificarColumna(c) === 'adicional')
  const columnasDesconocidas      = todasLasColumnas.filter(c => clasificarColumna(c) === 'desconocida')
  const columnasParaPreview       = [...columnasClavePresentes, ...columnasAdicionalesPresentes]
  const hayColumnasReconocidas    = columnasParaPreview.length > 0

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-4xl">

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Importar desde Excel</h2>
          <p className="text-gray-500 mt-1">
            Importa clientes desde los reportes de RENOVA. Se detectan automáticamente las columnas y hojas del archivo.
          </p>
        </div>
        <a href="/api/plantilla" download>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" /> Descargar plantilla
          </Button>
        </a>
      </div>

      {/* ─── PASO 1: Selección de archivo ─────────────────────────────────── */}
      {(step === 'select' || step === 'preview') && (
        <>
          {/* Formato esperado */}
          {step === 'select' && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-base">Formato esperado</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-600 space-y-1">
                <p>El archivo puede tener una o varias hojas. En cada hoja se busca la fila con las columnas:</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {['Nombre', 'Correo', 'Teléfono', 'Procedencia', 'Etapa Funnel', 'Cumpleaños', 'Fecha incorporación', 'Asistencia actividad', 'Comentario'].map(c => (
                    <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>
                  ))}
                </div>
                <p className="mt-2 text-gray-400">Si el cliente ya existe (mismo correo, teléfono o nombre), se enriquece con los datos nuevos sin sobrescribir los existentes.</p>
              </CardContent>
            </Card>
          )}

          {/* Zona de drop */}
          {step === 'select' && (
            <div
              className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-colors mb-4"
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => inputRef.current?.click()}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleFileChange}
              />
              <FileSpreadsheet className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              {file ? (
                <div>
                  <p className="font-medium text-orange-700">{file.name}</p>
                  <p className="text-sm text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div>
                  <p className="font-medium text-gray-600">Arrastra el archivo aquí</p>
                  <p className="text-sm text-gray-400 mt-1">o haz clic para seleccionar</p>
                </div>
              )}
            </div>
          )}

          {/* Botón previsualizar */}
          {step === 'select' && (
            <Button
              disabled={!file || loadingPreview}
              onClick={handlePreview}
              className="w-full bg-orange-600 hover:bg-orange-700"
              size="lg"
            >
              <Eye className="h-4 w-4 mr-2" />
              {loadingPreview ? 'Leyendo archivo...' : 'Previsualizar importación'}
            </Button>
          )}

          {/* ─── PASO 2: Preview ────────────────────────────────────────────── */}
          {step === 'preview' && (
            <>
              {/* Resumen del archivo */}
              <div className="flex items-center gap-3 mb-4">
                <Button variant="ghost" size="sm" onClick={() => setStep('select')}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Cambiar archivo
                </Button>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <FileSpreadsheet className="h-4 w-4 text-orange-500" />
                  <span className="font-medium text-orange-700">{file?.name}</span>
                  <span className="text-gray-400">·</span>
                  <span><strong>{totalFilas}</strong> filas encontradas</span>
                  {totalFilas > 10 && (
                    <span className="text-gray-400">(mostrando primeras 10)</span>
                  )}
                </div>
              </div>

              {/* Columnas detectadas */}
              <Card className="mb-4">
                <CardContent className="pt-4 space-y-3">
                  {!hayColumnasReconocidas && (
                    <p className="text-sm text-red-500">No se detectaron columnas reconocidas. Verifica el formato del archivo.</p>
                  )}

                  {columnasClavePresentes.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">Columnas principales</p>
                      <div className="flex flex-wrap gap-1.5">
                        {columnasClavePresentes.map(c => (
                          <Badge key={c} className="bg-orange-100 text-orange-800 hover:bg-orange-100 text-xs">{c}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {columnasAdicionalesPresentes.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">Columnas adicionales reconocidas</p>
                      <div className="flex flex-wrap gap-1.5">
                        {columnasAdicionalesPresentes.map(c => (
                          <Badge key={c} className="bg-blue-50 text-blue-700 hover:bg-blue-50 text-xs border border-blue-200">{c}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {columnasDesconocidas.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">
                        Columnas no reconocidas
                        <span className="ml-1 normal-case font-normal text-gray-400">(se ignorarán)</span>
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {columnasDesconocidas.map(c => (
                          <Badge key={c} variant="outline" className="text-gray-400 border-gray-200 text-xs line-through">{c}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Tabla de preview */}
              {columnasParaPreview.length > 0 && (
                <Card className="mb-4 overflow-hidden">
                  <CardHeader className="py-3 px-4 border-b bg-gray-50">
                    <CardTitle className="text-sm font-medium text-gray-700">Vista previa de datos</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b">
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">#</th>
                          {columnasClavePresentes.map(col => (
                            <th key={col} className="px-3 py-2 text-left text-xs font-semibold text-orange-600 whitespace-nowrap">{col}</th>
                          ))}
                          {columnasAdicionalesPresentes.map(col => (
                            <th key={col} className="px-3 py-2 text-left text-xs font-semibold text-blue-500 whitespace-nowrap">{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previews.map((fila, i) => (
                          <tr key={i} className="border-b hover:bg-gray-50">
                            <td className="px-3 py-2 text-gray-400 text-xs">{i + 1}</td>
                            {columnasParaPreview.map(col => (
                              <td key={col} className="px-3 py-2 text-gray-700 whitespace-nowrap max-w-[200px] truncate">
                                {fila[col] || <span className="text-gray-300">—</span>}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              )}

              {/* Aviso y botón confirmar */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-orange-800">
                  <strong>¿Todo se ve correcto?</strong> Al confirmar se importarán las <strong>{totalFilas}</strong> filas del archivo.
                  Los clientes existentes (mismo correo, teléfono o nombre) se actualizarán con datos faltantes, sin sobrescribir información existente.
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleReset}
                >
                  Cancelar
                </Button>
                <Button
                  disabled={loadingImport || !hayColumnasReconocidas}
                  onClick={handleImport}
                  className="flex-1 bg-orange-600 hover:bg-orange-700"
                  size="lg"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {loadingImport ? 'Importando...' : `Confirmar e importar ${totalFilas} registros`}
                </Button>
              </div>
            </>
          )}
        </>
      )}

      {/* ─── PASO 3: Resultado ──────────────────────────────────────────────── */}
      {step === 'result' && resultado && (
        <>
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-orange-500" />
                Resultado de importación — {file?.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-2xl font-bold text-gray-900">{resultado.total}</p>
                  <p className="text-gray-500">Encontrados</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-3">
                  <p className="text-2xl font-bold text-orange-700">{resultado.importados}</p>
                  <p className="text-orange-600">Importados</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-3">
                  <p className="text-2xl font-bold text-amber-700">{resultado.actualizados}</p>
                  <p className="text-amber-600">Actualizados</p>
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

          <Button
            variant="outline"
            className="w-full"
            onClick={handleReset}
          >
            Importar otro archivo
          </Button>
        </>
      )}

    </div>
  )
}
