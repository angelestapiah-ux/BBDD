'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { CalendarClock, Plus, Search, X, Pencil } from 'lucide-react'
import { toast } from 'sonner'

interface SesionRow {
  id: string
  cliente_id: string
  fecha_hora: string
  terapeuta_nombre: string | null
  terapeuta_correo: string | null
  valor: number | null
  duracion_min: number | null
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

// Opciones de hora cada 30 minutos (00:00 … 23:30)
const HORAS = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, '0')
  const m = i % 2 ? '30' : '00'
  return `${h}:${m}`
})

const DURACIONES = [
  { min: '30', label: '30 min' },
  { min: '45', label: '45 min' },
  { min: '60', label: '1 hora' },
  { min: '90', label: '1 hora 30 min' },
  { min: '120', label: '2 horas' },
]

function pad(n: number) { return String(n).padStart(2, '0') }
function isoToLocalParts(iso: string) {
  const d = new Date(iso)
  return {
    fecha: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    hora: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  }
}
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
  const [editando, setEditando] = useState<SesionRow | null>(null)
  const [googleConectado, setGoogleConectado] = useState<boolean | null>(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
    const res = await fetch(`/api/sesiones?desde=${encodeURIComponent(hoy.toISOString())}`)
    const d = await res.json()
    setSesiones(Array.isArray(d) ? d : [])
    setLoading(false)
  }, [])
  useEffect(() => { cargar() }, [cargar])

  // Estado de conexión con Google Calendar + avisos de vuelta del consentimiento
  useEffect(() => {
    fetch('/api/google/estado').then(r => r.json()).then(d => setGoogleConectado(!!d?.conectado)).catch(() => setGoogleConectado(false))
    const g = new URLSearchParams(window.location.search).get('google')
    if (g === 'ok') toast.success('Google Calendar conectado')
    else if (g === 'cuenta') toast.error('Conectaste una cuenta distinta a la del calendario')
    else if (g === 'sintoken') toast.error('Google no entregó el permiso; reintenta')
    else if (g === 'error') toast.error('Inténtalo nuevamente para conectar Google')
    if (g) window.history.replaceState({}, '', '/sesiones')
  }, [])

  function abrirNueva() { setEditando(null); setOpen(true) }
  function abrirEditar(s: SesionRow) { setEditando(s); setOpen(true) }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-6 w-6 text-orange-600" />
          <h1 className="text-2xl font-bold text-gray-800">Sesiones</h1>
        </div>
        <div className="flex items-center gap-2">
          {googleConectado === false && (
            <a href="/api/google/auth" className="text-xs font-medium px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:border-orange-400 hover:text-orange-700">
              Conectar Google
            </a>
          )}
          {googleConectado && (
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-700">Calendar conectado</span>
          )}
          <Button onClick={abrirNueva} className="bg-orange-600 hover:bg-orange-700">
            <Plus className="h-4 w-4 mr-1" /> Agendar sesión
          </Button>
        </div>
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
                <Link href={`/clientes/${s.cliente_id}`} className="text-sm font-semibold text-gray-800 truncate hover:text-orange-700 hover:underline">
                  {s.clientes?.nombre ?? 'Paciente'}
                </Link>
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
                  : s.estado === 'anulada' ? 'bg-red-100 text-red-700'
                  : s.estado === 'reagendada' ? 'bg-amber-100 text-amber-700'
                  : 'bg-orange-100 text-orange-700'
                }`}>{s.estado}</span>
                <Button size="sm" variant="ghost" className="h-7 text-xs text-gray-500 hover:text-orange-700" onClick={() => abrirEditar(s)}>
                  <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <SesionDialog open={open} onOpenChange={setOpen} onSaved={cargar} sesion={editando} />
    </div>
  )
}

function SesionDialog({ open, onOpenChange, onSaved, sesion }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSaved: () => void
  sesion: SesionRow | null
}) {
  const editMode = !!sesion

  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState<ClienteLite[]>([])
  const [cliente, setCliente] = useState<ClienteLite | null>(null)

  const [fecha, setFecha] = useState('')
  const [hora, setHora] = useState('')
  const [duracion, setDuracion] = useState('60')
  const [terapeutaCorreo, setTerapeutaCorreo] = useState('')
  const [terapeutaNombre, setTerapeutaNombre] = useState('')
  const [valor, setValor] = useState('')
  const [notas, setNotas] = useState('')
  const [estado, setEstado] = useState('agendada')

  const [terapeutas, setTerapeutas] = useState<TerapeutaLite[]>([])
  const [saving, setSaving] = useState(false)

  // Prefill al abrir (modo crear = limpio, modo editar = datos de la sesión)
  useEffect(() => {
    if (!open) return
    if (sesion) {
      const { fecha: f, hora: h } = isoToLocalParts(sesion.fecha_hora)
      setCliente({
        id: sesion.cliente_id,
        nombre: sesion.clientes?.nombre ?? 'Paciente',
        correo: sesion.clientes?.correo ?? null,
        telefono: sesion.clientes?.telefono ?? null,
        tipos_cliente: ['Paciente'],
        terapeuta: null,
        modalidad_paciente: null,
      })
      setBusqueda(sesion.clientes?.nombre ?? '')
      setFecha(f); setHora(h)
      setTerapeutaCorreo(sesion.terapeuta_correo ?? '')
      setTerapeutaNombre(sesion.terapeuta_nombre ?? '')
      setValor(sesion.valor != null ? String(sesion.valor) : '')
      setNotas(sesion.notas ?? '')
      setEstado(sesion.estado || 'agendada')
      setDuracion(sesion.duracion_min ? String(sesion.duracion_min) : '60')
    } else {
      setCliente(null); setBusqueda(''); setResultados([])
      setFecha(''); setHora(''); setDuracion('60'); setTerapeutaCorreo(''); setTerapeutaNombre(''); setValor(''); setNotas(''); setEstado('agendada')
    }
  }, [open, sesion])

  useEffect(() => {
    if (!open) return
    fetch('/api/terapeutas').then(r => r.json()).then(d => setTerapeutas(Array.isArray(d) ? d : [])).catch(() => {})
  }, [open])

  // Buscar pacientes por nombre (solo en modo crear)
  useEffect(() => {
    if (editMode || cliente) return
    if (busqueda.trim().length < 2) { setResultados([]); return }
    let cancel = false
    const t = setTimeout(async () => {
      const res = await fetch(`/api/clientes-buscar?q=${encodeURIComponent(busqueda.trim())}`)
      const data = await res.json().catch(() => [])
      if (!cancel) setResultados(Array.isArray(data) ? (data as ClienteLite[]) : [])
    }, 250)
    return () => { cancel = true; clearTimeout(t) }
  }, [busqueda, cliente, editMode])

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

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    if (!cliente) { toast.error('Elige el paciente'); return }
    if (!fecha || !hora) { toast.error('Indica la fecha y la hora de la sesión'); return }
    setSaving(true)
    const fechaHoraLocal = `${fecha}T${hora}`
    const payload = {
      cliente_id: cliente.id,
      fecha_hora: new Date(fechaHoraLocal).toISOString(),
      fecha_dia: fecha,
      terapeuta_nombre: terapeutaNombre,
      terapeuta_correo: terapeutaCorreo,
      valor,
      notas,
      estado,
      duracion_min: Number(duracion) || 60,
    }
    const res = editMode
      ? await fetch(`/api/sesiones/${sesion!.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      : await fetch('/api/sesiones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    setSaving(false)
    if (res.ok) {
      toast.success(editMode ? 'Sesión actualizada' : 'Sesión agendada · cobro generado en Cobranza')
      onOpenChange(false); onSaved()
    } else {
      const err = await res.json().catch(() => ({}))
      toast.error(err.error || 'Inténtalo nuevamente')
    }
  }

  const correosSugeridos = Array.from(new Set(terapeutas.map(t => t.correo).filter(Boolean)))
  const esPaciente = cliente?.tipos_cliente?.includes('Paciente')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editMode ? 'Editar sesión' : 'Agendar sesión'}</DialogTitle></DialogHeader>
        <form onSubmit={guardar} className="space-y-4">
          {/* Paciente */}
          <div>
            <Label>Paciente *</Label>
            {cliente ? (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-orange-200 bg-orange-50/50 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{cliente.nombre}</p>
                  <p className="text-xs text-gray-500">
                    {editMode ? 'Paciente' : (esPaciente ? 'Paciente' : 'Se marcará como Paciente al agendar')}
                  </p>
                </div>
                {!editMode && (
                  <button type="button" onClick={quitarCliente} className="text-gray-400 hover:text-gray-600 shrink-0">
                    <X className="h-4 w-4" />
                  </button>
                )}
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

          {/* Fecha + Hora */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Fecha *</Label>
              <Input type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
            </div>
            <div>
              <Label>Hora *</Label>
              <Input
                list="horas-lista"
                value={hora}
                onChange={e => setHora(e.target.value)}
                placeholder="HH:mm"
              />
              <datalist id="horas-lista">
                {HORAS.map(h => <option key={h} value={h} />)}
              </datalist>
              <p className="text-xs text-gray-400 mt-0.5">Cada 30 min, o escríbela</p>
            </div>
          </div>

          {/* Duración */}
          <div>
            <Label>Duración</Label>
            <select
              value={duracion}
              onChange={e => setDuracion(e.target.value)}
              className="w-full h-10 rounded-md border border-gray-200 px-3 text-sm"
            >
              {DURACIONES.map(d => <option key={d.min} value={d.min}>{d.label}</option>)}
            </select>
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
              <p className="text-xs text-gray-400 mt-0.5">Elígelo o escríbelo a mano</p>
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

          {/* Estado (solo al editar) */}
          {editMode && (
            <div>
              <Label>Estado</Label>
              <select
                value={estado}
                onChange={e => setEstado(e.target.value)}
                className="w-full h-10 rounded-md border border-gray-200 px-3 text-sm"
              >
                <option value="agendada">Agendada</option>
                <option value="realizada">Realizada</option>
                <option value="cancelada">Cancelada (elimina el evento y el cobro)</option>
                <option value="anulada">Anulada (marca el evento, retira el cobro)</option>
                <option value="reagendada">Reagendada (marca el evento, retira el cobro)</option>
              </select>
            </div>
          )}

          {/* Notas */}
          <div>
            <Label>Notas</Label>
            <Textarea rows={2} value={notas} onChange={e => setNotas(e.target.value)} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving || !cliente || !fecha || !hora} className="bg-orange-600 hover:bg-orange-700">
              {saving ? 'Guardando...' : (editMode ? 'Guardar cambios' : 'Agendar')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
