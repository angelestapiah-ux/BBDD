'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Asistencia } from '@/lib/types'

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
  const [metodo, setMetodo] = useState('transferencia')
  const [estado, setEstado] = useState('pagado')
  const [notas, setNotas] = useState('')
  const [requiereFactura, setRequiereFactura] = useState(false)
  const [saving, setSaving] = useState(false)

  const nombreFinal = actividad === '__otro__' ? customActividad : actividad

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nombreFinal) return
    setSaving(true)
    await onSubmit({
      actividad_nombre: nombreFinal,
      monto,
      fecha_pago: fecha,
      metodo_pago: metodo,
      estado,
      notas,
      requiere_factura: requiereFactura,
    })
    setActividad(''); setCustomActividad(''); setMonto(''); setNotas(''); setRequiereFactura(false)
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
              <Label>Monto</Label>
              <Input type="number" placeholder="0" value={monto} onChange={e => setMonto(e.target.value)} />
            </div>
            <div>
              <Label>Fecha</Label>
              <Input type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
            </div>
            <div>
              <Label>Método</Label>
              <Select value={metodo} onValueChange={v => v && setMetodo(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="tarjeta">Tarjeta</SelectItem>
                  <SelectItem value="webpay">Link de pago Webpay</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving || !nombreFinal} className="bg-orange-600 hover:bg-orange-700">
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
