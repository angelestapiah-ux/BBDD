import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { requirePermiso } from '@/lib/permisos-server'
import { NextResponse } from 'next/server'

export async function GET() {
  const bloqueo = await requirePermiso('dashboard')
  if (bloqueo) return bloqueo
  try {
    const supabase = createSupabaseAdminClient()

    // Contar clientes agrupados por procedencia
    // Supabase no soporta GROUP BY directamente en el cliente JS,
    // así que usamos una RPC o hacemos la query cruda con rpc.
    // Alternativa: traer solo la columna procedencia con count de página máxima
    // y agrupar en JS — pero con 1722 clientes eso requiere paginación.
    // Solución: usar .select() con columna procedencia y count por head trick
    // no funciona para GROUP BY. Usamos rpc o múltiples queries.

    // La forma más limpia: usar la función de Postgres via rpc
    // Pero no tenemos RPC definida. Vamos con paginación manual.

    // Estrategia: traer solo la columna 'procedencia' en lotes de 1000
    // hasta agotar los registros, luego agrupar en JS.

    const todos: { procedencia: string | null }[] = []
    let offset = 0
    const pageSize = 1000

    while (true) {
      const { data, error } = await supabase
        .from('clientes')
        .select('procedencia')
        .range(offset, offset + pageSize - 1)

      if (error) throw error
      if (!data || data.length === 0) break

      todos.push(...data)
      if (data.length < pageSize) break
      offset += pageSize
    }

    // Agrupar en JS
    const mapa: Record<string, number> = {}
    for (const row of todos) {
      const canal = row.procedencia?.trim() || 'Sin procedencia'
      mapa[canal] = (mapa[canal] || 0) + 1
    }

    // Ordenar de mayor a menor, limitar a los top 10 + "Otros"
    const ordenados = Object.entries(mapa).sort((a, b) => b[1] - a[1])

    const TOP = 9
    let canales: { canal: string; cantidad: number }[]

    if (ordenados.length <= TOP + 1) {
      canales = ordenados.map(([canal, cantidad]) => ({ canal, cantidad }))
    } else {
      const top = ordenados.slice(0, TOP).map(([canal, cantidad]) => ({ canal, cantidad }))
      const otrosTotal = ordenados.slice(TOP).reduce((s, [, n]) => s + n, 0)
      canales = [...top, { canal: 'Otros', cantidad: otrosTotal }]
    }

    return NextResponse.json({ canales, total: todos.length })
  } catch (error) {
    console.error('[dashboard/canales]', error)
    return NextResponse.json({ error: 'Error al obtener canales' }, { status: 500 })
  }
}
