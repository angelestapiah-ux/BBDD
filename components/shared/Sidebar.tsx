'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Users, Calendar, FileText, Upload, Home, DollarSign } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', label: 'Inicio', icon: Home },
  { href: '/clientes', label: 'Clientes', icon: Users },
  { href: '/seguimientos', label: 'Seguimientos', icon: Calendar },
  { href: '/pagos', label: 'Pagos', icon: DollarSign },
  { href: '/reportes', label: 'Reportes', icon: FileText },
  { href: '/importar', label: 'Importar Excel', icon: Upload },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-5 border-b border-gray-200">
        <h1 className="text-xl font-bold text-emerald-700">RENOVA</h1>
        <p className="text-xs text-gray-500 mt-0.5">CRM</p>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              pathname === href
                ? 'bg-emerald-50 text-emerald-700'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-200">
        <p className="text-xs text-gray-400">RENOVA © {new Date().getFullYear()}</p>
      </div>
    </aside>
  )
}
