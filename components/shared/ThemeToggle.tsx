'use client'

import { useTheme } from './ThemeProvider'
import { Sun, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  const esDorado = theme === 'gold'

  return (
    <button
      onClick={toggleTheme}
      title={esDorado ? 'Cambiar a tema Claro' : 'Cambiar a tema Dorado'}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all border select-none',
        esDorado
          ? 'border-[#3a3000] text-yellow-400 hover:text-yellow-300 hover:border-yellow-600'
          : 'bg-white border-gray-200 text-gray-500 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200'
      )}
      style={esDorado ? { backgroundColor: '#1a1400' } : undefined}
    >
      {esDorado ? (
        <>
          <Sun className="h-3 w-3" />
          Claro
        </>
      ) : (
        <>
          <Sparkles className="h-3 w-3" />
          Dorado
        </>
      )}
    </button>
  )
}
