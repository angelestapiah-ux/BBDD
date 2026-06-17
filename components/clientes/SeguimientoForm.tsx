'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Actividad } from '@/lib/types'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSubmit: (data: Record<string, string>) => Promise<void>
  defaultUsuario?: string   // P3: pre-fill con usuario logueado
}

// Hora LOCAL del dispositivo en formato "YYYY-MM-DDTHH:mm" para <input type="datetime-local">.
// (new Date().toISOString() entrega UTC, por eso el campo se corría varias horas.)
function ahoraLocalInput(): string {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

export function SeguimientoForm({ open, onOpenChange, onSubmit, defaultUsuario }: Props) {
  const [tipo, setTipo] = useState('whatsapp')
  const [notas, setNotas] = useState('')
  const [fecha, setFecha] = useState(ahoraLocalInput())
  const [usuario, setUsuario] = useState(defaultUsuario || '')
  const [actividadNombre, setActividadNombre] = useState('')
  const [actividades, setActividades] = useState<Actividad[]>([])
  const [responsables, setResponsables] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  // Sincronizar defaultUsuario cuando cambie (o cuando abra el dialog)
  useEffect(() => {
    if (open) {
      setFecha(ahoraLocalInput())   // refresca a la hora del dispositivo cada vez que se abre
      setUsuario(prev => prev || defaultUsuario || '')
      fetch('/api/actividades').then(r => r.json()).then(d => setActividades(Array.isArray(d) ? d : []))
      fetch('/api/responsables').then(r => r.ok ? r.json() : []).then(d => setResponsables(Array.isArray(d) ? d : [])).catch(() => {})
    }
  }, [open, defaultUsuario])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    // Enviar el instante exacto con zona horaria, para que se guarde tal cual lo ve el usuario.
    const fechaISO = fecha ? new Date(fecha).toISOString() : new Date().toISOString()
    await onSubmit({ tipo, notas, fecha: fechaISO, usuario, actividad_nombre: actividadNombre })
    setNotas('')
    setActividadNombre('')
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Nuevo seguimiento</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={v => v && setTipo(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="llamada">Llamada</SelectItem>
                  <SelectItem value="correo">Correo</SelectItem>
                  <SelectItem value="visita">Visita</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Fecha y hora</Label>
              <Input type="datetime-local" value={fecha} onChange={e => setFecha(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Actividad relacionada</Label>
            <Select value={actividadNombre || '__ninguna__'} onValueChange={v => setActividadNombre(v === '__ninguna__' ? '' : (v ?? ''))}>
              <SelectTrigger><SelectValue placeholder="Sin actividad específica" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__ninguna__">— Sin actividad específica —</SelectItem>
                {actividades.map(a => (
                  <SelectItem key={a.id} value={a.nombre}>{a.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Responsable</Label>
            <Input
              placeholder="Nombre de quien contactó"
              list="responsables-seg-form"
              value={usuario}
              onChange={e => setUsuario(e.target.value)}
            />
            <datalist id="responsables-seg-form">
              {responsables.map(r => <option key={r} value={r} />)}
            </datalist>
          </div>
          <div>
            <Label>Notas *</Label>
            <Textarea rows={3} required value={notas} onChange={e => setNotas(e.target.value)} placeholder="Describe el contacto..." />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving} className="bg-orange-600 hover:bg-orange-700">
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
