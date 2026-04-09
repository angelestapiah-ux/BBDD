'use client'

import { useEffect, useState, useCallback } from 'react'
import { Actividad } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const TIPOS: Record<string, string> = {
  diplomado_presencial: 'Diplomado Presencial',
  diplomado_online: 'Diplomado Online',
  taller: 'Taller',
  coaching: 'Coaching',
  asesoria: 'Asesoría',
  otro: 'Otro',
}

const TIPO_COLORS: Record<string, string> = {
  diplomado_presencial: 'bg-purple-100 text-purple-700',
  diplomado_online: 'bg-blue-100 text-blue-700',
  taller: 'bg-amber-100 text-amber-700',
  coaching: 'bg-orange-100 text-orange-700',
  asesoria: 'bg-rose-100 text-rose-700',
  otro: 'bg-gray-100 text-gray-700',
}

function fmt(d: string | null) {
  if (!d) return '—'
  try { return format(new Date(d + 'T12:00:00'), 'dd/MM/yyyy', { locale: es }) }
  catch { return d }
}

const EMPTY: Partial<Actividad> = { nombre: '', tipo: 'otro', descripcion: '', fecha_inicio: '', fecha_fin: '' }

export default function ActividadesPage() {
  const [actividades, setActividades] = useState<Actividad[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Actividad | null>(null)
  const [form, setForm] = useState<Partial<Actividad>>(EMPTY)
  const [saving, setSaving] = useState(false)

  const fetch_ = useCallback(async () => {
    const res = await fetch('/api/actividades')
    setActividades(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetch_() }, [fetch_])

  function openNew() { setEditing(null); setForm(EMPTY); setDialogOpen(true) }
  function openEdit(a: Actividad) { setEditing(a); setForm(a); setDialogOpen(true) }

  function set(key: keyof Actividad, value: string) {
    setForm(prev => ({ ...prev, [key]: value || null }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const method = editing ? 'PUT' : 'POST'
    const url = editing ? `/api/actividades/${editing.id}` : '/api/actividades'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      toast.success(editing ? 'Actividad actualizada' : 'Actividad creada')
      setDialogOpen(false)
      fetch_()
    } else {
      toast.error('Error al guardar')
    }
    setSaving(false)
  }

  async function handleDelete(a: Actividad) {
    if (!confirm(`¿Eliminar "${a.nombre}"?`)) return
    const res = await fetch(`/api/actividades/${a.id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Actividad eliminada'); fetch_() }
    else toast.error('Error al eliminar')
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Actividades</h2>
          <p className="text-gray-500 text-sm mt-1">Catálogo de diplomados, talleres y otras actividades</p>
        </div>
        <Button onClick={openNew} className="bg-orange-600 hover:bg-orange-700">
          <Plus className="h-4 w-4 mr-2" /> Nueva actividad
        </Button>
      </div>

      {loading ? (
        <p className="text-gray-400">Cargando...</p>
      ) : actividades.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="mb-4">No hay actividades en el catálogo</p>
          <Button onClick={openNew} variant="outline">Crear primera actividad</Button>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Nombre</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Inicio</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Fin</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {actividades.map(a => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{a.nombre}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TIPO_COLORS[a.tipo] || TIPO_COLORS.otro}`}>
                      {TIPOS[a.tipo] || a.tipo}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{fmt(a.fecha_inicio)}</td>
                  <td className="px-4 py-3 text-gray-500">{fmt(a.fecha_fin)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(a)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700" onClick={() => handleDelete(a)}>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar actividad' : 'Nueva actividad'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Nombre *</Label>
              <Input required value={form.nombre || ''} onChange={e => set('nombre', e.target.value)} placeholder="ej: Diplomado Practitioner PNL 2026" />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={form.tipo || 'otro'} onValueChange={v => v && set('tipo', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TIPOS).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fecha inicio</Label>
                <Input type="date" value={form.fecha_inicio || ''} onChange={e => set('fecha_inicio', e.target.value)} />
              </div>
              <div>
                <Label>Fecha fin</Label>
                <Input type="date" value={form.fecha_fin || ''} onChange={e => set('fecha_fin', e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Descripción</Label>
              <Textarea rows={2} value={form.descripcion || ''} onChange={e => set('descripcion', e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving} className="bg-orange-600 hover:bg-orange-700">
                {saving ? 'Guardando...' : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
