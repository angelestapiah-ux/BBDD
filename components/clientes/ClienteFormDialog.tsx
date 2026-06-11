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
import { ETAPAS_FUNNEL, EtapaFunnel } from '@/lib/types'
import { ChevronDown, ChevronUp, Zap, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { PAISES, CIUDADES } from '@/lib/geo'

interface Duplicado {
  id: string
  nombre: string
  telefono: string | null
  correo: string | null
  etapa: string | null
  motivo: string
}

const ESTADOS_CIVILES = ['Soltero/a', 'Casado/a', 'Separado/a', 'Divorciado/a', 'Acuerdo Unión Civil', 'Viudo/a'] as const

const CANALES_COMUNES = [
  'Instagram', 'WhatsApp', 'Referido', 'Facebook', 'Web', 'Llamada', 'Correo', 'TikTok', 'Histórico', 'Otro'
]

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
  // Quick mode is default when creating (no initial data), full mode for editing
  const [modoRapido, setModoRapido] = useState(!initial)

  const [duplicados, setDuplicados] = useState<Duplicado[]>([])
  // Tras detectar duplicados al guardar, se exige un segundo click de confirmación
  const [confirmarDuplicado, setConfirmarDuplicado] = useState(false)

  useEffect(() => {
    setForm(initial || {})
    setModoRapido(!initial)
    setDuplicados([])
    setConfirmarDuplicado(false)
  }, [initial, open])

  async function buscarDuplicados(): Promise<Duplicado[]> {
    const params = new URLSearchParams()
    if (form.nombre) params.set('nombre', form.nombre)
    if (form.telefono) params.set('telefono', form.telefono)
    if (form.correo) params.set('correo', form.correo)
    if (initial?.id) params.set('excluir', initial.id)
    try {
      const res = await fetch(`/api/clientes/duplicados?${params}`)
      if (res.ok) {
        const json = await res.json()
        return json.duplicados || []
      }
    } catch { /* sin red: no bloquear el formulario */ }
    return []
  }

  // Detección de duplicados en vivo (debounce 500ms) mientras se escribe
  // nombre, teléfono o correo. Al editar, se excluye al propio cliente.
  useEffect(() => {
    if (!open) return
    const nombre = form.nombre || ''
    const telefono = form.telefono || ''
    const correo = form.correo || ''
    setConfirmarDuplicado(false)
    if (!telefono && !correo && nombre.length < 5) { setDuplicados([]); return }

    const t = setTimeout(async () => {
      setDuplicados(await buscarDuplicados())
    }, 500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, form.nombre, form.telefono, form.correo, initial?.id])

  function set(key: keyof Cliente, value: string) {
    setForm(prev => ({ ...prev, [key]: value || null }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    // Verificación final de duplicados ANTES de guardar (solo al crear).
    // Cubre el caso de escribir rápido y guardar antes de que aparezca la alerta.
    if (!initial && !confirmarDuplicado) {
      const dups = await buscarDuplicados()
      if (dups.length > 0) {
        setDuplicados(dups)
        setConfirmarDuplicado(true)
        setSaving(false)
        return
      }
    }

    // In quick mode, default etapa to 'nuevo' if not set
    const dataToSave = modoRapido ? { etapa: 'nuevo' as EtapaFunnel, ...form } : form
    await onSubmit(dataToSave)
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {title}
            {modoRapido && (
              <span className="inline-flex items-center gap-1 text-xs font-normal bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                <Zap size={11} /> Modo rápido
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Alerta de posibles duplicados */}
          {duplicados.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-yellow-800 mb-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                {duplicados.length === 1 ? 'Ya existe un cliente parecido' : `Ya existen ${duplicados.length} clientes parecidos`}
              </p>
              <div className="space-y-1">
                {duplicados.map(d => (
                  <div key={d.id} className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-yellow-900 truncate">
                      <span className="font-medium">{d.nombre}</span>
                      {' '}({d.motivo})
                      {d.telefono && ` · ${d.telefono}`}
                    </span>
                    <Link
                      href={`/clientes/${d.id}`}
                      target="_blank"
                      className="text-orange-600 hover:underline font-medium shrink-0"
                    >
                      Ver perfil →
                    </Link>
                  </div>
                ))}
              </div>
              <p className="text-xs text-yellow-700 mt-1.5">
                {confirmarDuplicado
                  ? 'Si estás segura de que es otra persona, presiona "Crear de todos modos".'
                  : 'Si es la misma persona, mejor actualiza su perfil en vez de crearla de nuevo.'}
              </p>
            </div>
          )}

          {modoRapido ? (
            /* ─── MODO RÁPIDO: 3 campos ─── */
            <div className="space-y-4">
              <div>
                <Label htmlFor="nombre">Nombre <span className="text-red-500">*</span></Label>
                <Input
                  id="nombre"
                  autoFocus
                  value={form.nombre || ''}
                  onChange={e => set('nombre', e.target.value)}
                  placeholder="Nombre completo..."
                  required
                />
              </div>

              <div>
                <Label htmlFor="telefono">Teléfono</Label>
                <Input
                  id="telefono"
                  value={form.telefono || ''}
                  onChange={e => set('telefono', e.target.value)}
                  placeholder="+56 9 1234 5678"
                />
              </div>

              <div>
                <Label htmlFor="procedencia">Canal de origen</Label>
                <div className="flex gap-2 flex-wrap mt-1.5">
                  {CANALES_COMUNES.map(canal => (
                    <button
                      key={canal}
                      type="button"
                      onClick={() => setForm(prev => ({
                        ...prev,
                        procedencia: prev.procedencia === canal ? null : canal
                      }))}
                      className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                        form.procedencia === canal
                          ? 'bg-orange-600 text-white border-orange-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300 hover:text-orange-600'
                      }`}
                    >
                      {canal}
                    </button>
                  ))}
                </div>
                {form.procedencia && !CANALES_COMUNES.includes(form.procedencia) && (
                  <p className="text-xs text-gray-500 mt-1">Canal: {form.procedencia}</p>
                )}
              </div>

              <button
                type="button"
                onClick={() => setModoRapido(false)}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-orange-600 transition-colors w-full justify-center pt-1 border-t border-gray-100"
              >
                <ChevronDown size={14} />
                Ver todos los campos
              </button>
            </div>
          ) : (
            /* ─── MODO COMPLETO ─── */
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
                <Label htmlFor="pais">País</Label>
                <Input id="pais" list="lista-paises" value={form.pais || ''} onChange={e => set('pais', e.target.value)} placeholder="ej: Chile" />
                <datalist id="lista-paises">
                  {PAISES.map(p => <option key={p} value={p} />)}
                </datalist>
              </div>
              <div>
                <Label htmlFor="ciudad">Ciudad</Label>
                <Input id="ciudad" list="lista-ciudades" value={form.ciudad || ''} onChange={e => set('ciudad', e.target.value)} placeholder="ej: Santiago" />
                <datalist id="lista-ciudades">
                  {(CIUDADES[form.pais || 'Chile'] || CIUDADES['Chile']).map(c => <option key={c} value={c} />)}
                </datalist>
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

              {/* Etapa del funnel */}
              <div className="col-span-2">
                <Label htmlFor="etapa">Etapa en el funnel</Label>
                <Select
                  value={form.etapa || 'nuevo'}
                  onValueChange={v => setForm(prev => ({ ...prev, etapa: v as EtapaFunnel }))}
                >
                  <SelectTrigger id="etapa"><SelectValue placeholder="Seleccionar etapa..." /></SelectTrigger>
                  <SelectContent>
                    {ETAPAS_FUNNEL.map(e => (
                      <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tipo de cliente y campos condicionales */}
              <div className="col-span-2">
                <Label>Tipo de cliente</Label>
                <TiposClienteSelect
                  value={form.tipos_cliente || []}
                  onChange={v => setForm(prev => ({ ...prev, tipos_cliente: v }))}
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="terapeuta">Terapeuta (si es paciente)</Label>
                <Input
                  id="terapeuta"
                  placeholder="Nombre del terapeuta que lo atiende..."
                  value={form.terapeuta || ''}
                  onChange={e => set('terapeuta', e.target.value)}
                />
                <p className="text-xs text-gray-400 mt-0.5">
                  Con terapeuta asignado, cada pago genera automáticamente la boleta de honorarios pendiente.
                </p>
              </div>
              {form.terapeuta && (
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

              {!initial && (
                <div className="col-span-2">
                  <button
                    type="button"
                    onClick={() => setModoRapido(true)}
                    className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-orange-600 transition-colors"
                  >
                    <ChevronUp size={14} />
                    Volver al modo rápido
                  </button>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button
              type="submit"
              disabled={saving}
              className={confirmarDuplicado
                ? 'bg-yellow-600 hover:bg-yellow-700'
                : 'bg-orange-600 hover:bg-orange-700'}
            >
              {saving ? 'Guardando...' : confirmarDuplicado ? '⚠ Crear de todos modos' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
