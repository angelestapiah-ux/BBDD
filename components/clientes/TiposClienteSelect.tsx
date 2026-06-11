'use client'

import { useEffect, useState, useRef } from 'react'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TipoCliente { id: string; nombre: string }
interface ActividadOpcion { id: string; nombre: string }

interface Props {
  value: string[]
  onChange: (value: string[]) => void
}

// Selector de tipos de cliente. Las opciones combinan:
// 1. Las ACTIVIDADES del catálogo (sincronía con la pestaña Actividades) —
//    al guardar el cliente, estas se registran también como asistencias.
// 2. Los tipos configurables (Paciente, Docente, etc.) de Configuración.
export function TiposClienteSelect({ value, onChange }: Props) {
  const [tipos, setTipos] = useState<TipoCliente[]>([])
  const [actividades, setActividades] = useState<ActividadOpcion[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/tipos-cliente').then(r => r.json()).then(d => setTipos(Array.isArray(d) ? d : []))
    fetch('/api/actividades').then(r => r.json()).then(d => setActividades(Array.isArray(d) ? d : []))
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function toggle(nombre: string) {
    if (value.includes(nombre)) onChange(value.filter(v => v !== nombre))
    else onChange([...value, nombre])
  }

  function remove(nombre: string, e: React.MouseEvent) {
    e.stopPropagation()
    onChange(value.filter(v => v !== nombre))
  }

  // No duplicar: si una actividad tiene el mismo nombre que un tipo, mostrarla solo como actividad
  const nombresActividades = new Set(actividades.map(a => a.nombre))
  const tiposFiltrados = tipos.filter(t => !nombresActividades.has(t.nombre))

  const renderOpcion = (key: string, nombre: string) => (
    <label key={key} className="flex items-center gap-2 px-3 py-2 hover:bg-orange-50 cursor-pointer text-sm">
      <input
        type="checkbox"
        checked={value.includes(nombre)}
        onChange={() => toggle(nombre)}
        className="accent-orange-600"
      />
      {nombre}
    </label>
  )

  return (
    <div ref={ref} className="relative">
      <div
        className="min-h-10 border border-input rounded-md px-3 py-2 flex flex-wrap gap-1 items-center cursor-pointer bg-background hover:border-orange-400 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        {value.length === 0 && (
          <span className="text-sm text-muted-foreground">Seleccionar tipos...</span>
        )}
        {value.map(v => (
          <Badge key={v} variant="secondary" className="text-xs gap-1 pr-1">
            {v}
            <button type="button" onClick={e => remove(v, e)} className="hover:text-red-500">
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <ChevronDown className={cn('h-4 w-4 text-gray-400 ml-auto shrink-0 transition-transform', open && 'rotate-180')} />
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg py-1 max-h-60 overflow-auto">
          {actividades.length > 0 && (
            <>
              <p className="px-3 pt-1.5 pb-0.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Actividades del catálogo
              </p>
              {actividades.map(a => renderOpcion(`act-${a.id}`, a.nombre))}
            </>
          )}
          {tiposFiltrados.length > 0 && (
            <>
              <p className="px-3 pt-2 pb-0.5 text-xs font-semibold text-gray-400 uppercase tracking-wide border-t border-gray-100 mt-1">
                Otros tipos
              </p>
              {tiposFiltrados.map(t => renderOpcion(`tipo-${t.id}`, t.nombre))}
            </>
          )}
          {actividades.length === 0 && tiposFiltrados.length === 0 && (
            <p className="text-sm text-gray-400 px-3 py-2">Sin tipos ni actividades configuradas</p>
          )}
        </div>
      )}
    </div>
  )
}
