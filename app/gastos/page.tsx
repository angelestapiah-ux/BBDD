'use client'

import { useEffect, useState, useCallback } from 'react'
import { Gasto, ArriendoSala } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Plus, Trash2, Wallet, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'

const CATEGORIAS = ['Alimentación', 'Art. Oficina', 'Coffee Taller', 'Coffee Máster', 'Coffee Practitioner', 'Transporte', 'Otro']

function clp(n: number | null | undefined) {
  return n == null ? '—' : `$${Math.round(n).toLocaleString('es-CL')}`
}

function fmt(d: string | null) {
  return d ? d.slice(0, 10).split('-').reverse().join('/') : '—'
}

// ─── Dialog nuevo gasto vario ────────────────────────────────────────────
function GastoDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [categoria, setCategoria] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [tienda, setTienda] = useState('')
  const [tipoPago, setTipoPago] = useState('Débito')
  const [documento, setDocumento] = useState<'boleta' | 'factura' | 'otro'>('boleta')
  const [numeroDoc, setNumeroDoc] = useState('')
  const [monto, setMonto] = useState('')
  const [saving, setSaving] = useState(false)

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    if (!descripcion.trim() || !monto) { toast.error('Descripción y monto son requeridos'); return }
    setSaving(true)
    const res = await fetch('/api/gastos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipo: 'gastos', fecha, categoria: categoria || null, descripcion: descripcion.trim(),
        tienda: tienda || null, tipo_pago: tipoPago, documento, numero_documento: numeroDoc || null,
        monto: Number(monto),
      }),
    })
    setSaving(false)
    if (res.ok) { toast.success('Gasto registrado'); onSaved() }
    else toast.error('Error al guardar')
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Nuevo gasto</DialogTitle></DialogHeader>
        <form onSubmit={guardar} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Fecha *</Label>
              <Input type="date" required value={fecha} onChange={e => setFecha(e.target.value)} />
            </div>
            <div>
              <Label>Ítem / Categoría</Label>
              <Input list="lista-categorias" value={categoria} onChange={e => setCategoria(e.target.value)} placeholder="ej: Alimentación" />
              <datalist id="lista-categorias">
                {CATEGORIAS.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div className="col-span-2">
              <Label>Descripción *</Label>
              <Input required value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="ej: Yoghurt, galletas reunión" />
            </div>
            <div>
              <Label>Tienda</Label>
              <Input value={tienda} onChange={e => setTienda(e.target.value)} placeholder="ej: Líder" />
            </div>
            <div>
              <Label>Tipo de pago</Label>
              <div className="relative">
                <select value={tipoPago} onChange={e => setTipoPago(e.target.value)} className="w-full h-10 pl-3 pr-8 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:border-orange-400 appearance-none">
                  <option>Débito</option><option>Crédito</option><option>Efectivo</option><option>Transferencia</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <Label>Documento</Label>
              <div className="relative">
                <select value={documento} onChange={e => setDocumento(e.target.value as typeof documento)} className="w-full h-10 pl-3 pr-8 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:border-orange-400 appearance-none">
                  <option value="boleta">Boleta</option><option value="factura">Factura</option><option value="otro">Otro</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <Label>N° documento</Label>
              <Input value={numeroDoc} onChange={e => setNumeroDoc(e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label>Total *</Label>
              <Input type="number" required value={monto} onChange={e => setMonto(e.target.value)} placeholder="0" />
            </div>
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

// ─── Dialog nuevo arriendo de sala ───────────────────────────────────────
function ArriendoDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [profesional, setProfesional] = useState('')
  const [motivo, setMotivo] = useState('')
  const [fechaSesion, setFechaSesion] = useState(new Date().toISOString().slice(0, 10))
  const [formaPago, setFormaPago] = useState('Transferencia')
  const [fechaPago, setFechaPago] = useState('')
  const [monto, setMonto] = useState('')
  const [numeroFactura, setNumeroFactura] = useState('')
  const [saving, setSaving] = useState(false)

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    if (!profesional.trim() || !monto) { toast.error('Profesional y monto son requeridos'); return }
    setSaving(true)
    const res = await fetch('/api/gastos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipo: 'arriendos', profesional: profesional.trim(), motivo: motivo || null,
        fecha_sesion: fechaSesion || null, forma_pago: formaPago, fecha_pago: fechaPago || null,
        monto: Number(monto), numero_factura: numeroFactura || null,
      }),
    })
    setSaving(false)
    if (res.ok) { toast.success('Arriendo registrado'); onSaved() }
    else toast.error('Error al guardar')
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Nuevo arriendo de sala</DialogTitle></DialogHeader>
        <form onSubmit={guardar} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Profesional (terapeuta/abogado) *</Label>
              <Input required value={profesional} onChange={e => setProfesional(e.target.value)} placeholder="ej: José Ignacio" />
            </div>
            <div className="col-span-2">
              <Label>Paciente / motivo</Label>
              <Input value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="ej: Reunión Gustavo Guerrero" />
            </div>
            <div>
              <Label>Fecha sesión</Label>
              <Input type="date" value={fechaSesion} onChange={e => setFechaSesion(e.target.value)} />
            </div>
            <div>
              <Label>Fecha de pago</Label>
              <Input type="date" value={fechaPago} onChange={e => setFechaPago(e.target.value)} />
            </div>
            <div>
              <Label>Forma de pago</Label>
              <div className="relative">
                <select value={formaPago} onChange={e => setFormaPago(e.target.value)} className="w-full h-10 pl-3 pr-8 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:border-orange-400 appearance-none">
                  <option>Transferencia</option><option>Efectivo</option><option>Tarjeta</option><option>Otro</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <Label>Valor *</Label>
              <Input type="number" required value={monto} onChange={e => setMonto(e.target.value)} placeholder="0" />
            </div>
            <div className="col-span-2">
              <Label>N° factura</Label>
              <Input value={numeroFactura} onChange={e => setNumeroFactura(e.target.value)} placeholder="ej: 1639" />
            </div>
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
export default function GastosPage() {
  const [vista, setVista] = useState<'gastos' | 'arriendos'>('gastos')
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [arriendos, setArriendos] = useState<ArriendoSala[]>([])
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7))
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)

  const fetchDatos = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ tipo: vista })
    if (mes) params.set('mes', mes)
    const res = await fetch(`/api/gastos?${params}`)
    if (res.ok) {
      const d = await res.json()
      if (vista === 'gastos') setGastos(Array.isArray(d) ? d : [])
      else setArriendos(Array.isArray(d) ? d : [])
    }
    setLoading(false)
  }, [vista, mes])

  useEffect(() => { fetchDatos() }, [fetchDatos])

  async function eliminar(id: string) {
    if (!confirm('¿Eliminar este registro?')) return
    const res = await fetch(`/api/gastos/${id}?tipo=${vista}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Eliminado'); fetchDatos() }
    else toast.error('Error al eliminar')
  }

  // Totales como en el Excel: por boleta / factura / general
  const totalBoleta = gastos.filter(g => g.documento === 'boleta').reduce((s, g) => s + g.monto, 0)
  const totalFactura = gastos.filter(g => g.documento === 'factura').reduce((s, g) => s + g.monto, 0)
  const totalGeneral = gastos.reduce((s, g) => s + g.monto, 0)
  const totalArriendos = arriendos.reduce((s, a) => s + a.monto, 0)

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Wallet className="h-6 w-6 text-orange-500" />
            <h2 className="text-2xl font-bold text-gray-900">Gastos empresa</h2>
          </div>
          <p className="text-gray-500 text-sm mt-1">Gastos varios del día a día y arriendo de sala</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-orange-600 hover:bg-orange-700">
          <Plus className="h-4 w-4 mr-2" /> {vista === 'gastos' ? 'Nuevo gasto' : 'Nuevo arriendo'}
        </Button>
      </div>

      {/* Tabs + filtro mes */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          <button
            onClick={() => setVista('gastos')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${vista === 'gastos' ? 'bg-orange-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
          >
            Gastos varios
          </button>
          <button
            onClick={() => setVista('arriendos')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-l border-gray-200 ${vista === 'arriendos' ? 'bg-orange-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
          >
            Arriendo sala
          </button>
        </div>
        <input
          type="month"
          value={mes}
          onChange={e => setMes(e.target.value)}
          className="h-10 px-3 rounded-lg border border-gray-200 text-sm text-gray-600 bg-white focus:outline-none focus:border-orange-400 cursor-pointer"
        />
        {mes && (
          <button onClick={() => setMes('')} className="text-xs text-gray-400 hover:text-gray-600 underline">
            Ver todo
          </button>
        )}
      </div>

      {/* Totales estilo Excel */}
      {!loading && vista === 'gastos' && gastos.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-5">
          <div className="bg-white border border-gray-200 rounded-lg px-4 py-2.5">
            <p className="text-xs text-gray-400">Total boletas</p>
            <p className="text-base font-bold text-gray-700">{clp(totalBoleta)}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg px-4 py-2.5">
            <p className="text-xs text-gray-400">Total facturas</p>
            <p className="text-base font-bold text-gray-700">{clp(totalFactura)}</p>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-2.5">
            <p className="text-xs text-orange-600">Total general</p>
            <p className="text-base font-bold text-orange-700">{clp(totalGeneral)}</p>
          </div>
        </div>
      )}
      {!loading && vista === 'arriendos' && arriendos.length > 0 && (
        <div className="flex gap-3 mb-5">
          <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-2.5">
            <p className="text-xs text-orange-600">Total arriendos{mes && ' del mes'}</p>
            <p className="text-base font-bold text-orange-700">{clp(totalArriendos)}</p>
          </div>
        </div>
      )}

      {/* Tablas */}
      {loading ? (
        <p className="text-gray-400">Cargando...</p>
      ) : vista === 'gastos' ? (
        gastos.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center text-gray-400 text-sm">
            Sin gastos {mes && 'este mes'}. Usa &quot;Nuevo gasto&quot; para registrar el primero.
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Ítem</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Descripción</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Tienda</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Doc</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {gastos.map(g => (
                  <tr key={g.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-4 py-3 text-gray-500">{fmt(g.fecha)}</td>
                    <td className="px-4 py-3 text-gray-600">{g.categoria || '—'}</td>
                    <td className="px-4 py-3 font-medium max-w-[220px] truncate" title={g.descripcion}>{g.descripcion}</td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{g.tienda || '—'}</td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium capitalize ${g.documento === 'factura' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`} title={g.numero_documento ? `N° ${g.numero_documento}` : ''}>
                        {g.documento}{g.numero_documento ? ` ${g.numero_documento}` : ''}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">{clp(g.monto)}</td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-red-500" onClick={() => eliminar(g.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        arriendos.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center text-gray-400 text-sm">
            Sin arriendos {mes && 'este mes'}. Usa &quot;Nuevo arriendo&quot; para registrar el primero.
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Profesional</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Paciente / motivo</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Fecha sesión</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Fecha pago</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Valor</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Factura</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {arriendos.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-4 py-3 font-medium">{a.profesional}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">{a.motivo || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{fmt(a.fecha_sesion)}</td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{fmt(a.fecha_pago)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{clp(a.monto)}</td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{a.numero_factura || '—'}</td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-red-500" onClick={() => eliminar(a.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {dialogOpen && vista === 'gastos' && (
        <GastoDialog onClose={() => setDialogOpen(false)} onSaved={() => { setDialogOpen(false); fetchDatos() }} />
      )}
      {dialogOpen && vista === 'arriendos' && (
        <ArriendoDialog onClose={() => setDialogOpen(false)} onSaved={() => { setDialogOpen(false); fetchDatos() }} />
      )}
    </div>
  )
}
