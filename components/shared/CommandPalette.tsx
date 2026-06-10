'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Cliente, ETAPAS_FUNNEL } from '@/lib/types'
import { Search, Users, Sun, DollarSign, Calendar, FileText, Upload, Settings, Plus, MessageSquare, LayoutDashboard } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePerfil } from './usePerfil'
import { Permiso } from '@/lib/permisos'

const NAV_COMMANDS: { label: string; href: string; icon: typeof Sun; keywords: string; permiso?: Permiso }[] = [
  { label: 'Nuevo cliente',       href: '/clientes?nuevo=1', icon: Plus,            keywords: 'nuevo crear agregar cliente lead' },
  { label: 'Ir a Hoy',            href: '/hoy',              icon: Sun,             keywords: 'hoy contactar pendientes agenda' },
  { label: 'Ir a Dashboard',      href: '/dashboard',        icon: LayoutDashboard, keywords: 'dashboard inicio resumen kpi', permiso: 'dashboard' },
  { label: 'Ir a Clientes',       href: '/clientes',         icon: Users,           keywords: 'clientes lista kanban' },
  { label: 'Ir a Seguimientos',   href: '/seguimientos',     icon: Calendar,        keywords: 'seguimientos contactos historial' },
  { label: 'Ir a Pagos',          href: '/pagos',            icon: DollarSign,      keywords: 'pagos cobros pendientes dinero' },
  { label: 'Ir a Reportes',       href: '/reportes',         icon: FileText,        keywords: 'reportes informes cumpleanos', permiso: 'reportes' },
  { label: 'Ir a Importar',       href: '/importar',         icon: Upload,          keywords: 'importar excel subir', permiso: 'importar' },
  { label: 'Ir a Configuración',  href: '/configuracion',    icon: Settings,        keywords: 'configuracion usuarios plantillas ajustes', permiso: 'configuracion' },
]

function normalizar(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

// Búsqueda global Ctrl+K: clientes + navegación, con teclado (↑↓ Enter Esc).
export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [buscando, setBuscando] = useState(false)
  const [idx, setIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const perfil = usePerfil()
  const comandosVisibles = NAV_COMMANDS.filter(c => !c.permiso || perfil.permisos.has(c.permiso))

  // Atajo global Ctrl/Cmd+K
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(o => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (open) {
      setQ('')
      setClientes([])
      setIdx(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Buscar clientes con debounce
  useEffect(() => {
    if (!open || !q.trim()) { setClientes([]); return }
    const t = setTimeout(async () => {
      setBuscando(true)
      try {
        const res = await fetch(`/api/clientes?q=${encodeURIComponent(q)}&limit=6`)
        if (res.ok) {
          const json = await res.json()
          setClientes(json.data || [])
        }
      } finally {
        setBuscando(false)
      }
    }, 250)
    return () => clearTimeout(t)
  }, [q, open])

  const navFiltrados = q.trim()
    ? comandosVisibles.filter(c => normalizar(`${c.label} ${c.keywords}`).includes(normalizar(q)))
    : comandosVisibles.slice(0, 4)

  const items: Array<{ tipo: 'cliente'; cliente: Cliente } | { tipo: 'nav'; nav: typeof NAV_COMMANDS[number] }> = [
    ...clientes.map(c => ({ tipo: 'cliente' as const, cliente: c })),
    ...navFiltrados.map(n => ({ tipo: 'nav' as const, nav: n })),
  ]

  const ejecutar = useCallback((item: typeof items[number]) => {
    setOpen(false)
    if (item.tipo === 'cliente') router.push(`/clientes/${item.cliente.id}`)
    else router.push(item.nav.href)
  }, [router])

  useEffect(() => { setIdx(0) }, [q, clientes.length])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[10000] bg-black/40 flex items-start justify-center pt-[15vh]"
      onClick={() => setOpen(false)}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
          <Search className="h-4 w-4 text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Buscar cliente o acción..."
            className="flex-1 text-sm bg-transparent focus:outline-none text-gray-800 placeholder:text-gray-400"
            onKeyDown={e => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setIdx(i => Math.min(i + 1, items.length - 1)) }
              if (e.key === 'ArrowUp') { e.preventDefault(); setIdx(i => Math.max(i - 1, 0)) }
              if (e.key === 'Enter' && items[idx]) { e.preventDefault(); ejecutar(items[idx]) }
            }}
          />
          <kbd className="text-xs text-gray-300 border border-gray-200 rounded px-1.5 py-0.5">Esc</kbd>
        </div>

        {/* Resultados */}
        <div className="max-h-80 overflow-y-auto py-1">
          {buscando && <p className="px-4 py-2 text-xs text-gray-400">Buscando...</p>}

          {clientes.length > 0 && (
            <p className="px-4 pt-2 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">Clientes</p>
          )}
          {clientes.map((c, i) => {
            const etapa = c.etapa ? ETAPAS_FUNNEL.find(e => e.value === c.etapa)?.label : null
            return (
              <button
                key={c.id}
                onClick={() => ejecutar(items[i])}
                onMouseEnter={() => setIdx(i)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                  idx === i ? 'bg-orange-50' : 'hover:bg-gray-50'
                )}
              >
                <Users className="h-4 w-4 text-gray-300 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{c.nombre}</p>
                  <p className="text-xs text-gray-400 truncate">
                    {[c.telefono, c.correo].filter(Boolean).join(' · ') || 'Sin datos de contacto'}
                    {etapa && ` · ${etapa}`}
                  </p>
                </div>
                {c.telefono && (
                  <a
                    href={`https://wa.me/${c.telefono.replace(/\D/g, '')}`}
                    target="_blank" rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    title="WhatsApp"
                    className="p-1.5 rounded-lg text-gray-300 hover:text-green-600 hover:bg-green-50 transition-colors shrink-0"
                  >
                    <MessageSquare size={14} />
                  </a>
                )}
              </button>
            )
          })}

          {q.trim() && !buscando && clientes.length === 0 && (
            <p className="px-4 py-2 text-xs text-gray-400">Sin clientes para &quot;{q}&quot;</p>
          )}

          {navFiltrados.length > 0 && (
            <p className="px-4 pt-2 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">Acciones</p>
          )}
          {navFiltrados.map((n, j) => {
            const i = clientes.length + j
            const Icon = n.icon
            return (
              <button
                key={n.href}
                onClick={() => ejecutar(items[i])}
                onMouseEnter={() => setIdx(i)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-2 text-left text-sm text-gray-700 transition-colors',
                  idx === i ? 'bg-orange-50' : 'hover:bg-gray-50'
                )}
              >
                <Icon className="h-4 w-4 text-gray-300 shrink-0" />
                {n.label}
              </button>
            )
          })}
        </div>

        <div className="px-4 py-2 border-t border-gray-100 flex gap-3 text-xs text-gray-300">
          <span>↑↓ navegar</span><span>Enter abrir</span><span>Esc cerrar</span>
        </div>
      </div>
    </div>
  )
}
