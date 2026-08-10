// Módulo de marketing · tipos y lógica del semáforo de metas.
// Vive aparte de la vista para poder razonarlo (y probarlo) sin React.

export type ClaseDato     = 'verificado' | 'modelo' | 'estimado'
export type EstadoMeta    = 'propuesta' | 'no_iniciado' | 'en_curso' | 'logrado' | 'en_riesgo'
export type Periodicidad  = 'anual' | 'trimestral' | 'mensual' | 'semanal' | 'campana'
export type Responsable   = 'Renova' | 'Agencia'
export type Sentido       = 'mayor_mejor' | 'menor_mejor'
export type TipoIndicador = 'leading' | 'lagging'

export type Meta = {
  id: string
  nivel: number
  nombre: string
  etapa_embudo: string
  metrica: string
  unidad: string | null
  tipo_indicador: TipoIndicador
  clase_dato: ClaseDato
  supuesto: string | null
  valor_base: number | null
  valor_meta: number | null
  umbral_riesgo: number | null
  sentido: Sentido
  periodo: string | null
  periodicidad: Periodicidad
  fecha_inicio: string
  fecha_fin: string
  responsable: Responsable
  canal: string | null
  producto_segmento: string | null
  presupuesto_asociado: number | null
  fuente_dato: string | null
  meta_padre_id: string | null
  estado: EstadoMeta
  editable: boolean
  notas: string | null
  version_origen: string | null
}

export type Pendiente = {
  id: string
  tema: string
  detalle: string | null
  dato_requerido: string | null
  fuente_sugerida: string | null
  metas_impactadas: string[]
  valor_inicial_actual: string | null
  responsable: string | null
  prioridad: 'alta' | 'media' | 'baja'
  estado: EstadoMeta
  para_cowork: string | null
}

// ---------------------------------------------------------------------------
// Conversión desde Supabase (llega como unknown; se tipa explícito para que el
// build estricto quede verde).
// ---------------------------------------------------------------------------

function texto(v: unknown): string {
  return typeof v === 'string' ? v : String(v ?? '')
}
function textoOpcional(v: unknown): string | null {
  return v === null || v === undefined || v === '' ? null : texto(v)
}
function numeroOpcional(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export function aMeta(fila: Record<string, unknown>): Meta {
  return {
    id: texto(fila.id),
    nivel: numeroOpcional(fila.nivel) ?? 0,
    nombre: texto(fila.nombre),
    etapa_embudo: texto(fila.etapa_embudo),
    metrica: texto(fila.metrica),
    unidad: textoOpcional(fila.unidad),
    tipo_indicador: fila.tipo_indicador === 'lagging' ? 'lagging' : 'leading',
    clase_dato: (['verificado', 'modelo', 'estimado'] as const)
      .find((c) => c === fila.clase_dato) ?? 'estimado',
    supuesto: textoOpcional(fila.supuesto),
    valor_base: numeroOpcional(fila.valor_base),
    valor_meta: numeroOpcional(fila.valor_meta),
    umbral_riesgo: numeroOpcional(fila.umbral_riesgo),
    sentido: fila.sentido === 'menor_mejor' ? 'menor_mejor' : 'mayor_mejor',
    periodo: textoOpcional(fila.periodo),
    periodicidad: (['anual', 'trimestral', 'mensual', 'semanal', 'campana'] as const)
      .find((p) => p === fila.periodicidad) ?? 'anual',
    fecha_inicio: texto(fila.fecha_inicio),
    fecha_fin: texto(fila.fecha_fin),
    responsable: fila.responsable === 'Agencia' ? 'Agencia' : 'Renova',
    canal: textoOpcional(fila.canal),
    producto_segmento: textoOpcional(fila.producto_segmento),
    presupuesto_asociado: numeroOpcional(fila.presupuesto_asociado),
    fuente_dato: textoOpcional(fila.fuente_dato),
    meta_padre_id: textoOpcional(fila.meta_padre_id),
    estado: (['propuesta', 'no_iniciado', 'en_curso', 'logrado', 'en_riesgo'] as const)
      .find((e) => e === fila.estado) ?? 'propuesta',
    editable: fila.editable !== false,
    notas: textoOpcional(fila.notas),
    version_origen: textoOpcional(fila.version_origen),
  }
}

export function aPendiente(fila: Record<string, unknown>): Pendiente {
  const impactadas = Array.isArray(fila.metas_impactadas)
    ? (fila.metas_impactadas as unknown[]).map(texto)
    : []
  return {
    id: texto(fila.id),
    tema: texto(fila.tema),
    detalle: textoOpcional(fila.detalle),
    dato_requerido: textoOpcional(fila.dato_requerido),
    fuente_sugerida: textoOpcional(fila.fuente_sugerida),
    metas_impactadas: impactadas,
    valor_inicial_actual: textoOpcional(fila.valor_inicial_actual),
    responsable: textoOpcional(fila.responsable),
    prioridad: (['alta', 'media', 'baja'] as const).find((p) => p === fila.prioridad) ?? 'media',
    estado: (['propuesta', 'no_iniciado', 'en_curso', 'logrado', 'en_riesgo'] as const)
      .find((e) => e === fila.estado) ?? 'no_iniciado',
    para_cowork: textoOpcional(fila.para_cowork),
  }
}

// ---------------------------------------------------------------------------
// Semáforo
// ---------------------------------------------------------------------------

export type Semaforo =
  | 'verde'
  | 'amarillo'
  | 'rojo'
  | 'sin_medicion'   // hay meta y periodo en curso, aún sin dato real
  | 'sin_meta'       // meta por definir (valor_meta en null)
  | 'por_comenzar'   // la ventana del periodo arranca más adelante

export type Evaluacion = {
  semaforo: Semaforo
  /** Fracción del periodo transcurrida, de 0 a 1. Solo se prorratea en metas anuales. */
  fraccion: number
  /** Objetivo exigible a la fecha (prorrateado si la meta es anual). */
  objetivoALaFecha: number | null
  umbralALaFecha: number | null
  etiqueta: string
}

/** Parsea 'YYYY-MM-DD' al mediodía local, así el huso horario deja de mover el día. */
export function fecha(iso: string): Date {
  return new Date(`${iso}T12:00:00`)
}

/**
 * Fracción del periodo ya transcurrida.
 *
 * Solo las metas anuales son ACUMULATIVAS: a mitad de año se exige la mitad.
 * Las mensuales, trimestrales y semanales expresan el objetivo DE CADA periodo,
 * así que se comparan contra su valor completo. Prorratear una meta mensual
 * contra el año entero pintaría de rojo a quien va perfecto.
 */
export function fraccionTranscurrida(meta: Meta, hoy: Date): number {
  if (meta.periodicidad !== 'anual') return 1
  const inicio = fecha(meta.fecha_inicio).getTime()
  const fin = fecha(meta.fecha_fin).getTime()
  if (!Number.isFinite(inicio) || !Number.isFinite(fin) || fin <= inicio) return 1
  const avance = (hoy.getTime() - inicio) / (fin - inicio)
  return Math.min(1, Math.max(0, avance))
}

/**
 * Objetivo exigible a la fecha para una meta anual, partiendo de su línea base.
 *
 *   objetivo(t) = valor_base + (destino − valor_base) × fracción
 *
 * Con línea base 0 (ingresos, matrículas, leads: métricas de flujo que se
 * acumulan) queda igual a `destino × fracción`. Con línea base real (seguidores,
 * suscriptores, lista de correo: métricas de nivel) exige solo el crecimiento
 * proporcional, así una cuenta con 5.502 seguidores que va camino a 9.000 se lee
 * por lo que avanzó y evita el rojo por partir de donde partió.
 *
 * Las metas mensuales, trimestrales y semanales expresan el objetivo de cada
 * periodo y se comparan completas.
 */
export function objetivoALaFecha(destino: number, meta: Meta, fraccion: number): number {
  if (meta.periodicidad !== 'anual') return destino
  const base = meta.valor_base ?? 0
  return base + (destino - base) * fraccion
}

/**
 * Evalúa una meta contra su valor real.
 *
 * `valorReal` llega en null mientras la tabla `resultados` esté en construcción:
 * en ese caso el resultado es 'sin_medicion' (gris), jamás rojo.
 */
export function evaluarMeta(meta: Meta, valorReal: number | null, hoy: Date): Evaluacion {
  const fraccion = fraccionTranscurrida(meta, hoy)

  if (hoy.getTime() < fecha(meta.fecha_inicio).getTime()) {
    return {
      semaforo: 'por_comenzar', fraccion: 0,
      objetivoALaFecha: null, umbralALaFecha: null,
      etiqueta: 'Por comenzar',
    }
  }
  if (meta.valor_meta === null) {
    return {
      semaforo: 'sin_meta', fraccion,
      objetivoALaFecha: null, umbralALaFecha: null,
      etiqueta: 'Meta por definir',
    }
  }

  const objetivo = objetivoALaFecha(meta.valor_meta, meta, fraccion)
  const umbral = meta.umbral_riesgo === null
    ? null
    : objetivoALaFecha(meta.umbral_riesgo, meta, fraccion)

  if (valorReal === null) {
    return {
      semaforo: 'sin_medicion', fraccion,
      objetivoALaFecha: objetivo, umbralALaFecha: umbral,
      etiqueta: 'Sin medición',
    }
  }

  // Caso degenerado: la ventana anual recién se abre y aún queda nada exigible.
  // Pintar verde ahí regala una calma vacía, así que el semáforo espera.
  if (meta.periodicidad === 'anual' && fraccion === 0) {
    return {
      semaforo: 'sin_medicion', fraccion,
      objetivoALaFecha: objetivo, umbralALaFecha: umbral,
      etiqueta: 'Sin exigencia aún',
    }
  }

  const alcanza = meta.sentido === 'menor_mejor'
    ? valorReal <= objetivo
    : valorReal >= objetivo
  if (alcanza) {
    return { semaforo: 'verde', fraccion, objetivoALaFecha: objetivo, umbralALaFecha: umbral, etiqueta: 'En meta' }
  }

  const sobreUmbral = umbral === null
    ? false
    : meta.sentido === 'menor_mejor' ? valorReal <= umbral : valorReal >= umbral
  if (sobreUmbral) {
    return { semaforo: 'amarillo', fraccion, objetivoALaFecha: objetivo, umbralALaFecha: umbral, etiqueta: 'Sobre el umbral' }
  }

  return { semaforo: 'rojo', fraccion, objetivoALaFecha: objetivo, umbralALaFecha: umbral, etiqueta: 'Bajo el umbral' }
}

// ---------------------------------------------------------------------------
// Árbol
// ---------------------------------------------------------------------------

export type NodoMeta = { meta: Meta; hijos: NodoMeta[] }

/**
 * Arma el árbol siguiendo meta_padre_id.
 *
 * Ojo: el campo `nivel` del JSON declara la CATEGORÍA (negocio / embudo / canal /
 * producto) y difiere de la profundidad real en buena parte del set — varias metas
 * de producto cuelgan directo de una meta de negocio. Por eso la jerarquía se
 * arma con meta_padre_id y `nivel` queda como etiqueta.
 *
 * Una meta cuyo padre esté ausente se muestra en la raíz, así ninguna queda oculta.
 */
export function construirArbol(metas: Meta[]): NodoMeta[] {
  const porId = new Map<string, NodoMeta>()
  for (const meta of metas) porId.set(meta.id, { meta, hijos: [] })

  // Padre efectivo por meta. Queda en null cuando el padre está ausente o cuando
  // la cadena hacia arriba se muerde la cola. Así un dato en círculo aparece plano
  // en la raíz, y la vista sigue respondiendo en vez de recursar sin término.
  const padreEfectivo = new Map<string, string | null>()
  for (const meta of metas) {
    const declarado = meta.meta_padre_id
    if (declarado === null || !porId.has(declarado)) {
      padreEfectivo.set(meta.id, null)
      continue
    }
    const vistos = new Set<string>([meta.id])
    let actual: string | null = declarado
    let ciclico = false
    while (actual !== null) {
      if (vistos.has(actual)) { ciclico = true; break }
      vistos.add(actual)
      // Anotación explícita: sin ella TypeScript infiere `any` por la
      // autorreferencia de `actual` y el build estricto se detiene (TS7022).
      const arriba: string | null = porId.get(actual)?.meta.meta_padre_id ?? null
      actual = arriba !== null && porId.has(arriba) ? arriba : null
    }
    padreEfectivo.set(meta.id, ciclico ? null : declarado)
  }

  const raices: NodoMeta[] = []
  for (const nodo of porId.values()) {
    const padreId = padreEfectivo.get(nodo.meta.id) ?? null
    const padre = padreId === null ? undefined : porId.get(padreId)
    if (padre === undefined || padre === nodo) raices.push(nodo)
    else padre.hijos.push(nodo)
  }

  const ordenar = (nodos: NodoMeta[], profundidad: number): NodoMeta[] => {
    if (profundidad > 12) return nodos
    nodos.sort((a, b) =>
      a.meta.nivel - b.meta.nivel || a.meta.id.localeCompare(b.meta.id, 'es'))
    for (const n of nodos) ordenar(n.hijos, profundidad + 1)
    return nodos
  }
  return ordenar(raices, 0)
}

export function contarNodos(nodos: NodoMeta[]): number {
  return nodos.reduce((suma, n) => suma + 1 + contarNodos(n.hijos), 0)
}

// ---------------------------------------------------------------------------
// Formato
// ---------------------------------------------------------------------------

export function formatearValor(valor: number | null, unidad: string | null): string {
  if (valor === null) return '—'
  const u = (unidad ?? '').toLowerCase()
  if (u === 'clp') return `$${Math.round(valor).toLocaleString('es-CL')}`
  if (u === '%' || u.startsWith('porcentaje')) return `${Math.round(valor * 10) / 10}%`
  const numero = Math.abs(valor) >= 1000
    ? Math.round(valor).toLocaleString('es-CL')
    : String(Math.round(valor * 10) / 10)
  return unidad === null ? numero : `${numero} ${unidad}`
}

export function formatearCLP(valor: number): string {
  return `$${Math.round(valor).toLocaleString('es-CL')}`
}

export const ETIQUETA_NIVEL: Record<number, string> = {
  1: 'Negocio',
  2: 'Embudo',
  3: 'Canal',
  4: 'Producto',
}

// ---------------------------------------------------------------------------
// Resultados (mediciones que encienden el semáforo · Fase 4)
// ---------------------------------------------------------------------------

export type FuenteResultado = 'manual' | 'crm' | 'agencia'

export type Resultado = {
  meta_id: string
  periodicidad: Periodicidad
  periodo_etiqueta: string
  periodo_inicio: string
  periodo_fin: string
  valor: number
  fuente: FuenteResultado
  metodo_crm: string | null
  nota: string | null
  updated_at: string | null
}

export function aResultado(fila: Record<string, unknown>): Resultado {
  return {
    meta_id: texto(fila.meta_id),
    periodicidad: (['anual', 'trimestral', 'mensual', 'semanal', 'campana'] as const)
      .find((p) => p === fila.periodicidad) ?? 'anual',
    periodo_etiqueta: texto(fila.periodo_etiqueta),
    periodo_inicio: texto(fila.periodo_inicio),
    periodo_fin: texto(fila.periodo_fin),
    valor: numeroOpcional(fila.valor) ?? 0,
    fuente: (['manual', 'crm', 'agencia'] as const).find((f) => f === fila.fuente) ?? 'manual',
    metodo_crm: textoOpcional(fila.metodo_crm),
    nota: textoOpcional(fila.nota),
    updated_at: textoOpcional(fila.updated_at),
  }
}

/**
 * Índice meta_id → valor real de la casilla de periodo que contiene a `hoy`.
 *
 * Cada meta tiene, para un día dado, una sola casilla que lo contiene (las
 * casillas de una misma meta no se solapan; la anual es la única de su meta).
 * Si por alguna razón hubiera solape, gana la casilla más específica: la de
 * inicio más reciente. Las metas sin medición vigente quedan fuera del mapa,
 * así `evaluarMeta` las lee como 'sin_medicion' (gris), jamás rojo.
 */
export function valoresVigentes(resultados: Resultado[], hoyISO: string): Record<string, number> {
  const hoy = fecha(hoyISO).getTime()
  const elegido: Record<string, { valor: number; ini: number }> = {}
  for (const r of resultados) {
    const ini = fecha(r.periodo_inicio).getTime()
    const fin = fecha(r.periodo_fin).getTime()
    if (!Number.isFinite(ini) || !Number.isFinite(fin)) continue
    if (hoy < ini || hoy > fin) continue
    const previo = elegido[r.meta_id]
    if (previo === undefined || ini > previo.ini) {
      elegido[r.meta_id] = { valor: r.valor, ini }
    }
  }
  const salida: Record<string, number> = {}
  for (const id of Object.keys(elegido)) salida[id] = elegido[id].valor
  return salida
}

export const ETIQUETA_FUENTE: Record<FuenteResultado, string> = {
  manual:  'carga manual',
  crm:     'desde el CRM',
  agencia: 'carga Agencia',
}
