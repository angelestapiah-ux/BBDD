'use client'

import { useState, useEffect } from 'react'
import { Cliente } from '@/lib/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: Partial<Cliente>) => Promise<void>
  title: string
  initial?: Partial<Cliente>
}

export function ClienteFormDialog({ open, onOpenChange, onSubmit, title, initial }: Props) {
  const [form, setForm] = useState<Partial<Cliente>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setForm(initial || {})
  }, [initial, open])

  function set(key: keyof Cliente, value: string) {
    setForm(prev => ({ ...prev, [key]: value || null }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await onSubmit(form)
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input
                id="nombre"
                value={form.nombre || ''}
                onChange={e => set('nombre', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="correo">Correo</Label>
              <Input
                id="correo"
                type="email"
                value={form.correo || ''}
                onChange={e => set('correo', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="telefono">Teléfono</Label>
              <Input
                id="telefono"
                value={form.telefono || ''}
                onChange={e => set('telefono', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="procedencia">Procedencia</Label>
              <Input
                id="procedencia"
                placeholder="ej: Instagram, referido..."
                value={form.procedencia || ''}
                onChange={e => set('procedencia', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="fecha_incorporacion">Fecha incorporación</Label>
              <Input
                id="fecha_incorporacion"
                type="date"
                value={form.fecha_incorporacion || ''}
                onChange={e => set('fecha_incorporacion', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="cumpleanos">Cumpleaños</Label>
              <Input
                id="cumpleanos"
                type="date"
                value={form.cumpleanos || ''}
                onChange={e => set('cumpleanos', e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="comentario">Comentario / Primer contacto</Label>
              <Textarea
                id="comentario"
                rows={3}
                value={form.comentario || ''}
                onChange={e => set('comentario', e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
