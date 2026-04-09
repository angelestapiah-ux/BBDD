'use client'

import { useState, useEffect } from 'react'
import { Cliente } from '@/lib/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TiposClienteSelect } from './TiposClienteSelect'

const ESTADOS_CIVILES = ['Soltero/a', 'Casado/a', 'Separado/a', 'Divorciado/a', 'Acuerdo Unión Civil', 'Viudo/a'] as const

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

  const esPaciente = (form.tipos_cliente || []).some(t =>
    ['Paciente', 'Paciente Fabiola', 'Paciente Rodolfo'].includes(t)
  )
  const esPacienteGeneral = (form.tipos_cliente || []).includes('Paciente')

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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">

            {/* Datos básicos */}
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
              <Input id="correo" type="email" value={form.correo || ''} onChange={e => set('correo', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="correo2">Correo 2</Label>
              <Input id="correo2" type="email" value={form.correo2 || ''} onChange={e => set('correo2', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="telefono">Teléfono</Label>
              <Input id="telefono" value={form.telefono || ''} onChange={e => set('telefono', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="telefono2">Teléfono 2</Label>
              <Input id="telefono2" value={form.telefono2 || ''} onChange={e => set('telefono2', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="documento_identidad">RUT / DNI / Pasaporte</Label>
              <Input id="documento_identidad" value={form.documento_identidad || ''} onChange={e => set('documento_identidad', e.target.value)} placeholder="ej: 12.345.678-9" />
            </div>
            <div>
              <Label htmlFor="edad">Edad</Label>
              <Input id="edad" type="number" min={0} max={120} value={form.edad ?? ''} onChange={e => setForm(prev => ({ ...prev, edad: e.target.value ? Number(e.target.value) : null }))} placeholder="ej: 35" />
            </div>
            <div>
              <Label htmlFor="genero">Género</Label>
              <Select value={form.genero || ''} onValueChange={v => set('genero', v || '')}>
                <SelectTrigger id="genero"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="femenino">Femenino</SelectItem>
                  <SelectItem value="masculino">Masculino</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="estado_civil">Estado civil</Label>
              <Select value={form.estado_civil || ''} onValueChange={v => set('estado_civil', v || '')}>
                <SelectTrigger id="estado_civil"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  {ESTADOS_CIVILES.map(e => (
                    <SelectItem key={e} value={e}>{e}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="profesion">Profesión</Label>
              <Input id="profesion" value={form.profesion || ''} onChange={e => set('profesion', e.target.value)} placeholder="ej: Psicóloga" />
            </div>
            <div>
              <Label htmlFor="ciudad">Ciudad</Label>
              <Input id="ciudad" value={form.ciudad || ''} onChange={e => set('ciudad', e.target.value)} placeholder="ej: Santiago" />
            </div>
            <div>
              <Label htmlFor="pais">País</Label>
              <Input id="pais" value={form.pais || ''} onChange={e => set('pais', e.target.value)} placeholder="ej: Chile" />
            </div>
            <div>
              <Label htmlFor="procedencia">Procedencia</Label>
              <Input id="procedencia" placeholder="ej: Instagram, referido..." value={form.procedencia || ''} onChange={e => set('procedencia', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="fecha_incorporacion">Fecha incorporación</Label>
              <Input id="fecha_incorporacion" type="date" value={form.fecha_incorporacion || ''} onChange={e => set('fecha_incorporacion', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="cumpleanos">Cumpleaños</Label>
              <Input id="cumpleanos" type="date" value={form.cumpleanos || ''} onChange={e => set('cumpleanos', e.target.value)} />
            </div>

            {/* Tipo de cliente y campos condicionales */}
            <div className="col-span-2">
              <Label>Tipo de cliente</Label>
              <TiposClienteSelect
                value={form.tipos_cliente || []}
                onChange={v => setForm(prev => ({ ...prev, tipos_cliente: v }))}
              />
            </div>
            {esPacienteGeneral && (
              <div className="col-span-2">
                <Label htmlFor="terapeuta">Terapeuta</Label>
                <Input
                  id="terapeuta"
                  placeholder="Nombre del terapeuta..."
                  value={form.terapeuta || ''}
                  onChange={e => set('terapeuta', e.target.value)}
                />
              </div>
            )}
            {esPaciente && (
              <div className="col-span-2">
                <Label>Modalidad de atención</Label>
                <div className="flex gap-4 mt-1">
                  {(['presencial', 'online'] as const).map(op => (
                    <label key={op} className="flex items-center gap-2 cursor-pointer text-sm">
                      <input
                        type="radio"
                        name="modalidad_paciente"
                        value={op}
                        checked={form.modalidad_paciente === op}
                        onChange={() => setForm(prev => ({ ...prev, modalidad_paciente: op }))}
                        className="accent-orange-600"
                      />
                      {op.charAt(0).toUpperCase() + op.slice(1)}
                    </label>
                  ))}
                  {form.modalidad_paciente && (
                    <button
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, modalidad_paciente: null }))}
                      className="text-xs text-gray-400 hover:text-gray-600 ml-2"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="col-span-2">
              <Label htmlFor="comentario">Comentario / Primer contacto</Label>
              <Textarea id="comentario" rows={3} value={form.comentario || ''} onChange={e => set('comentario', e.target.value)} />
            </div>
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
