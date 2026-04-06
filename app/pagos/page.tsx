'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

interface PagoConCliente {
  id: string
  actividad_nombre: string
  monto: number | null
  fecha_pago: string | null
  metodo_pago: string | null
  estado: string
  notas: string | null
  cliente_id: string
}

export default function PagosPage() {
  const [pagos, setPagos] = useState<PagoConCliente[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/pagos')
      .then(r => r.json())
      .then(data => { setPagos(data || []); setLoading(false) })
  }, [])

  const total = pagos.filter(p => p.estado === 'pagado').reduce((s, p) => s + (p.monto || 0), 0)

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Pagos</h2>
        <p className="text-gray-500 text-sm mt-1">Para registrar un pago, ve al perfil del cliente.</p>
      </div>

      {!loading && pagos.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6 inline-block">
          <p className="text-sm text-emerald-600">Total pagado registrado</p>
          <p className="text-2xl font-bold text-emerald-700">${total.toLocaleString()}</p>
        </div>
      )}

      {loading ? (
        <p className="text-gray-400">Cargando...</p>
      ) : pagos.length === 0 ? (
        <p className="text-gray-400">No hay pagos registrados</p>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Actividad</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Monto</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Método</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pagos.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{p.actividad_nombre}</td>
                  <td className="px-4 py-3">{p.monto ? `$${p.monto.toLocaleString()}` : '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{p.metodo_pago || '—'}</td>
                  <td className="px-4 py-3">
                    <Badge variant={p.estado === 'pagado' ? 'default' : p.estado === 'parcial' ? 'secondary' : 'outline'}>
                      {p.estado}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{p.fecha_pago || '—'}</td>
                  <td className="px-4 py-3">
                    <Link href={`/clientes/${p.cliente_id}`} className="text-xs text-emerald-600 hover:underline">
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
