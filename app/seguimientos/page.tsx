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
  cliente_id: string
  clientes?: { nombre: string }
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
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Seguimientos</h2>
        <p className="text-gray-500 text-sm mt-1">Historial de contactos recientes. Para agregar uno, ve al perfil del cliente.</p>
      </div>

      {loading ? (
        <p className="text-gray-400">Cargando...</p>
      ) : items.length === 0 ? (
        <p className="text-gray-400">No hay seguimientos registrados</p>
      ) : (
        <ul className="space-y-3">
          {items.map(s => (
            <li key={s.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">{s.tipo}</Badge>
                    <span className="text-xs text-gray-400">{fmt(s.fecha)}</span>
                    {s.usuario && <span className="text-xs text-gray-400">· {s.usuario}</span>}
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{s.notas}</p>
                </div>
                <Link
                  href={`/clientes/${s.cliente_id}`}
                  className="text-xs text-orange-600 hover:underline whitespace-nowrap"
                >
                  Ver cliente →
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
