'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Actividad } from '@/lib/types'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSubmit: (data: Record<string, string>) => Promise<void>
}

export function AsistenciaForm({ open, onOpenChange, onSubmit }: Props) {
  const [actividades, setActividades] = useState<Actividad[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [customNombre, setCustomNombre] = useState('')
  const [fecha, setFecha] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/actividades')
      .then(r => r.json())
      .then(data => setActividades(Array.isArray(data) ? data : []))
  }, [])

  const nombreFinal = selectedId === '__otro__'
    ? customNombre
    : actividades.find(a => a.id === selectedId)?.nombre || ''

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nombreFinal) return
    setSaving(true)
    await onSubmit({ actividad_nombre: nombreFinal, fecha_asistencia: fecha })
    setSelectedId(''); setCustomNombre(''); setFecha('')
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Registrar asistencia</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Actividad *</Label>
            <Select value={selectedId} onValueChange={v => v && setSelectedId(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una actividad..." />
              </SelectTrigger>
              <SelectContent>
                {actividades.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.nombre}</SelectItem>
                ))}
                <SelectItem value="__otro__">Otra (escribir manualmente)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedId === '__otro__' && (
            <div>
              <Label>Nombre de la actividad</Label>
              <Input
                required
                value={customNombre}
                onChange={e => setCustomNombre(e.target.value)}
                placeholder="ej: Taller especial junio"
              />
            </div>
          )}

          <div>
            <Label>Fecha</Label>
            <Input type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
          </div>

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
