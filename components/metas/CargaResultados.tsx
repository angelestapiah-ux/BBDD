'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, Check, AlertCircle, Loader2, Cpu, Hand } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  valoresVigentes, evaluarMeta, formatearValor, ETIQUETA_NIVEL,
  type Meta, type Resultado, type Semaforo,
} from '@/lib/metas'

type FilaCalculo = { meta_id: string; metodo: string; activo: boolean; nota: string | null }

const SEMAFORO_PUNTO: Record<Semaforo, string> = {
  verde:        'bg-green-500',
  amarillo:     'bg-yellow-500',
  rojo:         'bg-rose-500',
  sin_medicion: 'bg-gray-300',
  sin_meta:     'bg-gray-200 ring-1 ring-inset ring-gray-300',
  por_comenzar: 'bg-slate-300',
}

export default function CargaResultados({
  metas, resultados, calculo, hoyISO,
}: {
  metas: Meta[]
  resultados: Resultado[]
  calculo: FilaCalculo[]
  hoyISO: string
}) {
  const router = useRouter()
  const hoy = new Date(`${hoyISO}T12:00:00`)
  const valores = valoresVigentes(resultados, hoyISO)

  const autoMap = new Map<string, FilaCalculo>()
  for (const c of calculo) autoMap.set(c.meta_id, c)

  const [refFecha, setRefFecha] = useState(hoyISO)
  const [recalc, setRecalc] = useState<{ estado: 'idle' | 'cargando' | 'ok' | 'error'; msg: string }>({
    estado: 'idle', msg: '',
  })

  async function recalcular() {
    setRecalc({ estado: 'cargando', msg: '' })
    try {
      const r = await fetch('/api/metas/resultados/recalcular', { method: 'POST' })
      const j = (await r.json()) as { total?: number; error?: string }
      if (!r.ok) throw new Error(j.error ?? 'No se pudo recalcular')
      setRecalc({
        estado: 'ok',
        msg: (j.total ?? 0) === 0
          ? 'Sin cambios: la ventana del plan aún no abre (arranca el 1 de septiembre).'
          : `${j.total} mediciones automáticas actualizadas.`,
      })
      router.refresh()
    } catch (e) {
      setRecalc({ estado: 'error', msg: e instanceof Error ? e.message : 'Error al recalcular' })
    }
  }

  const activas = calculo.filter((c) => c.activo).length

  return (
    <div className="space-y-5">
      {/* Barra de acciones */}
      <div className="flex flex-wrap items-end justify-between gap-4 rounded-lg border border-gray-200 bg-white p-4">
        <div>
          <p className="text-sm font-medium text-gray-900">Cálculo automático desde el CRM</p>
          <p className="mt-0.5 max-w-md text-xs text-gray-500">
            {activas} {activas === 1 ? 'meta se calcula sola' : 'metas se calculan solas'} (ingresos, ventas y leads).
            El resto se carga a mano. El botón refresca la casilla de periodo en curso.
          </p>
          {recalc.estado !== 'idle' && (
            <p className={cn(
              'mt-1.5 text-xs',
              recalc.estado === 'error' ? 'text-rose-600' : recalc.estado === 'ok' ? 'text-green-700' : 'text-gray-400',
            )}>
              {recalc.estado === 'cargando' ? 'Recalculando…' : recalc.msg}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={recalcular}
          disabled={recalc.estado === 'cargando'}
          className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-3 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-60"
        >
          {recalc.estado === 'cargando'
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <RefreshCw className="h-4 w-4" />}
          Recalcular desde el CRM
        </button>
      </div>

      {/* Fecha de referencia para la carga manual */}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label htmlFor="ref" className="font-medium text-gray-700">Cargar en el periodo del día:</label>
        <input
          id="ref"
          type="date"
          value={refFecha}
          onChange={(e) => setRefFecha(e.target.value)}
          className="rounded-md border border-gray-300 px-2 py-1 text-sm"
        />
        <span className="text-xs text-gray-400">
          El valor se guarda en la casilla que contiene esa fecha (recortada a la ventana del plan).
        </span>
      </div>

      {/* Tabla de metas */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-2 font-medium">Meta</th>
              <th className="px-3 py-2 font-medium">Origen</th>
              <th className="px-3 py-2 text-right font-medium">Meta</th>
              <th className="px-3 py-2 text-right font-medium">Real vigente</th>
              <th className="px-3 py-2 font-medium">Estado</th>
              <th className="px-3 py-2 font-medium">Cargar valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {metas.map((meta) => (
              <FilaCarga
                key={meta.id}
                meta={meta}
                real={meta.id in valores ? valores[meta.id] : null}
                auto={autoMap.get(meta.id) ?? null}
                hoy={hoy}
                refFecha={refFecha}
                onGuardado={() => router.refresh()}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500">
        <span className="flex items-center gap-1.5"><Cpu className="h-3.5 w-3.5 text-orange-600" /> se calcula desde el CRM</span>
        <span className="flex items-center gap-1.5"><Hand className="h-3.5 w-3.5 text-violet-600" /> carga manual</span>
        <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-green-500" /> en meta</span>
        <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-yellow-500" /> sobre el umbral</span>
        <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-rose-500" /> bajo el umbral</span>
        <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-gray-300" /> sin medición</span>
        <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-slate-300" /> por comenzar</span>
      </div>
    </div>
  )
}

function FilaCarga({
  meta, real, auto, hoy, refFecha, onGuardado,
}: {
  meta: Meta
  real: number | null
  auto: FilaCalculo | null
  hoy: Date
  refFecha: string
  onGuardado: () => void
}) {
  const [valor, setValor] = useState('')
  const [estado, setEstado] = useState<'idle' | 'guardando' | 'ok' | 'error'>('idle')
  const [msg, setMsg] = useState('')

  const evaluacion = evaluarMeta(meta, real, hoy)
  const esAuto = auto !== null && auto.activo

  async function guardar() {
    const n = Number(valor)
    if (valor.trim() === '' || !Number.isFinite(n)) {
      setEstado('error'); setMsg('Valor inválido')
      return
    }
    setEstado('guardando'); setMsg('')
    try {
      const r = await fetch('/api/metas/resultados', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meta_id: meta.id, valor: n, ref: refFecha }),
      })
      const j = (await r.json()) as { error?: string }
      if (!r.ok) throw new Error(j.error ?? 'No se pudo guardar')
      setEstado('ok'); setMsg('Guardado'); setValor('')
      onGuardado()
    } catch (e) {
      setEstado('error'); setMsg(e instanceof Error ? e.message : 'Error')
    }
  }

  return (
    <tr className="hover:bg-orange-50/30">
      <td className="px-4 py-2.5 align-top">
        <div className="flex items-start gap-2">
          <span className={cn('mt-1 h-2.5 w-2.5 shrink-0 rounded-full', SEMAFORO_PUNTO[evaluacion.semaforo])} title={evaluacion.etiqueta} />
          <div className="min-w-0">
            <p className="font-medium text-gray-900">{meta.nombre}</p>
            <p className="text-[11px] text-gray-400">
              <span className="font-mono">{meta.id}</span>
              {' · '}{ETIQUETA_NIVEL[meta.nivel] ?? `Nivel ${meta.nivel}`}
              {' · '}{meta.periodicidad}
              {' · '}{meta.responsable}
            </p>
          </div>
        </div>
      </td>

      <td className="px-3 py-2.5 align-top">
        {esAuto ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-medium text-orange-700 ring-1 ring-inset ring-orange-200">
            <Cpu className="h-3 w-3" /> CRM
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700 ring-1 ring-inset ring-violet-200">
            <Hand className="h-3 w-3" /> manual
          </span>
        )}
      </td>

      <td className="px-3 py-2.5 text-right align-top font-medium text-gray-900">
        {formatearValor(meta.valor_meta, meta.unidad)}
      </td>

      <td className="px-3 py-2.5 text-right align-top">
        <span className={real === null ? 'text-gray-300' : 'font-semibold text-gray-900'}>
          {real === null ? '—' : formatearValor(real, meta.unidad)}
        </span>
      </td>

      <td className="px-3 py-2.5 align-top">
        <span className="text-xs text-gray-500">{evaluacion.etiqueta}</span>
        {evaluacion.objetivoALaFecha !== null && meta.periodicidad === 'anual' && (
          <span className="block text-[11px] text-gray-400">
            a la fecha {formatearValor(evaluacion.objetivoALaFecha, meta.unidad)}
          </span>
        )}
      </td>

      <td className="px-3 py-2.5 align-top">
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            inputMode="decimal"
            value={valor}
            onChange={(e) => { setValor(e.target.value); setEstado('idle') }}
            placeholder={esAuto ? 'ajuste manual' : 'valor'}
            className="w-24 rounded-md border border-gray-300 px-2 py-1 text-sm"
          />
          <button
            type="button"
            onClick={guardar}
            disabled={estado === 'guardando'}
            className="inline-flex items-center gap-1 rounded-md bg-gray-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-gray-700 disabled:opacity-60"
          >
            {estado === 'guardando'
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : estado === 'ok'
                ? <Check className="h-3.5 w-3.5" />
                : null}
            Guardar
          </button>
        </div>
        {estado === 'error' && (
          <p className="mt-1 flex items-center gap-1 text-[11px] text-rose-600">
            <AlertCircle className="h-3 w-3" /> {msg}
          </p>
        )}
        {estado === 'ok' && (
          <p className="mt-1 text-[11px] text-green-700">{msg}</p>
        )}
        {esAuto && (
          <p className="mt-1 text-[11px] text-gray-400">Un valor manual pisa el cálculo hasta el próximo recálculo.</p>
        )}
      </td>
    </tr>
  )
}
