'use client'

import { createContext, useContext, useEffect, useState } from 'react'

export type Theme = 'default' | 'gold'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'default',
  toggleTheme: () => {},
})

export function useTheme() {
  return useContext(ThemeContext)
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('default')

  // Leer preferencia guardada al montar
  useEffect(() => {
    const saved = localStorage.getItem('renovapp-theme') as Theme | null
    if (saved === 'gold') {
      setTheme('gold')
      document.documentElement.setAttribute('data-theme', 'gold')
    }
  }, [])

  function toggleTheme() {
    const next: Theme = theme === 'default' ? 'gold' : 'default'
    setTheme(next)
    localStorage.setItem('renovapp-theme', next)
    if (next === 'gold') {
      document.documentElement.setAttribute('data-theme', 'gold')
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
