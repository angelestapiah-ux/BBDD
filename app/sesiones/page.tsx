'use client'

import { useEffect, useState, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { CalendarClock, Plus, Search, X } from 'lucide-react'
import { toast } from 'sonner'

interface SesionRow {
  id: string
  fecha_hora: string
  terapeuta_nombre: string | null
  terapeuta_correo: string | null
  valor: number | null
  estado: string
  notas: string | null
  clientes?: { nombre: string; correo: string | null; telefono: string | null } | null
}

interface ClienteLite {
  id: string
  nombre: string
  correo: string | null
  telefono: string | null
  tipos_cliente: string[] | null
  terapeuta: string | null
  modalidad_paciente: string | null
}

interface TerapeutaLite { correo: string; nombre: string | null; tarifa_default: number | null }

function fmtFechaHora(iso: string) {
  const d = new Date(iso)
  const fecha = d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const hora = d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
  return `${fecha} · ${hora}`
}
function fmtMoney(n: number | null) {
  if (!n) return '—'
  return `$${n.toLocaleString('es-CL')}`
}

export default function SesionesPage() {
  const [sesiones, setSesiones] = useState<SesionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  const cargar = useCallback(async () => {
    setLoading(true)
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
    const res = await fetch(`/api/sesiones?desde=${encodeURIComponent(hoy.toISOString())}`)
    const d = await res.json()
    setSesiones(Array.isArray(d) ? d : [])
    setLoading(false)
  }, [])
  useEffect(() => { cargar() }, [cargar])

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-6 w-6 text-orange-600" />
          <h1 className="text-2xl font-bold text-gray-800">Sesiones</h1>
        </div>
        <Button onClick={() => setOpen(true)} className="bg-orange-600 hover:bg-orange-700">
          <Plus className="h-4 w-4 mr-1" /> Agendar sesión
        </Button>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        Al agendar, el paciente queda al día como <span className="font-medium">Paciente</span> y se genera el cobro por pagar en <span className="font-medium">Cobranza</span>.
      </p>

      {loading ? (
        <p className="text-sm text-gray-400">Cargando...</p>
      ) : sesiones.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-gray-400 text-sm">
          Aún sin sesiones próximas. Agenda la primera con el botón de arriba.
        </div>
      ) : (
        <ul className="space-y-2">
          {sesiones.map(s => (
            <li key={s.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{s.clientes?.nombre ?? 'Paciente'}</p>
                <p className="text-xs text-gray-500">
                  {fmtFechaHora(s.fecha_hora)}
                  {s.terapeuta_nombre && ` · con ${s.terapeuta_nombre}`}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-sm font-medium text-gray-700">{fmtMoney(s.valor)}</span>
                <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${
                  s.estado === 'realizada' ? 'bg-green-100 text-green-700'
                  : s.estado === 'cancelada' ? 'bg-gray-100 text-gray-500'
                  : 'bg-orange-100 text-orange-700'
                }`}>{s.estado}</span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <AgendarSesionDialog open={open} onOpenChange={setOpen} onSaved={cargar} />
    </div>
  )
}

function AgendarSesionDialog({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; onSaved: () => void }) {
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState<ClienteLite[]>([])
  const [cliente, setCliente] = useState<ClienteLite | null>(null)

  const [fechaHora, setFechaHora] = useState('')
  const [terapeutaCorreo, setTerapeutaCorreo] = useState('')
  const [terapeutaNombre, setTerapeutaNombre] = useState('')
  const [valor, setValor] = useState('')
  const [notas, setNotas] = useState('')

  const [terapeutas, setTerapeutas] = useState<TerapeutaLite[]>([])
  const [saving, setSaving] = useState(false)

  // Cargar terapeutas (preguardados + registrados como clientes), todo server-side
  useEffect(() => {
    if (!open) return
    fetch('/api/terapeutas').then(r => r.json()).then(d => setTerapeutas(Array.isArray(d) ? d : [])).catch(() => {})
  }, [open])

  // Buscar pacientes/clientes por nombre (server-side, evita la RLS del navegador)
  useEffect(() => {
    if (cliente) return
    if (busqueda.trim().length < 2) { setResultados([]); return }
    let cancel = false
    const t = setTimeout(async () => {
      const res = await fetch(`/api/clientes-buscar?q=${encodeURIComponent(busqueda.trim())}`)
      const data = await res.json().catch(() => [])
      if (!cancel) setResultados(Array.isArray(data) ? (data as ClienteLite[]) : [])
    }, 250)
    return () => { cancel = true; clearTimeout(t) }
  }, [busqueda, cliente])

  function elegirCliente(c: ClienteLite) {
    setCliente(c); setBusqueda(c.nombre); setResultados([])
    if (c.terapeuta && !terapeutaNombre) setTerapeutaNombre(c.terapeuta)
  }
  function quitarCliente() {
    setCliente(null); setBusqueda(''); setResultados([])
  }

  function elegirTerapeutaCorreo(correo: string) {
    setTerapeutaCorreo(correo)
    const pre = terapeutas.find(t => t.correo === correo)
    if (pre) {
      if (pre.nombre) setTerapeutaNombre(pre.nombre)
      if (pre.tarifa_default != null && !valor) setValor(String(pre.tarifa_default))
    }
  }

  function reset() {
    setBusqueda(''); setResultados([]); setCliente(null)
    setFechaHora(''); setTerapeutaCorreo(''); setTerapeutaNombre(''); setValor(''); setNotas('')
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    if (!cliente) { toast.error('Elige el paciente'); return }
    if (!fechaHora) { toast.error('Indica la fecha y hora de la sesión'); return }
    setSaving(true)
    const res = await fetch('/api/sesiones', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cliente_id: cliente.id,
        fecha_hora: new Date(fechaHora).toISOString(),
        fecha_dia: fechaHora.slice(0, 10),
        terapeuta_nombre: terapeutaNombre,
        terapeuta_correo: terapeutaCorreo,
        valor,
        notas,
      }),
    })
    setSaving(false)
    if (res.ok) {
      toast.success('Sesión agendada · cobro generado en Cobranza')
      reset(); onOpenChange(false); onSaved()
    } else {
      const err = await res.json().catch(() => ({}))
      toast.error(err.error || 'Inténtalo nuevamente')
    }
  }

  // Correos sugeridos: preguardados + terapeutas registrados como clientes (sin repetir)
  const correosSugeridos = Array.from(new Set(terapeutas.map(t => t.correo).filter(Boolean)))

  const esPaciente = cliente?.tipos_cliente?.includes('Paciente')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Agendar sesión</DialogTitle></DialogHeader>
        <form onSubmit={guardar} className="space-y-4">
          {/* Paciente */}
          <div>
            <Label>Paciente *</Label>
            {cliente ? (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-orange-200 bg-orange-50/50 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{cliente.nombre}</p>
                  <p className="text-xs text-gray-500">
                    {esPaciente ? 'Paciente' : 'Se marcará como Paciente al agendar'}
                  </p>
                </div>
                <button type="button" onClick={quitarCliente} className="text-gray-400 hover:text-gray-600 shrink-0">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-2">
                  <Search className="h-4 w-4 text-gray-400 shrink-0" />
                  <input
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                    placeholder="Busca por nombre..."
                    className="flex-1 py-2 text-sm outline-none bg-transparent"
                  />
                </div>
                {resultados.length > 0 && (
                  <ul className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-56 overflow-y-auto">
                    {resultados.map(c => (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => elegirCliente(c)}
                          className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-orange-50"
                        >
                          <span className="text-sm text-gray-800">{c.nombre}</span>
                          <span className="text-xs text-gray-400">{c.correo || c.telefono || '—'}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Fecha y hora */}
          <div>
            <Label>Fecha y hora *</Label>
            <Input type="datetime-local" value={fechaHora} onChange={e => setFechaHora(e.target.value)} />
          </div>

          {/* Terapeuta */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Correo del terapeuta</Label>
              <Input
                type="email"
                list="terapeutas-correos"
                value={terapeutaCorreo}
                onChange={e => elegirTerapeutaCorreo(e.target.value)}
                placeholder="correo@..."
              />
              <datalist id="terapeutas-correos">
                {correosSugeridos.map(c => <option key={c} value={c} />)}
              </datalist>
              <p className="text-xs text-gray-400 mt-0.5">Queda guardado para la próxima</p>
            </div>
            <div>
              <Label>Nombre del terapeuta</Label>
              <Input value={terapeutaNombre} onChange={e => setTerapeutaNombre(e.target.value)} placeholder="ej: Fabiola" />
            </div>
          </div>

          {/* Valor */}
          <div>
            <Label>Valor de la sesión</Label>
            <Input type="number" value={valor} onChange={e => setValor(e.target.value)} placeholder="0" />
            <p className="text-xs text-gray-400 mt-0.5">Genera el cobro por pagar. Tarifa del terapeuta, editable.</p>
          </div>

          {/* Notas */}
          <div>
            <Label>Notas</Label>
            <Textarea rows={2} value={notas} onChange={e => setNotas(e.target.value)} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving || !cliente || !fechaHora} className="bg-orange-600 hover:bg-orange-700">
              {saving ? 'Agendando...' : 'Agendar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
