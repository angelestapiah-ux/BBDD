'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { EtapaFunnel, ETAPAS_FUNNEL } from '@/lib/types'
import { ContactadoPanel } from '@/components/clientes/ContactadoPanel'
import { MessageSquare, Phone, Mail, CheckCircle2, ChevronDown, ChevronUp, Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface ClienteSeguimiento {
  id: string
  nombre: string
  telefono: string | null
  correo: string | null
  etapa: EtapaFunnel | null
  procedencia: string | null
  proximo_contacto: string | null
  created_at: string
  ultimo_seguimiento: string | null
  total_seguimientos: number
  actividades: string[]
}

const ETAPA_BADGE: Record<EtapaFunnel, string> = {
  nuevo:              'bg-gray-100 text-gray-600',
  contactado:         'bg-blue-100 text-blue-700',
  con_interes:        'bg-violet-100 text-violet-700',
  cotizacion_enviada: 'bg-yellow-100 text-yellow-700',
  negociando:         'bg-orange-100 text-orange-700',
  inscrito:           'bg-green-100 text-green-700',
}

type Columna = 'nombre' | 'etapa' | 'actividades' | 'ultimo' | 'proximo' | 'canal'

function fmt(d: string | null) {
  return d ? d.slice(0, 10).split('-').reverse().join('/') : null
}

function diasDesde(fecha: string | null) {
  if (!fecha) return null
  return Math.floor((Date.now() - new Date(fecha).getTime()) / 86_400_000)
}

// Vista "Seguimiento por cliente": todos los clientes, ordenable tipo Excel,
// con filtro por actividad y acciones de contacto directas.
export function VistaClientes() {
  const [clientes, setClientes] = useState<ClienteSeguimiento[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [actividadFilter, setActividadFilter] = useState('')
  const [etapaFilter, setEtapaFilter] = useState('')
  const [soloSinContacto, setSoloSinContacto] = useState(false)
  const [sort, setSort] = useState<{ col: Columna; asc: boolean }>({ col: 'ultimo', asc: true })
  const [contactadoId, setContactadoId] = useState<string | null>(null)
  const [contactadoPos, setContactadoPos] = useState<{ top: number; right: number } | null>(null)

  async function cargar() {
    const res = await fetch('/api/seguimiento-clientes')
    if (res.ok) setClientes(await res.json())
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  // Cerrar panel contactado con click afuera
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!(e.target as HTMLElement).closest('[data-contactado-panel]')) {
        setContactadoId(null)
        setContactadoPos(null)
      }
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  const actividadesDisponibles = useMemo(
    () => Array.from(new Set(clientes.flatMap(c => c.actividades))).sort((a, b) => a.localeCompare(b)),
    [clientes]
  )

  const filtrados = useMemo(() => {
    const nq = q.trim().toLowerCase()
    let lista = clientes
    if (nq) {
      lista = lista.filter(c =>
        c.nombre.toLowerCase().includes(nq) ||
        (c.correo || '').toLowerCase().includes(nq) ||
        (c.telefono || '').includes(nq)
      )
    }
    if (actividadFilter) lista = lista.filter(c => c.actividades.includes(actividadFilter))
    if (etapaFilter) lista = lista.filter(c => (c.etapa || 'nuevo') === etapaFilter)
    if (soloSinContacto) lista = lista.filter(c => c.total_seguimientos === 0)

    const dir = sort.asc ? 1 : -1
    const ordenEtapa = Object.fromEntries(ETAPAS_FUNNEL.map((e, i) => [e.value, i]))
    return [...lista].sort((a, b) => {
      switch (sort.col) {
        case 'nombre': return a.nombre.localeCompare(b.nombre) * dir
        case 'etapa': return ((ordenEtapa[a.etapa || 'nuevo'] ?? 0) - (ordenEtapa[b.etapa || 'nuevo'] ?? 0)) * dir
        case 'actividades': return (a.actividades.join(', ')).localeCompare(b.actividades.join(', ')) * dir
        case 'canal': return (a.procedencia || '').localeCompare(b.procedencia || '') * dir
        case 'proximo': return ((a.proximo_contacto || '9999') > (b.proximo_contacto || '9999') ? 1 : -1) * dir
        case 'ultimo':
        default: {
          // "Nunca contactado" primero al ordenar ascendente
          const av = a.ultimo_seguimiento || '0000'
          const bv = b.ultimo_seguimiento || '0000'
          return (av > bv ? 1 : av < bv ? -1 : 0) * dir
        }
      }
    })
  }, [clientes, q, actividadFilter, etapaFilter, soloSinContacto, sort])

  const sinContacto = clientes.filter(c => c.total_seguimientos === 0).length

  function Header({ col, children, className }: { col: Columna; children: React.ReactNode; className?: string }) {
    const activo = sort.col === col
    return (
      <th
        onClick={() => setSort(s => ({ col, asc: s.col === col ? !s.asc : true }))}
        className={cn('text-left px-3 py-3 font-medium text-gray-600 cursor-pointer select-none hover:text-orange-600 transition-colors whitespace-nowrap', className)}
        title="Click para ordenar"
      >
        <span className="inline-flex items-center gap-1">
          {children}
          {activo && (sort.asc ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
        </span>
      </th>
    )
  }

  return (
    <div>
      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input className="pl-9" placeholder="Buscar cliente..." value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <div className="relative">
          <select
            value={actividadFilter}
            onChange={e => setActividadFilter(e.target.value)}
            className="h-10 pl-3 pr-8 rounded-lg border border-gray-200 text-sm text-gray-600 bg-white focus:outline-none focus:border-orange-400 appearance-none cursor-pointer max-w-[230px]"
          >
            <option value="">Todas las actividades</option>
            {actividadesDisponibles.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
        </div>
        <div className="relative">
          <select
            value={etapaFilter}
            onChange={e => setEtapaFilter(e.target.value)}
            className="h-10 pl-3 pr-8 rounded-lg border border-gray-200 text-sm text-gray-600 bg-white focus:outline-none focus:border-orange-400 appearance-none cursor-pointer"
          >
            <option value="">Todas las etapas</option>
            {ETAPAS_FUNNEL.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
        </div>
        <button
          onClick={() => setSoloSinContacto(v => !v)}
          className={cn(
            'h-10 px-3 rounded-lg border text-sm font-medium transition-colors',
            soloSinContacto
              ? 'bg-red-600 text-white border-red-600'
              : 'bg-white text-red-600 border-red-200 hover:bg-red-50'
          )}
        >
          ⚠ Sin contacto ({sinContacto})
        </button>
        {(q || actividadFilter || etapaFilter || soloSinContacto) && (
          <button
            onClick={() => { setQ(''); setActividadFilter(''); setEtapaFilter(''); setSoloSinContacto(false) }}
            className="h-10 px-3 text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1 rounded-lg border border-gray-200 bg-white"
          >
            <X className="h-3.5 w-3.5" /> Limpiar
          </button>
        )}
        <span className="ml-auto text-sm text-gray-400">
          {loading ? 'Cargando...' : `${filtrados.length} de ${clientes.length} clientes`}
        </span>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
            <tr>
              <Header col="nombre">Cliente</Header>
              <Header col="etapa">Etapa</Header>
              <Header col="actividades" className="hidden lg:table-cell">Actividades</Header>
              <Header col="ultimo">Último contacto</Header>
              <Header col="proximo" className="hidden md:table-cell">Próximo</Header>
              <Header col="canal" className="hidden xl:table-cell">Canal</Header>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">Cargando todos los clientes...</td></tr>
            ) : filtrados.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">Sin clientes con los filtros aplicados</td></tr>
            ) : (
              filtrados.map(c => {
                const dias = diasDesde(c.ultimo_seguimiento)
                const nunca = c.total_seguimientos === 0
                const etapaCfg = c.etapa ? ETAPA_BADGE[c.etapa] : null
                const abierto = contactadoId === c.id
                return (
                  <tr key={c.id} className={cn('hover:bg-gray-50 transition-colors group', nunca && 'bg-red-50/40')}>
                    <td className="px-3 py-2.5 font-medium max-w-[200px]">
                      <Link href={`/clientes/${c.id}`} className="hover:text-orange-600 truncate block">{c.nombre}</Link>
                      <span className="text-xs text-gray-400 font-normal truncate block">{c.telefono || c.correo || ''}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      {etapaCfg ? (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${etapaCfg}`}>
                          {ETAPAS_FUNNEL.find(e => e.value === c.etapa)?.label}
                        </span>
                      ) : <span className="text-xs text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-2.5 hidden lg:table-cell max-w-[220px]">
                      <span className="text-xs text-gray-500 truncate block" title={c.actividades.join(', ')}>
                        {c.actividades.length > 0 ? c.actividades.join(', ') : '—'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {nunca ? (
                        <span className="text-xs font-semibold text-red-600 bg-red-100 px-2 py-0.5 rounded">⚠ Nunca contactado</span>
                      ) : (
                        <span className="text-xs text-gray-500">
                          {fmt(c.ultimo_seguimiento)}
                          {dias !== null && <span className={cn('ml-1', dias > 14 ? 'text-red-500 font-medium' : 'text-gray-400')}>({dias}d)</span>}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 hidden md:table-cell">
                      <span className={cn('text-xs', c.proximo_contacto && c.proximo_contacto <= new Date().toISOString().slice(0, 10) ? 'text-red-500 font-medium' : 'text-gray-400')}>
                        {fmt(c.proximo_contacto) || '—'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 hidden xl:table-cell">
                      <span className="text-xs text-gray-400">{c.procedencia || '—'}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1 justify-end">
                        {c.telefono && (
                          <a
                            href={`https://wa.me/${c.telefono.replace(/\D/g, '')}`}
                            target="_blank" rel="noopener noreferrer" title="WhatsApp"
                            className="p-1.5 rounded-lg text-gray-300 hover:text-green-600 hover:bg-green-50 transition-colors"
                          >
                            <MessageSquare size={14} />
                          </a>
                        )}
                        {c.telefono && (
                          <a href={`tel:${c.telefono}`} title="Llamar" className="p-1.5 rounded-lg text-gray-300 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                            <Phone size={14} />
                          </a>
                        )}
                        {c.correo && (
                          <a
                            href={`https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(c.correo)}`}
                            target="_blank" rel="noopener noreferrer" title={`Correo a ${c.correo}`}
                            className="p-1.5 rounded-lg text-gray-300 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                          >
                            <Mail size={14} />
                          </a>
                        )}
                        <div className="relative" data-contactado-panel>
                          <button
                            onClick={e => {
                              e.stopPropagation()
                              if (abierto) { setContactadoId(null); setContactadoPos(null); return }
                              const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect()
                              setContactadoPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
                              setContactadoId(c.id)
                            }}
                            title="Registrar contacto"
                            className={cn(
                              'p-1.5 rounded-lg transition-colors',
                              abierto ? 'text-orange-600 bg-orange-50' : 'text-gray-300 hover:text-orange-600 hover:bg-orange-50'
                            )}
                          >
                            <CheckCircle2 size={14} />
                          </button>
                          {abierto && contactadoPos && (
                            <ContactadoPanel
                              clienteId={c.id}
                              pos={contactadoPos}
                              onSaved={() => { setContactadoId(null); setContactadoPos(null); cargar() }}
                            />
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
