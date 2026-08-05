'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Users, Calendar, FileText, Upload, DollarSign, BookOpen, Settings, LayoutDashboard, LogOut, Sun, GraduationCap, FileSignature, Wallet, CalendarClock, CalendarDays, Target } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getSupabase } from '@/lib/supabase'
import { usePerfil } from './usePerfil'
import { Permiso } from '@/lib/permisos'

const navItems: { href: string; label: string; icon: typeof Sun; permiso?: Permiso }[] = [
  { href: '/hoy', label: 'Hoy', icon: Sun },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, permiso: 'dashboard' },
  // metas-marketing-v1: torre de control del plan anual de marketing
  { href: '/dashboard/metas', label: 'Metas marketing', icon: Target, permiso: 'dashboard' },
  { href: '/clientes', label: 'Clientes', icon: Users },
  { href: '/actividades', label: 'Actividades', icon: BookOpen },
  { href: '/seguimientos', label: 'Seguimientos', icon: Calendar },
  { href: '/sesiones', label: 'Sesiones', icon: CalendarDays },
  { href: '/pagos', label: 'Pagos', icon: DollarSign },
  { href: '/cobranza', label: 'Cobranza', icon: CalendarClock, permiso: 'reportes' },
  { href: '/honorarios', label: 'Honorarios', icon: FileSignature, permiso: 'reportes' },
  { href: '/gastos', label: 'Gastos empresa', icon: Wallet, permiso: 'reportes' },
  { href: '/reportes', label: 'Reportes', icon: FileText, permiso: 'reportes' },
  { href: '/importar', label: 'Importar Excel', icon: Upload, permiso: 'importar' },
  { href: '/configuracion', label: 'Configuración', icon: Settings, permiso: 'configuracion' },
  { href: '/tutorial', label: 'Tutorial', icon: GraduationCap },
]

export function Sidebar() {
  const pathname = usePathname()
  const perfil = usePerfil()
  const items = navItems.filter(i => !i.permiso || perfil.permisos.has(i.permiso))

  async function handleLogout() {
    // logout-robusto-v2: cierre local garantizado + respaldo + redireccion dura
    try {
      const supabase = getSupabase()
      // scope 'local' cierra la sesion de ESTE navegador sin depender de una
      // respuesta del servidor. Asi el boton avanza aunque el token este vencido.
      await supabase.auth.signOut({ scope: 'local' })
    } catch {
      // continuar aunque falle
    }
    // Respaldo: si quedo algun token de Supabase en el navegador, lo soltamos.
    try {
      Object.keys(window.localStorage)
        .filter((k) => k.startsWith('sb-') || k.includes('supabase'))
        .forEach((k) => window.localStorage.removeItem(k))
    } catch {
      // continuar aunque falle
    }
    // Redireccion dura: el guard reevalua la sesion desde cero, sin estado viejo.
    window.location.replace('/login')
  }

  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-5 border-b border-gray-200">
        <h1 className="text-xl font-bold text-orange-700">Renovapp</h1>
        <p className="text-xs text-gray-500 mt-0.5">— CRM</p>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {items.map(({ href, label, icon: Icon }) => (
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
