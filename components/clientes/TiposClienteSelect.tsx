'use client'

import { useEffect, useState, useRef } from 'react'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TipoCliente { id: string; nombre: string }

interface Props {
  value: string[]
  onChange: (value: string[]) => void
}

export function TiposClienteSelect({ value, onChange }: Props) {
  const [tipos, setTipos] = useState<TipoCliente[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/tipos-cliente').then(r => r.json()).then(d => setTipos(Array.isArray(d) ? d : []))
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
          {tipos.length === 0 && (
            <p className="text-sm text-gray-400 px-3 py-2">Sin tipos configurados</p>
          )}
          {tipos.map(t => (
            <label key={t.id} className="flex items-center gap-2 px-3 py-2 hover:bg-orange-50 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={value.includes(t.nombre)}
                onChange={() => toggle(t.nombre)}
                className="accent-orange-600"
              />
              {t.nombre}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
