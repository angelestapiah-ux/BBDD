'use client'

import { useEffect, useState, useCallback } from 'react'
import { BoletaHonorario } from '@/lib/types'
import { calcularBoleta, formatoCLP, RETENCION_LABEL } from '@/lib/honorarios'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Plus, Trash2, Pencil, FileSignature, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const ORIGEN_LABEL: Record<string, string> = {
  terapia: '🩺 Terapia',
  clases: '📚 Clases',
  manual: '✍️ Manual',
}

function fmt(d: string | null) {
  if (!d) return '—'
  return d.slice(0, 10).split('-').reverse().join('/')
}

// ─── Formulario de boleta (crear / completar) ────────────────────────────
function BoletaDialog({ boleta, prestadores, onClose, onSaved }: {
  boleta: BoletaHonorario | null   // null = nueva
  prestadores: string[]
  onClose: () => void
  onSaved: () => void
}) {
  const [prestador, setPrestador] = useState(boleta?.prestador || '')
  const [glosa, setGlosa] = useState(boleta?.glosa || '')
  const [fecha, setFecha] = useState(boleta?.fecha?.slice(0, 10) || new Date().toISOString().slice(0, 10))
  const [liquido, setLiquido] = useState(boleta?.monto_liquido?.toString() || '')
  const [numeroBoleta, setNumeroBoleta] = useState(boleta?.numero_boleta || '')
  const [origen, setOrigen] = useState(boleta?.origen || 'clases')
  const [notas, setNotas] = useState(boleta?.notas || '')
  const [saving, setSaving] = useState(false)

  const calc = liquido && Number(liquido) > 0 ? calcularBoleta(Number(liquido)) : null

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    if (!prestador.trim() || !glosa.trim()) { toast.error('Prestador y glosa son requeridos'); return }
    setSaving(true)
    const payload = {
      prestador: prestador.trim(),
      glosa: glosa.trim(),
      fecha,
      monto_liquido: liquido ? Number(liquido) : null,
      numero_boleta: numeroBoleta || null,
      origen,
      notas: notas || null,
    }
    const res = boleta
      ? await fetch(`/api/honorarios/${boleta.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      : await fetch('/api/honorarios', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    setSaving(false)
    if (res.ok) {
      toast.success(boleta ? 'Boleta actualizada' : 'Boleta registrada')
      onSaved()
    } else {
      const err = await res.json().catch(() => ({}))
      toast.error(err.error || 'Error al guardar')
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{boleta ? 'Completar boleta' : 'Nueva boleta de honorarios'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={guardar} className="space-y-4">
          <div>
            <Label>Prestador (docente / terapeuta) *</Label>
            <Input
              required
              list="lista-prestadores"
              value={prestador}
              onChange={e => setPrestador(e.target.value)}
              placeholder="Nombre de quien boletea"
            />
            <datalist id="lista-prestadores">
              {prestadores.map(p => <option key={p} value={p} />)}
            </datalist>
          </div>
          <div>
            <Label>Glosa *</Label>
            <Input required value={glosa} onChange={e => setGlosa(e.target.value)} placeholder="ej: Clases Diplomado Practitioner mayo" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Fecha</Label>
              <Input type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
            </div>
            <div>
              <Label>Origen</Label>
              <div className="relative">
                <select
                  value={origen}
                  onChange={e => setOrigen(e.target.value as BoletaHonorario['origen'])}
                  className="w-full h-10 pl-3 pr-8 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:border-orange-400 appearance-none"
                >
                  <option value="clases">Clases</option>
                  <option value="terapia">Terapia</option>
                  <option value="manual">Otro</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <Label>Monto líquido (lo que recibe)</Label>
              <Input type="number" value={liquido} onChange={e => setLiquido(e.target.value)} placeholder="0" />
            </div>
            <div>
              <Label>N° de boleta</Label>
              <Input value={numeroBoleta} onChange={e => setNumeroBoleta(e.target.value)} placeholder="Al emitirla" />
            </div>
          </div>

          {/* Cálculo automático según legislación chilena */}
          {calc && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2.5 text-sm">
              <p className="text-xs font-semibold text-orange-700 mb-1">Cálculo SII (retención {RETENCION_LABEL} — año 2026)</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-xs text-gray-500">Líquido</p>
                  <p className="font-semibold text-gray-800">{formatoCLP(calc.liquido)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Retención</p>
                  <p className="font-semibold text-gray-800">{formatoCLP(calc.retencion)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Bruto a boletear</p>
                  <p className="font-bold text-orange-700">{formatoCLP(calc.bruto)}</p>
                </div>
              </div>
            </div>
          )}

          <div>
            <Label>Notas</Label>
            <Textarea rows={2} value={notas} onChange={e => setNotas(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving} className="bg-orange-600 hover:bg-orange-700">
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Página ──────────────────────────────────────────────────────────────
export default function HonorariosPage() {
  const [boletas, setBoletas] = useState<BoletaHonorario[]>([])
  const [prestadores, setPrestadores] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [estadoFilter, setEstadoFilter] = useState('')
  const [prestadorFilter, setPrestadorFilter] = useState('')
  const [dialogo, setDialogo] = useState<BoletaHonorario | null | 'nueva'>(null)

  const fetchBoletas = useCallback(async () => {
    const params = new URLSearchParams()
    if (estadoFilter) params.set('estado', estadoFilter)
    if (prestadorFilter) params.set('prestador', prestadorFilter)
    const res = await fetch(`/api/honorarios?${params}`)
    if (res.ok) {
      const json = await res.json()
      setBoletas(json.boletas || [])
      setPrestadores(json.prestadores || [])
    }
    setLoading(false)
  }, [estadoFilter, prestadorFilter])

  useEffect(() => { fetchBoletas() }, [fetchBoletas])

  async function eliminar(b: BoletaHonorario) {
    if (!confirm(`¿Eliminar la boleta de ${b.prestador}?`)) return
    const res = await fetch(`/api/honorarios/${b.id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Eliminada'); fetchBoletas() }
    else toast.error('Error al eliminar')
  }

  const pendientes = boletas.filter(b => b.estado === 'pendiente')
  const totalBrutoEmitidas = boletas.filter(b => b.estado === 'emitida').reduce((s, b) => s + (b.monto_bruto || 0), 0)

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <FileSignature className="h-6 w-6 text-orange-500" />
            <h2 className="text-2xl font-bold text-gray-900">Boletas de honorarios</h2>
          </div>
          <p className="text-gray-500 text-sm mt-1">
            Docentes y terapeutas que boletean a Renova · retención vigente {RETENCION_LABEL}
          </p>
        </div>
        <Button onClick={() => setDialogo('nueva')} className="bg-orange-600 hover:bg-orange-700">
          <Plus className="h-4 w-4 mr-2" /> Nueva boleta
        </Button>
      </div>

      {/* KPIs */}
      {!loading && boletas.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-6">
          {pendientes.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3">
              <p className="text-xs text-yellow-700">Pendientes de emitir</p>
              <p className="text-xl font-bold text-yellow-800">{pendientes.length}</p>
            </div>
          )}
          {totalBrutoEmitidas > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3">
              <p className="text-xs text-orange-600">Total bruto emitido{(estadoFilter || prestadorFilter) && ' (filtrado)'}</p>
              <p className="text-xl font-bold text-orange-700">{formatoCLP(totalBrutoEmitidas)}</p>
            </div>
          )}
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative">
          <select
            value={estadoFilter}
            onChange={e => setEstadoFilter(e.target.value)}
            className="h-10 pl-3 pr-8 rounded-lg border border-gray-200 text-sm text-gray-600 bg-white focus:outline-none focus:border-orange-400 appearance-none cursor-pointer"
          >
            <option value="">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="emitida">Emitida</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
        </div>
        <div className="relative">
          <select
            value={prestadorFilter}
            onChange={e => setPrestadorFilter(e.target.value)}
            className="h-10 pl-3 pr-8 rounded-lg border border-gray-200 text-sm text-gray-600 bg-white focus:outline-none focus:border-orange-400 appearance-none cursor-pointer"
          >
            <option value="">Todos los prestadores</option>
            {prestadores.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Tabla */}
      {loading ? (
        <p className="text-gray-400">Cargando...</p>
      ) : boletas.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-400 text-sm mb-2">Sin boletas registradas.</p>
          <p className="text-gray-400 text-xs">
            Las boletas de terapias se generan automáticamente al registrar el pago de un paciente con terapeuta asignado.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Prestador</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Glosa</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Origen</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Líquido</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Bruto</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Fecha</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {boletas.map(b => (
                <tr key={b.id} className={cn('hover:bg-gray-50 transition-colors group', b.estado === 'pendiente' && 'bg-yellow-50/30')}>
                  <td className="px-4 py-3 font-medium">{b.prestador}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-[260px] truncate" title={b.glosa}>{b.glosa}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 hidden md:table-cell">{ORIGEN_LABEL[b.origen] || b.origen}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{formatoCLP(b.monto_liquido)}</td>
                  <td className="px-4 py-3 text-right font-semibold">{formatoCLP(b.monto_bruto)}</td>
                  <td className="px-4 py-3">
                    {b.estado === 'emitida' ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700" title={b.numero_boleta ? `N° ${b.numero_boleta}` : ''}>
                        Emitida{b.numero_boleta && ` · ${b.numero_boleta}`}
                      </span>
                    ) : (
                      <button
                        onClick={() => setDialogo(b)}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700 hover:bg-yellow-200 transition-colors"
                        title="Click para completar y emitir"
                      >
                        Pendiente →
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-400 hidden md:table-cell">{fmt(b.fecha)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100" onClick={() => setDialogo(b)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-red-500" onClick={() => eliminar(b)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {dialogo && (
        <BoletaDialog
          boleta={dialogo === 'nueva' ? null : dialogo}
          prestadores={prestadores}
          onClose={() => setDialogo(null)}
          onSaved={() => { setDialogo(null); fetchBoletas() }}
        />
      )}
    </div>
  )
}
