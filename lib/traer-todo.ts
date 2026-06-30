// Helper para traer TODAS las filas de una consulta de Supabase, sin el techo
// de 1.000 registros por pedido. Pagina en bloques con .range() y los concatena
// hasta completar la base. Se usa en las exportaciones (planillas completas).

type ConsultaPaginable<T> = {
  range: (
    desde: number,
    hasta: number,
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
}

const TAMANO_BLOQUE = 1000

/**
 * Trae todas las filas paginando en bloques de 1.000.
 *
 * Uso:
 *   const { data, error } = await traerTodo(() =>
 *     supabase.from('clientes').select('*').order('nombre'))
 *
 * Importante: pasar una FUNCION que construya la consulta (sin .range), porque
 * en cada bloque se arma una consulta nueva y se le aplica el .range del bloque.
 */
export async function traerTodo<T>(
  construirConsulta: () => ConsultaPaginable<T>,
): Promise<{ data: T[]; error: string | null }> {
  const acumulado: T[] = []
  let desde = 0
  for (;;) {
    const hasta = desde + TAMANO_BLOQUE - 1
    const { data, error } = await construirConsulta().range(desde, hasta)
    if (error) return { data: acumulado, error: error.message }
    const bloque = data ?? []
    acumulado.push(...bloque)
    if (bloque.length < TAMANO_BLOQUE) break
    desde += TAMANO_BLOQUE
  }
  return { data: acumulado, error: null }
}
