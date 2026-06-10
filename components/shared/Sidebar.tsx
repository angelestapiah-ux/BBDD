'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Users, Calendar, FileText, Upload, DollarSign, BookOpen, Settings, LayoutDashboard, LogOut, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getSupabase } from '@/lib/supabase'

const navItems = [
  { href: '/hoy', label: 'Hoy', icon: Sun },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/clientes', label: 'Clientes', icon: Users },
  { href: '/actividades', label: 'Actividades', icon: BookOpen },
  { href: '/seguimientos', label: 'Seguimientos', icon: Calendar },
  { href: '/pagos', label: 'Pagos', icon: DollarSign },
  { href: '/reportes', label: 'Reportes', icon: FileText },
  { href: '/importar', label: 'Importar Excel', icon: Upload },
  { href: '/configuracion', label: 'Configuración', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    try {
      const supabase = getSupabase()
      await supabase.auth.signOut()
    } catch {
      // continuar aunque falle
    }
    router.push('/login')
  }

  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-5 border-b border-gray-200">
        <h1 className="text-xl font-bold text-orange-700">Renovapp</h1>
        <p className="text-xs text-gray-500 mt-0.5">— CRM</p>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              pathname === href
                ? 'bg-orange-50 text-orange-700'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="p-3 border-t border-gray-200 space-y-1">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Cerrar sesión
        </button>
        <p className="text-xs text-gray-400 px-3 py-1">Renovapp © {new Date().getFullYear()}</p>
      </div>
    </aside>
  )
}
