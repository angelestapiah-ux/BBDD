'use client'

import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { X } from 'lucide-react'
import { Recordatorio } from '@/lib/types'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSaved: () => void
  recordatorio?: Recordatorio | null   // si viene, es edición
  defaultUsuario?: string
}

// Hora LOCAL del dispositivo "YYYY-MM-DDTHH:mm" para <input type="datetime-local">.
function aLocalInput(d: Date): string {
  const x = new Date(d)
  x.setMinutes(x.getMinutes() - x.getTimezoneOffset())
  return x.toISOString().slice(0, 16)
}
function ahoraMas(horas: number): string {
  const d = new Date()
  d.setHours(d.getHours() + horas, 0, 0, 0)
  return aLocalInput(d)
}

type ClienteMini = { id: string; nombre: string }

export function RecordatorioForm({ open, onOpenChange, onSaved, recordatorio, defaultUsuario }: Props) {
  const esEdicion = !!recordatorio
  const [titulo, setTitulo] = useState('')
  const [fechaHora, setFechaHora] = useState(ahoraMas(1))
  const [clienteId, setClienteId] = useState<string | null>(null)
  const [clienteNombre, setClienteNombre] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState<ClienteMini[]>([])
  const [buscando, setBuscando] = useState(false)
  const [categoria, setCategoria] = useState<string>('ninguna')
  const [prioridad, setPrioridad] = useState<string>('normal')
  const [recurrencia, setRecurrencia] = useState<string>('ninguna')
  const [notas, setNotas] = useState('')
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cargar datos al abrir (edición) o limpiar (nuevo).
  useEffect(() => {
    if (!open) return
    if (recordatorio) {
      setTitulo(recordatorio.titulo)
      setFechaHora(aLocalInput(new Date(recordatorio.fecha_hora)))
      setClienteId(recordatorio.cliente_id)
      setClienteNombre(recordatorio.clientes?.nombre || '')
      setCategoria(recordatorio.categoria || 'ninguna')
      setPrioridad(recordatorio.prioridad || 'normal')
      setRecurrencia(recordatorio.recurrencia || 'ninguna')
      setNotas(recordatorio.notas || '')
    } else {
      setTitulo(''); setFechaHora(ahoraMas(1)); setClienteId(null); setClienteNombre('')
      setCategoria('ninguna'); setPrioridad('normal'); setRecurrencia('ninguna'); setNotas('')
    }
    setBusqueda(''); setResultados([]); setErr('')
  }, [open, recordatorio])

  // Buscador de cliente (debounced) contra /api/clientes?q=
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current)
    const q = busqueda.trim()
    if (q.length < 2) { setResultados([]); return }
    debounce.current = setTimeout(async () => {
      setBuscando(true)
      try {
        const res = await fetch(`/api/clientes?q=${encodeURIComponent(q)}&limit=8`)
        const json = res.ok ? await res.json() : { data: [] }
        setResultados((json.data || []).map((c: { id: string; nombre: string }) => ({ id: c.id, nombre: c.nombre })))
      } catch {
        setResultados([])
      }
      setBuscando(false)
    }, 300)
    return () => { if (debounce.current) clearTimeout(debounce.current) }
  }, [busqueda])

  function elegirCliente(c: ClienteMini) {
    setClienteId(c.id); setClienteNombre(c.nombre); setBusqueda(''); setResultados([])
  }
  function quitarCliente() {
    setClienteId(null); setClienteNombre('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!titulo.trim()) { setErr('Escribe un título para el recordatorio.'); return }
    if (!fechaHora) { setErr('Elige fecha y hora.'); return }
    setErr(''); setSaving(true)
    const payload = {
      titulo: titulo.trim(),
      fecha_hora: new Date(fechaHora).toISOString(),
      cliente_id: clienteId,
      categoria: categoria === 'ninguna' ? null : categoria,
      prioridad,
      recurrencia,
      notas: notas.trim() || null,
      ...(esEdicion ? {} : { creado_por: defaultUsuario || null, estado: 'pendiente' }),
    }
    const url = esEdicion ? `/api/recordatorios/${recordatorio!.id}` : '/api/recordatorios'
    const res = await fetch(url, {
      method: esEdicion ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setSaving(false)
    if (res.ok) { onSaved(); onOpenChange(false) }
    else { const j = await res.json().catch(() => ({})); setErr(j.error || 'No se pudo guardar.') }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{esEdicion ? 'Editar recordatorio' : 'Nuevo recordatorio'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Título *</Label>
            <Input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ej: Recordar pago a María antes del taller" autoFocus />
          </div>

          <div>
            <Label>Fecha y hora *</Label>
            <Input type="datetime-local" value={fechaHora} onChange={e => setFechaHora(e.target.value)} />
          </div>

          <div>
            <Label>Cliente (opcional)</Label>
            {clienteId ? (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2">
                <span className="text-sm font-medium text-orange-800 truncate">{clienteNombre}</span>
                <button type="button" onClick={quitarCliente} className="text-orange-500 hover:text-orange-700" title="Quitar">
                  <X size={15} />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Input
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  placeholder="Busca por nombre… (déjalo vacío para un recordatorio general)"
                />
                {(resultados.length > 0 || buscando) && (
                  <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-52 overflow-y-auto">
                    {buscando && <p className="px-3 py-2 text-xs text-gray-400">Buscando…</p>}
                    {resultados.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => elegirCliente(c)}
                        className="block w-full text-left px-3 py-2 text-sm hover:bg-orange-50"
                      >
                        {c.nombre}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Categoría</Label>
              <Select value={categoria} onValueChange={v => v && setCategoria(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ninguna">— Sin categoría —</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                  <SelectItem value="llamada">Llamada</SelectItem>
                  <SelectItem value="reunion">Reunión</SelectItem>
                  <SelectItem value="personal">Personal</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Prioridad</Label>
              <Select value={prioridad} onValueChange={v => v && setPrioridad(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Repetir</Label>
            <Select value={recurrencia} onValueChange={v => v && setRecurrencia(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ninguna">No se repite</SelectItem>
                <SelectItem value="diaria">Cada día</SelectItem>
                <SelectItem value="semanal">Cada semana</SelectItem>
                <SelectItem value="mensual">Cada mes</SelectItem>
              </SelectContent>
            </Select>
            {recurrencia !== 'ninguna' && (
              <p className="mt-1 text-xs text-gray-400">Al marcarlo como hecho, se crea solo el siguiente.</p>
            )}
          </div>

          <div>
            <Label>Notas (opcional)</Label>
            <Textarea rows={2} value={notas} onChange={e => setNotas(e.target.value)} placeholder="Detalle del recordatorio…" />
          </div>

          {err && <p className="text-sm text-red-600">{err}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving} className="bg-orange-600 hover:bg-orange-700">
              {saving ? 'Guardando…' : (esEdicion ? 'Guardar cambios' : 'Crear recordatorio')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
