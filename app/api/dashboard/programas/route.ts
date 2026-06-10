import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { requirePermiso } from '@/lib/permisos-server'
import { NextResponse } from 'next/server'

// Normaliza el nombre del programa según las reglas del proyecto
function normalizarPrograma(nombre: string): string {
  const n = nombre.toLowerCase()
  if (n.includes('practitioner'))             return 'Diplomado Practitioner'
  if (n.includes('máster') || n.includes('master')) return 'Diplomado Máster'
  if (n.includes('fabiola') || n.includes('fabila') || n.includes('fabio')) return 'Sesión Fabiola'
  if (n.includes('rodolfo'))                  return 'Sesión Rodolfo'
  if (n.includes('ximena'))                   return 'Sesión Ximena'
  if (n.includes('taller'))                   return 'Taller'
  if (n.includes('workshop'))                 return 'Workshop'
  if (n.includes('ciclo') || n.includes('anual') || n.includes('mujer')) return 'Ciclo Anual'
  return nombre.trim() || 'Otro'
}

export async function GET() {
  const bloqueo = await requirePermiso('dashboard')
  if (bloqueo) return bloqueo
  try {
    const supabase = createSupabaseAdminClient()

    // Con 141 pagos caben todos en una sola query
    const { data: pagos, error } = await supabase
      .from('pagos')
      .select('actividad_nombre, monto, fecha_pago, estado')
      .eq('estado', 'pagado')

    if (error) throw error

    const ahora = new Date()
    const añoActual = ahora.getFullYear()
    const mesActual = ahora.getMonth() // 0-indexed

    // Mes anterior
    const fechaAnterior = new Date(añoActual, mesActual - 1, 1)
    const añoAnterior = fechaAnterior.getFullYear()
    const mesAnterior = fechaAnterior.getMonth()

    // Estructura: { programa -> { total, mesActual, mesAnterior, cantidad } }
    const mapa: Record<string, { total: number; mesActual: number; mesAnterior: number; cantidad: number }> = {}

    for (const pago of pagos ?? []) {
      const programa = normalizarPrograma(pago.actividad_nombre ?? '')
      const monto = Number(pago.monto) || 0

      if (!mapa[programa]) {
        mapa[programa] = { total: 0, mesActual: 0, mesAnterior: 0, cantidad: 0 }
      }

      mapa[programa].total += monto
      mapa[programa].cantidad += 1

      if (pago.fecha_pago) {
        const fecha = new Date(pago.fecha_pago)
        const fAño = fecha.getFullYear()
        const fMes = fecha.getMonth()

        if (fAño === añoActual && fMes === mesActual) {
          mapa[programa].mesActual += monto
        } else if (fAño === añoAnterior && fMes === mesAnterior) {
          mapa[programa].mesAnterior += monto
        }
      }
    }

    // Ordenar por total descendente
    const programas = Object.entries(mapa)
      .map(([nombre, datos]) => ({ nombre, ...datos }))
      .sort((a, b) => b.total - a.total)

    const totalGeneral = programas.reduce((s, p) => s + p.total, 0)
    const totalMesActual = programas.reduce((s, p) => s + p.mesActual, 0)
    const totalMesAnterior = programas.reduce((s, p) => s + p.mesAnterior, 0)

    return NextResponse.json({
      programas,
      totalGeneral,
      totalMesActual,
      totalMesAnterior,
      mesLabel: ahora.toLocaleString('es-CL', { month: 'long' }),
      mesAnteriorLabel: fechaAnterior.toLocaleString('es-CL', { month: 'long' }),
    })
  } catch (error) {
    console.error('[dashboard/programas]', error)
    return NextResponse.json({ error: 'Error al obtener programas' }, { status: 500 })
  }
}
