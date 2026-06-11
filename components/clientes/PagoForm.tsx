'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Asistencia } from '@/lib/types'
import { toast } from 'sonner'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSubmit: (data: Record<string, string | boolean>) => Promise<void>
  asistencias: Asistencia[]
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

  const [catalogo, setCatalogo] = useState<{ id: string; nombre: string }[]>([])

  useEffect(() => {
    if (open) {
      fetch('/api/actividades').then(r => r.json()).then(d => setCatalogo(Array.isArray(d) ? d : []))
    }
  }, [open])

  const esSinCobro = metodo === 'sin_cobro'

  const nombreFinal = actividad === '__otro__' ? customActividad : actividad

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nombreFinal) return
    if (!metodo) { toast.error('Selecciona un método de pago'); return }
    if (estado === 'pagado' && !esSinCobro && (!monto || Number(monto) <= 0)) {
      toast.error('Un pago en estado "Pagado" necesita el monto')
      return
    }
    setSaving(true)
    await onSubmit({
      actividad_nombre: nombreFinal,
      monto: esSinCobro ? '0' : monto,
      fecha_pago: fecha,
      fecha_actividad: fechaActividad,
      metodo_pago: metodo,
      estado,
      notas,
      requiere_factura: requiereFactura,
      numero_factura: numeroFactura,
      factura_interna: facturaInterna,
    })
    setActividad(''); setCustomActividad(''); setMonto(''); setNotas(''); setRequiereFactura(false); setMetodo('')
    setFechaActividad(''); setNumeroFactura(''); setFacturaInterna('')
    setSaving(false)
  }

  // Actividades únicas del cliente (sin duplicados)
  const actividadesCliente = Array.from(
    new Map(asistencias.map(a => [a.actividad_nombre, a])).values()
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
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
            <div className="col-span-2">
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
                      <SelectItem value="sin_cobro">Sin cobro</SelectItem>
                      <SelectItem value="otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
              </div>
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
