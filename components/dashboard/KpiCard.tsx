import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface KpiCardProps {
  titulo: string
  valor: string
  subtitulo?: string
  icono: LucideIcon
  variacion?: number       // % vs mes anterior (positivo = sube, negativo = baja)
  variacionLabel?: string  // ej. "vs. mes anterior"
  colorIcono?: 'orange' | 'green' | 'yellow' | 'blue'
  cargando?: boolean
  href?: string            // si se pasa, la card es clickeable
}

export function KpiCard({
  titulo,
  valor,
  subtitulo,
  icono: Icono,
  variacion,
  variacionLabel = 'vs. mes anterior',
  colorIcono = 'orange',
  cargando = false,
  href,
}: KpiCardProps) {
  const colores = {
    orange: 'bg-orange-50 text-orange-600',
    green:  'bg-green-50  text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    blue:   'bg-blue-50   text-blue-600',
  }

  const tieneVariacion = variacion !== undefined && variacion !== null

  const card = (
    <div className={cn(
      'bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3 shadow-sm',
      href && 'hover:border-orange-300 hover:shadow-md transition-all'
    )}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500">{titulo}</p>
        <div className={cn('p-2 rounded-lg', colores[colorIcono])}>
          <Icono className="h-4 w-4" />
        </div>
      </div>

      {cargando ? (
        <div className="h-8 w-24 bg-gray-100 animate-pulse rounded" />
      ) : (
        <p className="text-2xl font-bold text-gray-900 leading-none">{valor}</p>
      )}

      <div className="flex items-center gap-2 min-h-[20px]">
        {subtitulo && !tieneVariacion && (
          <p className="text-xs text-gray-400">{subtitulo}</p>
        )}
        {tieneVariacion && !cargando && (
          <>
            {variacion > 0 ? (
              <TrendingUp className="h-3.5 w-3.5 text-green-500" />
            ) : variacion < 0 ? (
              <TrendingDown className="h-3.5 w-3.5 text-red-500" />
            ) : (
              <Minus className="h-3.5 w-3.5 text-gray-400" />
            )}
            <span className={cn(
              'text-xs font-medium',
              variacion > 0 ? 'text-green-600' : variacion < 0 ? 'text-red-500' : 'text-gray-400'
            )}>
              {variacion > 0 ? '+' : ''}{variacion.toFixed(0)}%
            </span>
            <span className="text-xs text-gray-400">{variacionLabel}</span>
          </>
        )}
      </div>
    </div>
  )

  return href ? <Link href={href} className="block">{card}</Link> : card
}
