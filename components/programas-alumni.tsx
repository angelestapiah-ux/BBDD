'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { GraduationCap, Plus, X } from 'lucide-react'
import { toast } from 'sonner'

type Programa = { id: string; programa: string; anio: number | null }

const PROGRAMAS = ['Practitioner', 'Máster', 'Trainer', 'Nivel 1', 'Otro']
const ANIOS: number[] = Array.from({ length: 27 }, (_, i) => 2027 - i) // 2027 → 2001

export default function ProgramasAlumni({ clienteId, esAlumni }: { clienteId: string; esAlumni: boolean }) {
  const [items, setItems] = useState<Programa[]>([])
  const [prog, setProg] = useState('')
  const [progOtro, setProgOtro] = useState('')
  const [anio, setAnio] = useState('')
  const [guardando, setGuardando] = useState(false)

  const cargar = useCallback(async () => {
    const res = await fetch(`/api/alumni-programas?cliente_id=${clienteId}`)
    const data = await res.json()
    setItems(Array.isArray(data) ? data : [])
  }, [clienteId])

  useEffect(() => { if (esAlumni) cargar() }, [esAlumni, cargar])

  if (!esAlumni) return null

  async function agregar() {
    const programa = prog === 'Otro' ? progOtro.trim() : prog
    if (!programa) { toast.error('Elige o escribe el programa'); return }
    setGuardando(true)
    const res = await fetch('/api/alumni-programas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cliente_id: clienteId, programa, anio: anio || null }),
    })
    setGuardando(false)
    if (res.ok) {
      toast.success('Programa agregado')
      setProg(''); setProgOtro(''); setAnio('')
      cargar()
    } else {
      toast.error('Avancemos de nuevo: el programa no se guardó')
    }
  }

  async function quitar(id: string) {
    const res = await fetch(`/api/alumni-programas?id=${id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Programa quitado'); cargar() } else { toast.error('No se pudo quitar') }
  }

  return (
    <Card className="mb-6 border-orange-200">
      <CardHeader className="py-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2 text-orange-700">
          <GraduationCap className="h-4 w-4" /> Programas cursados (Alumni)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {items.map(it => (
              <span key={it.id} className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-full pl-3 pr-1 py-1 text-sm">
                <span className="font-medium text-orange-800">{it.programa}</span>
                {it.anio ? <span className="text-orange-600">· {it.anio}</span> : null}
                <button onClick={() => quitar(it.id)} title="Quitar" className="p-1 rounded-full text-orange-400 hover:text-white hover:bg-orange-500 transition-colors">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">Aún sin programas registrados. Agrega el primero abajo.</p>
        )}

        <div className="flex flex-wrap items-end gap-2 pt-1">
          <div className="min-w-40">
            <p className="text-xs text-gray-400 mb-1">Programa cursado</p>
            <Select value={prog} onValueChange={v => setProg(v || '')}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
              <SelectContent>
                {PROGRAMAS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {prog === 'Otro' && (
            <div className="min-w-40">
              <p className="text-xs text-gray-400 mb-1">¿Cuál?</p>
              <Input className="h-9" placeholder="Nombre del programa" value={progOtro} onChange={e => setProgOtro(e.target.value)} />
            </div>
          )}
          <div className="w-28">
            <p className="text-xs text-gray-400 mb-1">Año</p>
            <Select value={anio} onValueChange={v => setAnio(v || '')}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Año" /></SelectTrigger>
              <SelectContent>
                {ANIOS.map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={agregar} disabled={guardando} size="sm" className="h-9">
            <Plus className="h-4 w-4 mr-1" /> Agregar
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
