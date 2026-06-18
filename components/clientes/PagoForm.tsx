'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Asistencia, CuotaInput, PagoFormPayload } from '@/lib/types'
import { toast } from 'sonner'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSubmit: (data: PagoFormPayload) => Promise<void>
  asistencias: Asistencia[]
}

// Suma meses a una fecha ISO (YYYY-MM-DD) sin saltos de zona horaria
function sumarMeses(fechaISO: string, meses: number): string {
  const [y, m, d] = fechaISO.split('-').map(Number)
  const dt = new Date(y, (m - 1) + meses, d)
  const yy = dt.getFullYear()
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const dd = String(dt.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

// Reparte el total en n cuotas parejas (el ajuste de redondeo va en la última)
// y calcula vencimientos mensuales desde la primera fecha.
function generarCuotas(n: number, total: number, primeraFecha: string): CuotaInput[] {
  const out: CuotaInput[] = []
  if (n < 1 || !primeraFecha) return out
  const base = Math.floor(total / n)
  const resto = total - base * n
  for (let i = 0; i < n; i++) {
    out.push({
      numero_cuota: i + 1,
      monto: i === n - 1 ? base + resto : base,
      fecha_vencimiento: sumarMeses(primeraFecha, i),
    })
  }
  return out
}

export function PagoForm({ open, onOpenChange, onSubmit, asistencias }: Props) {
  const [actividad, setActividad] = useState('')
  const [customActividad, setCustomActividad] = useState('')
  const [monto, setMonto] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [fechaActividad, setFechaActividad] = useState('')
  const [metodo, setMetodo] = useState('')
  const [estado, setEstado] = useState('pagado')
  const [notas, setNotas] = useState('')
  const [requiereFactura, setRequiereFactura] = useState(false)
  const [numeroFactura, setNumeroFactura] = useState('')
  const [facturaInterna, setFacturaInterna] = useState('')
  const [saving, setSaving] = useState(false)

  // Plan de cuotas
  const [tipoCobro, setTipoCobro] = useState<'unico' | 'cuotas'>('unico')
  const [numCuotas, setNumCuotas] = useState('3')
  const [montoTotal, setMontoTotal] = useState('')
  const [primeraFecha, setPrimeraFecha] = useState(new Date().toISOString().slice(0, 10))
  const [cuotas, setCuotas] = useState<CuotaInput[]>([])

  const [catalogo, setCatalogo] = useState<{ id: string; nombre: string }[]>([])

  useEffect(() => {
    if (open) {
      fetch('/api/actividades').then(r => r.json()).then(d => setCatalogo(Array.isArray(d) ? d : []))
    }
  }, [open])

  // Recalcula el reparto parejo cuando cambian n° de cuotas, total o primera fecha
  useEffect(() => {
    if (tipoCobro !== 'cuotas') return
    const n = parseInt(numCuotas) || 0
    const total = Number(montoTotal) || 0
    setCuotas(generarCuotas(n, total, primeraFecha))
  }, [tipoCobro, numCuotas, montoTotal, primeraFecha])

  const esSinCobro = metodo === 'sin_cobro'
  const esCuotas = tipoCobro === 'cuotas'
  const nombreFinal = actividad === '__otro__' ? customActividad : actividad

  const sumaCuotas = cuotas.reduce((s, c) => s + (c.monto || 0), 0)
  const diferencia = (Number(montoTotal) || 0) - sumaCuotas

  function setCuotaMonto(i: number, v: string) {
    setCuotas(cs => cs.map((c, idx) => idx === i ? { ...c, monto: Number(v) || 0 } : c))
  }
  function setCuotaFecha(i: number, v: string) {
    setCuotas(cs => cs.map((c, idx) => idx === i ? { ...c, fecha_vencimiento: v } : c))
  }
  function recalcularParejo() {
    setCuotas(generarCuotas(parseInt(numCuotas) || 0, Number(montoTotal) || 0, primeraFecha))
  }

  function resetForm() {
    setActividad(''); setCustomActividad(''); setMonto(''); setNotas(''); setRequiereFactura(false); setMetodo('')
    setFechaActividad(''); setNumeroFactura(''); setFacturaInterna('')
    setTipoCobro('unico'); setNumCuotas('3'); setMontoTotal(''); setCuotas([]); setEstado('pagado')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nombreFinal) return
    if (!metodo) { toast.error('Selecciona un método de pago'); return }

    if (esCuotas) {
      const n = parseInt(numCuotas) || 0
      if (n < 2) { toast.error('Un plan de cuotas avanza con 2 o más cuotas'); return }
      if (!montoTotal || Number(montoTotal) <= 0) { toast.error('Indica el monto total del plan'); return }
      if (cuotas.some(c => !c.monto || c.monto <= 0 || !c.fecha_vencimiento)) {
        toast.error('Completa monto y fecha en cada cuota')
        return
      }
    } else if (estado === 'pagado' && !esSinCobro && (!monto || Number(monto) <= 0)) {
      toast.error('Un pago en estado "Pagado" avanza con el monto')
      return
    }

    setSaving(true)
    await onSubmit({
      actividad_nombre: nombreFinal,
      monto: esCuotas ? '' : (esSinCobro ? '0' : monto),
      fecha_pago: fecha,
      fecha_actividad: fechaActividad,
      metodo_pago: metodo,
      estado: esCuotas ? 'pendiente' : estado,
      notas,
      requiere_factura: requiereFactura,
      numero_factura: numeroFactura,
      factura_interna: facturaInterna,
      tiene_plan_cuotas: esCuotas,
      monto_total: esCuotas ? montoTotal : '',
      cuotas: esCuotas ? cuotas : [],
    })
    resetForm()
    setSaving(false)
  }

  // Actividades únicas del cliente (sin duplicados)
  const actividadesCliente = Array.from(
    new Map(asistencias.map(a => [a.actividad_nombre, a])).values()
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Registrar pago</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Actividad *</Label>
            <Select value={actividad} onValueChange={v => v && setActividad(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una actividad..." />
              </SelectTrigger>
              <SelectContent>
                {actividadesCliente.length > 0 && (
                  <>
                    <div className="px-2 py-1 text-xs text-gray-400 font-medium">Actividades del cliente</div>
                    {actividadesCliente.map(a => (
                      <SelectItem key={a.id} value={a.actividad_nombre}>
                        {a.actividad_nombre}
                      </SelectItem>
                    ))}
                    <div className="my-1 border-t border-gray-100" />
                  </>
                )}
                {(() => {
                  const delCliente = new Set(actividadesCliente.map(a => a.actividad_nombre))
                  const resto = catalogo.filter(a => !delCliente.has(a.nombre))
                  return resto.length > 0 ? (
                    <>
                      <div className="px-2 py-1 text-xs text-gray-400 font-medium">Catálogo (se agregará al perfil)</div>
                      {resto.map(a => (
                        <SelectItem key={a.id} value={a.nombre}>{a.nombre}</SelectItem>
                      ))}
                      <div className="my-1 border-t border-gray-100" />
                    </>
                  ) : null
                })()}
                <SelectItem value="__otro__">Otra (escribir manualmente)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {actividad === '__otro__' && (
            <div>
              <Label>Nombre de la actividad</Label>
              <Input
                required
                value={customActividad}
                onChange={e => setCustomActividad(e.target.value)}
                placeholder="ej: Diplomado Practitioner PNL"
              />
            </div>
          )}

          {/* Forma de cobro: pago único o plan de cuotas */}
          <div>
            <Label>Forma de cobro</Label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button
                type="button"
                onClick={() => setTipoCobro('unico')}
                className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  !esCuotas ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                }`}
              >
                Pago único
              </button>
              <button
                type="button"
                onClick={() => setTipoCobro('cuotas')}
                className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  esCuotas ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                }`}
              >
                Plan de cuotas
              </button>
            </div>
          </div>

          {/* Pago único */}
          {!esCuotas && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Monto{esSinCobro && ' (sin cobro)'}</Label>
                <Input type="number" placeholder="0" value={esSinCobro ? '0' : monto} disabled={esSinCobro} onChange={e => setMonto(e.target.value)} />
              </div>
              <div>
                <Label>Fecha de pago</Label>
                <Input type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
              </div>
              <div>
                <Label>Fecha de la actividad</Label>
                <Input type="date" value={fechaActividad} onChange={e => setFechaActividad(e.target.value)} />
                <p className="text-xs text-gray-400 mt-0.5">Si es distinta a la fecha de pago</p>
              </div>
              <div>
                <Label>Estado</Label>
                <Select value={estado} onValueChange={v => v && setEstado(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pagado">Pagado</SelectItem>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                    <SelectItem value="parcial">Parcial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Plan de cuotas */}
          {esCuotas && (
            <div className="space-y-3 rounded-xl border border-orange-100 bg-orange-50/40 p-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>N° de cuotas</Label>
                  <Input type="number" min={2} value={numCuotas} onChange={e => setNumCuotas(e.target.value)} />
                </div>
                <div>
                  <Label>Monto total</Label>
                  <Input type="number" placeholder="0" value={montoTotal} onChange={e => setMontoTotal(e.target.value)} />
                </div>
                <div>
                  <Label>1ª cuota vence</Label>
                  <Input type="date" value={primeraFecha} onChange={e => setPrimeraFecha(e.target.value)} />
                </div>
                <div>
                  <Label>Fecha de la actividad</Label>
                  <Input type="date" value={fechaActividad} onChange={e => setFechaActividad(e.target.value)} />
                </div>
              </div>

              {cuotas.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-gray-500">Cuotas (ajustables)</p>
                    <button type="button" onClick={recalcularParejo} className="text-xs text-orange-600 hover:underline">
                      Recalcular parejo
                    </button>
                  </div>
                  {cuotas.map((c, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 w-6 shrink-0">{c.numero_cuota}.</span>
                      <Input type="number" className="flex-1" value={c.monto} onChange={e => setCuotaMonto(i, e.target.value)} />
                      <Input type="date" className="flex-1" value={c.fecha_vencimiento} onChange={e => setCuotaFecha(i, e.target.value)} />
                    </div>
                  ))}
                  <p className={`text-xs ${Math.abs(diferencia) < 1 ? 'text-green-600' : 'text-amber-600'}`}>
                    Suma de cuotas: ${sumaCuotas.toLocaleString('es-CL')}
                    {Math.abs(diferencia) >= 1 && ` · diferencia con el total: $${diferencia.toLocaleString('es-CL')}`}
                  </p>
                </div>
              )}

              <div>
                <Label>Fecha de registro</Label>
                <Input type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
              </div>
            </div>
          )}

          {/* Método (común a ambas formas de cobro) */}
          <div>
            <Label>Método *</Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Select value={metodo || '__vacio__'} onValueChange={v => setMetodo(v === '__vacio__' ? '' : (v ?? ''))}>
                  <SelectTrigger className={!metodo ? 'text-gray-400' : ''}>
                    <SelectValue placeholder="Selecciona..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__vacio__" disabled>Selecciona un método...</SelectItem>
                    <SelectItem value="transferencia">Transferencia</SelectItem>
                    <SelectItem value="efectivo">Efectivo</SelectItem>
                    <SelectItem value="tarjeta">Tarjeta</SelectItem>
                    <SelectItem value="webpay">Link de pago Webpay</SelectItem>
                    {!esCuotas && <SelectItem value="sin_cobro">Sin cobro</SelectItem>}
                    <SelectItem value="otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {!esCuotas && (
                <button
                  type="button"
                  onClick={() => { setMetodo(esSinCobro ? '' : 'sin_cobro'); if (!esSinCobro) setMonto('0') }}
                  className={`px-3 rounded-lg text-xs font-medium border transition-colors shrink-0 ${
                    esSinCobro
                      ? 'bg-gray-700 text-white border-gray-700'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                  }`}
                >
                  Sin cobro
                </button>
              )}
            </div>
          </div>

          <div>
            <Label>Notas</Label>
            <Textarea rows={2} value={notas} onChange={e => setNotas(e.target.value)} />
          </div>

          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={requiereFactura}
              onChange={e => setRequiereFactura(e.target.checked)}
              className="h-4 w-4 rounded accent-orange-600"
            />
            <span className="text-sm font-medium text-gray-700">Cliente requiere factura</span>
          </label>

          {requiereFactura && (
            <div>
              <Label>N° de factura</Label>
              <Input
                value={numeroFactura}
                onChange={e => setNumeroFactura(e.target.value)}
                placeholder="ej: 1745 (déjalo vacío si aún no se emite)"
              />
            </div>
          )}

          <div>
            <Label>Facturación interna (registro SII)</Label>
            <Input
              value={facturaInterna}
              onChange={e => setFacturaInterna(e.target.value)}
              placeholder="N° o folio interno"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving || !nombreFinal || !metodo} className="bg-orange-600 hover:bg-orange-700">
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
