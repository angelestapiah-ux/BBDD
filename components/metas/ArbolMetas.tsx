'use client'

import { useMemo, useState } from 'react'
import { ChevronRight, ChevronDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  construirArbol, evaluarMeta, formatearValor, ETIQUETA_NIVEL,
  type Meta, type NodoMeta, type Semaforo,
} from '@/lib/metas'

const PROFUNDIDAD_MAXIMA = 12

const SEMAFORO_PUNTO: Record<Semaforo, string> = {
  verde:        'bg-green-500',
  amarillo:     'bg-yellow-500',
  rojo:         'bg-rose-500',
  sin_medicion: 'bg-gray-300',
  sin_meta:     'bg-gray-200 ring-1 ring-inset ring-gray-300',
  por_comenzar: 'bg-slate-300',
}

const SEMAFORO_TEXTO: Record<Semaforo, string> = {
  verde:        'text-green-700',
  amarillo:     'text-yellow-700',
  rojo:         'text-rose-600',
  sin_medicion: 'text-gray-400',
  sin_meta:     'text-gray-400',
  por_comenzar: 'text-slate-500',
}

const CLASE_DATO_BADGE: Record<Meta['clase_dato'], string> = {
  verificado: 'bg-green-50 text-green-700 ring-green-200',
  modelo:     'bg-blue-50 text-blue-700 ring-blue-200',
  estimado:   'bg-amber-50 text-amber-700 ring-amber-200',
}

const RESPONSABLE_BADGE: Record<Meta['responsable'], string> = {
  Renova:  'bg-orange-50 text-orange-700 ring-orange-200',
  Agencia: 'bg-violet-50 text-violet-700 ring-violet-200',
}

function Badge({ texto, clases }: { texto: string; clases: string }) {
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset whitespace-nowrap', clases)}>
      {texto}
    </span>
  )
}

function Fila({
  nodo, profundidad, abiertos, alternar, hoy,
}: {
  nodo: NodoMeta
  profundidad: number
  abiertos: Set<string>
  alternar: (id: string) => void
  hoy: Date
}) {
  const { meta, hijos } = nodo
  const tieneHijos = hijos.length > 0
  const abierto = abiertos.has(meta.id)
  const evaluacion = evaluarMeta(meta, null, hoy)

  return (
    <>
      <div
        className="flex items-start gap-2 py-2 border-b border-gray-100 hover:bg-orange-50/40 transition-colors"
        style={{ paddingLeft: `${Math.min(profundidad, 6) * 18}px` }}
      >
        {tieneHijos ? (
          <button
            type="button"
            onClick={() => alternar(meta.id)}
            aria-expanded={abierto}
            aria-label={abierto ? `Contraer ${meta.nombre}` : `Expandir ${meta.nombre}`}
            className="mt-0.5 shrink-0 rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            {abierto ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        ) : (
          <span className="mt-0.5 shrink-0 p-0.5 text-gray-200"><Minus className="h-4 w-4" /></span>
        )}

        <span
          className={cn('mt-2 h-2.5 w-2.5 shrink-0 rounded-full', SEMAFORO_PUNTO[evaluacion.semaforo])}
          title={evaluacion.etiqueta}
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-sm font-medium text-gray-900">{meta.nombre}</span>
            <span className="font-mono text-[11px] text-gray-400">{meta.id}</span>
            <Badge texto={ETIQUETA_NIVEL[meta.nivel] ?? `Nivel ${meta.nivel}`} clases="bg-gray-50 text-gray-600 ring-gray-200" />
            <Badge texto={meta.clase_dato} clases={CLASE_DATO_BADGE[meta.clase_dato]} />
            <Badge texto={meta.responsable} clases={RESPONSABLE_BADGE[meta.responsable]} />
            {meta.tipo_indicador === 'leading' && (
              <Badge texto="leading" clases="bg-sky-50 text-sky-700 ring-sky-200" />
            )}
          </div>
          <p className="mt-0.5 text-xs text-gray-500">
            {meta.metrica}
            {meta.canal !== null ? ` · ${meta.canal}` : ''}
            {meta.periodo !== null ? ` · ${meta.periodicidad}` : ''}
          </p>
        </div>

        <div className="w-32 shrink-0 text-right sm:w-52">
          <p className="text-sm font-semibold break-words text-gray-900">
            {formatearValor(meta.valor_meta, meta.unidad)}
          </p>
          <p className={cn('text-xs', SEMAFORO_TEXTO[evaluacion.semaforo])}>
            {evaluacion.etiqueta}
            {evaluacion.objetivoALaFecha !== null && meta.periodicidad === 'anual' && (
              <span className="text-gray-400">
                {' '}· a la fecha {formatearValor(evaluacion.objetivoALaFecha, meta.unidad)}
              </span>
            )}
          </p>
        </div>
      </div>

      {tieneHijos && abierto && profundidad < PROFUNDIDAD_MAXIMA &&
        hijos.map((h) => (
          <Fila
            key={h.meta.id}
            nodo={h}
            profundidad={profundidad + 1}
            abiertos={abiertos}
            alternar={alternar}
            hoy={hoy}
          />
        ))}
    </>
  )
}

export default function ArbolMetas({ metas, hoyISO }: { metas: Meta[]; hoyISO: string }) {
  const arbol = useMemo(() => construirArbol(metas), [metas])
  const conHijos = useMemo(() => {
    const ids: string[] = []
    const recorrer = (nodos: NodoMeta[], p: number): void => {
      if (p > PROFUNDIDAD_MAXIMA) return
      for (const n of nodos) {
        if (n.hijos.length > 0) ids.push(n.meta.id)
        recorrer(n.hijos, p + 1)
      }
    }
    recorrer(arbol, 0)
    return ids
  }, [arbol])

  const [abiertos, setAbiertos] = useState<Set<string>>(() => new Set(conHijos))
  const hoy = useMemo(() => new Date(`${hoyISO}T12:00:00`), [hoyISO])

  function alternar(id: string) {
    setAbiertos((previos) => {
      const siguiente = new Set(previos)
      if (siguiente.has(id)) siguiente.delete(id)
      else siguiente.add(id)
      return siguiente
    })
  }

  if (metas.length === 0) {
    return <p className="py-8 text-center text-sm text-gray-400">Aún sin metas para mostrar.</p>
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-xs text-gray-400">
          {metas.length} metas · jerarquía según meta padre
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setAbiertos(new Set(conHijos))}
            className="rounded-md px-2 py-1 text-xs font-medium text-orange-700 hover:bg-orange-50"
          >
            Expandir todo
          </button>
          <button
            type="button"
            onClick={() => setAbiertos(new Set())}
            className="rounded-md px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100"
          >
            Contraer todo
          </button>
        </div>
      </div>

      <div className="border-t border-gray-100">
        {arbol.map((n) => (
          <Fila key={n.meta.id} nodo={n} profundidad={0} abiertos={abiertos} alternar={alternar} hoy={hoy} />
        ))}
      </div>
    </div>
  )
}
