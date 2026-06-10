'use client'

import { useMemo, useState } from 'react'
import { MANUAL, EntradaManual } from '@/lib/manual'
import { HelpCircle, X, ChevronDown, Lightbulb } from 'lucide-react'
import { cn } from '@/lib/utils'

function normalizar(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

// Puntúa cada entrada del manual según cuántas palabras de la pregunta
// aparecen en su título/keywords. Permite preguntar en lenguaje natural.
function buscar(pregunta: string): EntradaManual[] {
  const palabras = normalizar(pregunta).split(/\s+/).filter(p => p.length > 2)
  if (palabras.length === 0) return []
  const puntuadas = MANUAL.map(e => {
    const texto = normalizar(`${e.titulo} ${e.keywords} ${e.categoria}`)
    const score = palabras.reduce((s, p) => s + (texto.includes(p) ? 1 : 0), 0)
    return { e, score }
  })
  return puntuadas
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(x => x.e)
}

function Guia({ entrada, abierta, onToggle }: { entrada: EntradaManual; abierta: boolean; onToggle: () => void }) {
  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        <div>
          <p className="text-sm font-medium text-gray-800">{entrada.titulo}</p>
          <p className="text-xs text-gray-400">{entrada.categoria}</p>
        </div>
        <ChevronDown className={cn('h-4 w-4 text-gray-300 transition-transform shrink-0', abierta && 'rotate-180')} />
      </button>
      {abierta && (
        <div className="px-4 pb-4">
          <ol className="space-y-2 mt-1">
            {entrada.pasos.map((p, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-gray-700">
                <span className="shrink-0 w-5 h-5 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <span>{p}</span>
              </li>
            ))}
          </ol>
          {entrada.tip && (
            <div className="mt-3 flex gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
              <Lightbulb className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-800">{entrada.tip}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Botón flotante de ayuda: pregunta libre → guías paso a paso del manual.
export function HelpPanel() {
  const [open, setOpen] = useState(false)
  const [pregunta, setPregunta] = useState('')
  const [abiertaId, setAbiertaId] = useState<string | null>(null)

  const resultados = useMemo(() => buscar(pregunta), [pregunta])
  const mostrar = pregunta.trim() ? resultados : MANUAL

  const categorias = useMemo(() => {
    if (pregunta.trim()) return null
    const map = new Map<string, EntradaManual[]>()
    for (const e of MANUAL) {
      if (!map.has(e.categoria)) map.set(e.categoria, [])
      map.get(e.categoria)!.push(e)
    }
    return map
  }, [pregunta])

  return (
    <>
      {/* Botón flotante */}
      <button
        onClick={() => setOpen(true)}
        title="Ayuda — ¿cómo se hace?"
        className="fixed bottom-5 right-5 z-[9000] w-11 h-11 rounded-full bg-orange-600 hover:bg-orange-700 text-white shadow-lg flex items-center justify-center transition-all hover:scale-105"
      >
        <HelpCircle className="h-5 w-5" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[9500] bg-black/40 flex items-end sm:items-center justify-center sm:justify-end p-0 sm:p-5"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white w-full sm:w-[420px] sm:max-h-[85vh] max-h-[90vh] sm:rounded-2xl rounded-t-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-orange-50">
              <div>
                <p className="text-sm font-semibold text-gray-800">Centro de ayuda</p>
                <p className="text-xs text-gray-500">Escribe tu duda y te muestro el paso a paso</p>
              </div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-white transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Buscador */}
            <div className="px-4 pt-3 pb-2">
              <input
                autoFocus
                value={pregunta}
                onChange={e => { setPregunta(e.target.value); setAbiertaId(null) }}
                placeholder='ej: "cómo registro un pago" o "a quién llamo hoy"'
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400"
              />
            </div>

            {/* Resultados */}
            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
              {pregunta.trim() ? (
                mostrar.length > 0 ? (
                  <>
                    <p className="text-xs text-gray-400 pt-1">
                      {mostrar.length} guía{mostrar.length === 1 ? '' : 's'} relacionada{mostrar.length === 1 ? '' : 's'}:
                    </p>
                    {mostrar.map((e, i) => (
                      <Guia
                        key={e.id}
                        entrada={e}
                        abierta={abiertaId ? abiertaId === e.id : i === 0}
                        onToggle={() => setAbiertaId(abiertaId === e.id ? '__cerrada__' : e.id)}
                      />
                    ))}
                  </>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-400">No encontré una guía para eso 😕</p>
                    <p className="text-xs text-gray-400 mt-1">Prueba con otras palabras, ej: &quot;pago&quot;, &quot;cliente&quot;, &quot;whatsapp&quot;, &quot;etapa&quot;</p>
                  </div>
                )
              ) : (
                categorias && Array.from(categorias.entries()).map(([cat, entradas]) => (
                  <div key={cat}>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-2 pb-1">{cat}</p>
                    <div className="space-y-2">
                      {entradas.map(e => (
                        <Guia
                          key={e.id}
                          entrada={e}
                          abierta={abiertaId === e.id}
                          onToggle={() => setAbiertaId(abiertaId === e.id ? null : e.id)}
                        />
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
