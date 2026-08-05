import Link from 'next/link'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Target, Users, Wallet, Activity, AlertCircle, ListChecks } from 'lucide-react'
import ArbolMetas from '@/components/metas/ArbolMetas'
import {
  aMeta, aPendiente, evaluarMeta, formatearValor, formatearCLP,
  type Meta, type Pendiente,
} from '@/lib/metas'

export const dynamic = 'force-dynamic'

type FilaConfig = { clave: string; valor: unknown; descripcion: string | null }

const ETIQUETA_BASELINE: Record<string, string> = {
  instagram_seguidores: 'Instagram · seguidores',
  facebook_seguidores: 'Facebook · seguidores',
  youtube_suscriptores: 'YouTube · suscriptores',
  email_lista_unica: 'Correo · lista única',
  crm_contactos_total: 'CRM · contactos',
  whatsapp_difusion_contactos: 'WhatsApp · difusión',
  email_open_rate_historico: 'Correo · apertura histórica',
  resenas_google: 'Reseñas Google',
  visitas_sitio_mensuales: 'Visitas del sitio / mes',
  pagos_2026_pagados_n: 'Pagos 2026 · cantidad',
  pagos_2026_pagados_monto: 'Pagos 2026 · monto',
  acquisicion_probada: 'Adquisición probada',
  fuente: 'Fuente',
}

const PRIORIDAD_BADGE: Record<Pendiente['prioridad'], string> = {
  alta:  'bg-rose-50 text-rose-700 ring-rose-200',
  media: 'bg-amber-50 text-amber-700 ring-amber-200',
  baja:  'bg-gray-50 text-gray-600 ring-gray-200',
}

function valorBaseline(v: unknown): string {
  if (v === null || v === undefined) return 'por levantar'
  if (typeof v === 'number') return v.toLocaleString('es-CL')
  return String(v)
}

function Tarjeta({
  titulo, valor, detalle, color, icono: Icono,
}: {
  titulo: string
  valor: string
  detalle: string
  color: string
  icono: typeof Target
}) {
  return (
    <Card className={`border-l-4 ${color}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{titulo}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{valor}</p>
          </div>
          <div className="shrink-0 rounded-lg bg-gray-50 p-2"><Icono className="h-5 w-5 text-gray-500" /></div>
        </div>
        <p className="mt-3 text-xs text-gray-400">{detalle}</p>
      </CardContent>
    </Card>
  )
}

export default async function MetasMarketingPage() {
  const supabase = createSupabaseAdminClient()

  const [resMetas, resPendientes, resConfig] = await Promise.all([
    supabase.from('metas').select('*').order('nivel').order('id'),
    supabase.from('metas_pendientes').select('*').order('prioridad').order('id'),
    supabase.from('metas_config').select('clave, valor, descripcion'),
  ])

  const mensajeError =
    (resMetas.error?.message as string | undefined) ??
    (resPendientes.error?.message as string | undefined) ??
    (resConfig.error?.message as string | undefined) ??
    null

  if (mensajeError !== null) {
    return (
      <div className="max-w-5xl p-6">
        <h2 className="text-2xl font-bold text-gray-900">Metas de marketing</h2>
        <Card className="mt-6 border-l-4 border-l-rose-500">
          <CardContent className="flex items-start gap-3 p-5">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
            <div>
              <p className="text-sm font-medium text-gray-900">La lectura de metas quedó en pausa</p>
              <p className="mt-1 text-sm text-gray-500">{mensajeError}</p>
              <p className="mt-2 text-xs text-gray-400">
                Siguiente paso: revisar que la migración del módulo de marketing esté aplicada en Supabase.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const metas: Meta[] = ((resMetas.data ?? []) as unknown as Record<string, unknown>[]).map(aMeta)
  const pendientes: Pendiente[] =
    ((resPendientes.data ?? []) as unknown as Record<string, unknown>[]).map(aPendiente)
  const config = ((resConfig.data ?? []) as unknown as FilaConfig[])

  const cabecera = (config.find((c) => c.clave === 'cabecera')?.valor ?? {}) as Record<string, unknown>
  const baseline = (config.find((c) => c.clave === 'baseline_real')?.valor ?? {}) as Record<string, unknown>

  const hoyISO = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })
  const hoy = new Date(`${hoyISO}T12:00:00`)

  // --- estado vacío --------------------------------------------------------
  if (metas.length === 0) {
    return (
      <div className="max-w-5xl p-6">
        <h2 className="text-2xl font-bold text-gray-900">Metas de marketing</h2>
        <p className="mt-0.5 text-sm text-gray-400">Torre de control · plan anual</p>
        <Card className="mt-6">
          <CardContent className="p-8 text-center">
            <Target className="mx-auto h-8 w-8 text-gray-300" />
            <p className="mt-3 text-sm font-medium text-gray-900">Aún sin metas cargadas</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-gray-500">
              Para poblar el árbol, cargue el JSON del set de metas en <code className="rounded bg-gray-100 px-1">metas_config</code>{' '}
              y corra <code className="rounded bg-gray-100 px-1">select * from importar_metas_desde_config();</code>
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // --- tarjetas resumen ----------------------------------------------------
  const metasNegocio = metas.filter((m) => m.nivel === 1)
  const presupuestoCanales = metas
    .filter((m) => m.nivel === 3)
    .reduce((suma, m) => suma + (m.presupuesto_asociado ?? 0), 0)

  // Mientras la tabla `resultados` esté en construcción el valor real llega en
  // null, así que ninguna meta cuenta como medida. La cuenta ya queda escrita
  // para el día en que ese dato exista.
  const conMeta = metas.filter((m) => m.valor_meta !== null)
  const conMedicion = conMeta.filter((m) => {
    const s = evaluarMeta(m, null, hoy).semaforo
    return s !== 'sin_medicion' && s !== 'por_comenzar' && s !== 'sin_meta'
  })
  const pctMedicion = conMeta.length === 0 ? 0 : Math.round((conMedicion.length / conMeta.length) * 100)

  const ventana = typeof cabecera.periodo_global === 'string' ? cabecera.periodo_global : ''
  const version = typeof cabecera.version === 'string' ? cabecera.version : (metas[0]?.version_origen ?? '')
  const presupuestoDeclarado = typeof cabecera.presupuesto_marketing_anual === 'number'
    ? cabecera.presupuesto_marketing_anual
    : null

  const arranque = metas.reduce(
    (min, m) => (m.fecha_inicio < min ? m.fecha_inicio : min), metas[0].fecha_inicio)
  const aunPorComenzar = hoy.getTime() < new Date(`${arranque}T12:00:00`).getTime()

  const conteoEstados = metas.reduce<Record<string, number>>((acc, m) => {
    acc[m.estado] = (acc[m.estado] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="max-w-5xl p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Metas de marketing</h2>
        <p className="mt-0.5 text-sm text-gray-400">
          Torre de control · {ventana === '' ? 'plan anual' : ventana}
          {version === '' ? '' : ` · set v${version}`}
        </p>
      </div>

      {aunPorComenzar && (
        <div className="mb-5 flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <Activity className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          <p className="text-sm text-slate-600">
            La ventana del plan arranca el {arranque}. Hasta esa fecha el semáforo se mantiene en gris:
            muestra el plan aprobado y aún ninguna medición.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {metasNegocio.slice(0, 2).map((m, i) => (
          <Tarjeta
            key={m.id}
            titulo={m.nombre}
            valor={formatearValor(m.valor_meta, m.unidad)}
            detalle={`${m.metrica} · umbral de riesgo ${formatearValor(m.umbral_riesgo, m.unidad)} · ${m.clase_dato}`}
            color={i === 0 ? 'border-l-orange-500' : 'border-l-green-500'}
            icono={i === 0 ? Target : Users}
          />
        ))}

        <Tarjeta
          titulo="Presupuesto de marketing"
          valor={formatearCLP(presupuestoCanales)}
          detalle={
            presupuestoDeclarado !== null && Math.abs(presupuestoDeclarado - presupuestoCanales) > 0
              ? `Suma de los ${metas.filter((m) => m.nivel === 3).length} canales · declarado ${formatearCLP(presupuestoDeclarado)}`
              : `Suma de los ${metas.filter((m) => m.nivel === 3).length} canales · calza con el total declarado`
          }
          color="border-l-blue-500"
          icono={Wallet}
        />

        <Tarjeta
          titulo="Metas con medición"
          valor={`${pctMedicion}%`}
          detalle={`${conMedicion.length} de ${conMeta.length} metas con meta definida · la carga de resultados queda en construcción`}
          color="border-l-gray-300"
          icono={Activity}
        />
      </div>

      {/* Árbol jerárquico */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Árbol de metas</CardTitle>
          <p className="text-xs text-gray-400">
            Negocio → embudo → canal → producto, siguiendo la meta padre de cada una ·{' '}
            {Object.entries(conteoEstados).map(([e, n]) => `${n} ${e}`).join(' · ')}
          </p>
        </CardHeader>
        <CardContent>
          <ArbolMetas metas={metas} hoyISO={hoyISO} />
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-gray-100 pt-3 text-xs text-gray-500">
            <span className="font-medium text-gray-600">Semáforo:</span>
            <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-green-500" /> en meta</span>
            <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-yellow-500" /> sobre el umbral</span>
            <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-rose-500" /> bajo el umbral</span>
            <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-gray-300" /> sin medición</span>
            <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-slate-300" /> por comenzar</span>
          </div>
        </CardContent>
      </Card>

      {/* Líneas base medidas */}
      {Object.keys(baseline).length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Líneas base medidas</CardTitle>
            <p className="text-xs text-gray-400">Punto de partida real desde el CRM y las redes</p>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(baseline).map(([clave, valor]) => (
                <div key={clave} className="flex items-baseline justify-between gap-2 border-b border-gray-50 py-1">
                  <dt className="truncate text-xs text-gray-500">{ETIQUETA_BASELINE[clave] ?? clave}</dt>
                  <dd className={`shrink-0 text-sm font-medium ${valor === null ? 'text-gray-300' : 'text-gray-800'}`}>
                    {valorBaseline(valor)}
                  </dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      )}

      {/* Pendientes que anclan metas */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Definiciones que anclan metas</CardTitle>
          <p className="text-xs text-gray-400">
            {pendientes.length === 0
              ? 'Sin pendientes registrados'
              : `${pendientes.length} ítems · al resolverse mueven las metas que indican`}
          </p>
        </CardHeader>
        <CardContent>
          {pendientes.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">
              Todo el set quedó con sus definiciones cerradas.
            </p>
          ) : (
            <div className="divide-y divide-gray-100">
              {pendientes.map((p) => (
                <div key={p.id} className="flex items-start gap-3 py-3">
                  <ListChecks className="mt-0.5 h-4 w-4 shrink-0 text-gray-300" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{p.tema}</span>
                      <span className="font-mono text-[11px] text-gray-400">{p.id}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${PRIORIDAD_BADGE[p.prioridad]}`}>
                        {p.prioridad}
                      </span>
                    </div>
                    {p.para_cowork !== null && (
                      <p className="mt-0.5 text-xs text-gray-500">{p.para_cowork}</p>
                    )}
                    <p className="mt-1 text-[11px] text-gray-400">
                      {p.responsable ?? 'Sin responsable'}
                      {p.metas_impactadas.length > 0 ? ` · mueve ${p.metas_impactadas.join(', ')}` : ''}
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] text-gray-400">{p.estado}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="mt-6 text-xs text-gray-400">
        La medición real llega con la carga de resultados, en construcción ·{' '}
        <Link href="/dashboard" className="text-orange-600 hover:underline">volver al dashboard comercial</Link>
      </p>
    </div>
  )
}
