'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'

interface SeguimientoConCliente {
  id: string
  tipo: string
  fecha: string
  notas: string
  usuario: string | null
  actividad_nombre: string | null
  cliente_id: string
  clientes?: { nombre: string; correo: string | null; telefono: string | null }
}

const TIPO_COLOR: Record<string, string> = {
  whatsapp: 'bg-green-100 text-green-700',
  llamada: 'bg-blue-100 text-blue-700',
  correo: 'bg-purple-100 text-purple-700',
  visita: 'bg-orange-100 text-orange-700',
  otro: 'bg-gray-100 text-gray-600',
}

export default function SeguimientosPage() {
  const [items, setItems] = useState<SeguimientoConCliente[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/seguimientos')
      .then(r => r.json())
      .then(data => { setItems(data || []); setLoading(false) })
  }, [])

  function fmt(d: string) {
    try { return format(new Date(d), 'dd/MM/yyyy HH:mm', { locale: es }) }
    catch { return d }
  }

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Seguimientos</h2>
        <p className="text-gray-500 text-sm mt-1">Historial de contactos. Para agregar uno, ve al perfil del cliente.</p>
      </div>

      {loading ? (
        <p className="text-gray-400">Cargando...</p>
      ) : items.length === 0 ? (
        <p className="text-gray-400">No hay seguimientos registrados</p>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Cliente</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Contacto</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Actividad</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Notas</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Responsable</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map(s => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmt(s.fecha)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${TIPO_COLOR[s.tipo] || TIPO_COLOR.otro}`}>
                      {s.tipo}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium whitespace-nowrap">{s.clientes?.nombre || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">
                    <div className="space-y-0.5">
                      {s.clientes?.correo && <div className="text-xs">{s.clientes.correo}</div>}
                      {s.clientes?.telefono && <div className="text-xs">{s.clientes.telefono}</div>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{s.actividad_nombre || '—'}</td>
                  <td className="px-4 py-3 max-w-xs">
                    <p className="truncate text-gray-700" title={s.notas}>{s.notas}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{s.usuario || '—'}</td>
                  <td className="px-4 py-3">
                    <Link href={`/clientes/${s.cliente_id}`} className="text-xs text-orange-600 hover:underline whitespace-nowrap">
                      Ver →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
