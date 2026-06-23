'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Users, Undo2, MessageSquare, ChevronRight } from 'lucide-react'
import { ETAPAS_FUNNEL } from '@/lib/types'
import { TIPOS_CLIENTE } from '@/lib/clasificar-tipo'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  actividad: string
}

type Preview = { cumplen: number; yaLaTienen: number; seAsignaran: number; muestra: string[] }
type Aplicado = { asignados: number; lote: string }

const TODOS = '__todos__'

export function AsignacionMasivaDialog({ open, onOpenChange, actividad }: Props) {
  const [genero, setGenero] = useState(TODOS)
  const [procedencia, setProcedencia] = useState(TODOS)
  const [tipo, setTipo] = useState(TODOS)
  const [etapa, setEtapa] = useState(TODOS)
  const [procedencias, setProcedencias] = useState<string[]>([])

  const [preview, setPreview] = useState<Preview | null>(null)
  const [aplicado, setAplicado] = useState<Aplicado | null>(null)
  const [cargando, setCargando] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!open) return
    // Reset al abrir
    setGenero(TODOS); setProcedencia(TODOS); setTipo(TODOS); setEtapa(TODOS)
    setPreview(null); setAplicado(null); setErr('')
    fetch('/api/actividades/asignar-masiva')
      .then(r => r.ok ? r.json() : { procedencias: [] })
      .then(d => setProcedencias(d.procedencias || []))
      .catch(() => setProcedencias([]))
  }, [open])

  const sinFiltro = genero === TODOS && procedencia === TODOS && tipo === TODOS && etapa === TODOS

  function filtros() {
    return {
      genero: genero === TODOS ? null : genero,
      procedencia: procedencia === TODOS ? null : procedencia,
      tipo: tipo === TODOS ? null : tipo,
      etapa: etapa === TODOS ? null : etapa,
    }
  }

  // Al cambiar un filtro, invalida la vista previa anterior.
  function onFiltro(setter: (v: string) => void) {
    return (v: string) => { if (v) { setter(v); setPreview(null); setErr('') } }
  }

  async function previsualizar() {
    setErr(''); setCargando(true); setPreview(null)
    try {
      const res = await fetch('/api/actividades/asignar-masiva', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actividad_nombre: actividad, filtros: filtros(), aplicar: false }),
      })
      const r = await res.json()
      if (res.ok) setPreview(r)
      else setErr(r.error || 'No se pudo previsualizar.')
    } catch { setErr('No se pudo previsualizar.') }
    setCargando(false)
  }

  async function aplicar() {
    setErr(''); setCargando(true)
    try {
      const res = await fetch('/api/actividades/asignar-masiva', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actividad_nombre: actividad, filtros: filtros(), aplicar: true }),
      })
      const r = await res.json()
      if (res.ok) setAplicado({ asignados: r.asignados ?? 0, lote: r.lote })
      else setErr(r.error || 'No se pudo asignar.')
    } catch { setErr('No se pudo asignar.') }
    setCargando(false)
  }

  async function deshacer() {
    if (!aplicado?.lote) return
    if (!confirm('¿Deshacer esta carga completa? Se quitará la actividad de los perfiles asignados en ella.')) return
    setCargando(true)
    try {
      const res = await fetch('/api/actividades/asignar-masiva/deshacer', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lote: aplicado.lote }),
      })
      const r = await res.json()
      if (res.ok) { setAplicado(null); setPreview(null); setErr('') }
      else setErr(r.error || 'No se pudo deshacer.')
    } catch { setErr('No se pudo deshacer.') }
    setCargando(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users size={18} className="text-orange-600" /> Asignar actividad en masa
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg bg-orange-50 border border-orange-200 px-3 py-2 text-sm">
            <span className="text-gray-500">Actividad:</span>{' '}
            <span className="font-semibold text-orange-800">{actividad}</span>
          </div>

          {/* ── Estado: éxito ── */}
          {aplicado ? (
            <div className="space-y-3">
              <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-4 text-center">
                <div className="text-3xl font-bold text-green-700">{aplicado.asignados}</div>
                <div className="text-sm text-gray-600">
                  {aplicado.asignados === 1 ? 'cliente quedó suscrito' : 'clientes quedaron suscritos'} a la actividad
                </div>
              </div>
              <Link
                href={`/seguimientos?actividad=${encodeURIComponent(actividad)}`}
                className="flex items-center justify-between gap-2 w-full rounded-lg bg-orange-600 text-white px-4 py-2.5 text-sm font-medium hover:bg-orange-700"
              >
                <span className="flex items-center gap-2"><MessageSquare size={15} /> Registrar seguimiento masivo</span>
                <ChevronRight size={16} />
              </Link>
              <button
                onClick={deshacer}
                disabled={cargando}
                className="flex items-center justify-center gap-2 w-full rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-60"
              >
                <Undo2 size={15} /> Deshacer esta carga
              </button>
              {err && <p className="text-sm text-red-600">{err}</p>}
            </div>
          ) : (
            <>
              {/* ── Filtros ── */}
              <p className="text-xs text-gray-500">Define a quiénes se les asignará. Combina los filtros que quieras (se aplican juntos).</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Género</Label>
                  <Select value={genero} onValueChange={onFiltro(setGenero)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={TODOS}>Todos</SelectItem>
                      <SelectItem value="femenino">Femenino</SelectItem>
                      <SelectItem value="masculino">Masculino</SelectItem>
                      <SelectItem value="otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tipo de cliente</Label>
                  <Select value={tipo} onValueChange={onFiltro(setTipo)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={TODOS}>Todos</SelectItem>
                      {TIPOS_CLIENTE.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Etapa</Label>
                  <Select value={etapa} onValueChange={onFiltro(setEtapa)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={TODOS}>Todas</SelectItem>
                      {ETAPAS_FUNNEL.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Canal</Label>
                  <Select value={procedencia} onValueChange={onFiltro(setProcedencia)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={TODOS}>Todos</SelectItem>
                      {procedencias.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* ── Vista previa ── */}
              {preview && (
                <div className="rounded-lg border border-gray-200 p-3 space-y-2">
                  <div className="flex items-center justify-around text-center">
                    <div>
                      <div className="text-xl font-bold text-gray-900">{preview.cumplen}</div>
                      <div className="text-xs text-gray-500">cumplen</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold text-gray-400">{preview.yaLaTienen}</div>
                      <div className="text-xs text-gray-500">ya la tienen</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold text-orange-700">{preview.seAsignaran}</div>
                      <div className="text-xs text-gray-500">se asignará</div>
                    </div>
                  </div>
                  {preview.muestra.length > 0 && (
                    <p className="text-xs text-gray-400 border-t border-gray-100 pt-2">
                      Ej: {preview.muestra.slice(0, 8).join(' · ')}{preview.seAsignaran > 8 ? '…' : ''}
                    </p>
                  )}
                </div>
              )}

              {err && <p className="text-sm text-red-600">{err}</p>}

              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                {!preview ? (
                  <Button type="button" onClick={previsualizar} disabled={cargando || sinFiltro} className="bg-gray-800 hover:bg-gray-900">
                    {cargando ? 'Calculando…' : 'Previsualizar'}
                  </Button>
                ) : (
                  <Button type="button" onClick={aplicar} disabled={cargando || preview.seAsignaran === 0} className="bg-orange-600 hover:bg-orange-700">
                    {cargando ? 'Asignando…' : `Asignar a ${preview.seAsignaran}`}
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
