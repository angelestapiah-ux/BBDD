'use client'

import { useEffect, useState, useCallback } from 'react'
import { Cliente } from '@/lib/types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Search, Plus, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { ClienteFormDialog } from '@/components/clientes/ClienteFormDialog'
import { toast } from 'sonner'

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [total, setTotal] = useState(0)
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const limit = 50

  const fetchClientes = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ q, page: String(page), limit: String(limit) })
    const res = await fetch(`/api/clientes?${params}`)
    const json = await res.json()
    setClientes(json.data || [])
    setTotal(json.count || 0)
    setLoading(false)
  }, [q, page])

  useEffect(() => {
    const t = setTimeout(fetchClientes, 300)
    return () => clearTimeout(t)
  }, [fetchClientes])

  async function handleCreate(data: Partial<Cliente>) {
    const res = await fetch('/api/clientes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      toast.success('Cliente creado correctamente')
      setDialogOpen(false)
      fetchClientes()
    } else {
      const err = await res.json()
      toast.error(err.error || 'Error al crear cliente')
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Clientes</h2>
          <p className="text-sm text-gray-500">{total} clientes en total</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-2" /> Nuevo cliente
        </Button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          className="pl-9"
          placeholder="Buscar por nombre, correo o teléfono..."
          value={q}
          onChange={e => { setQ(e.target.value); setPage(1) }}
        />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Cargando...</div>
        ) : clientes.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            {q ? 'No se encontraron clientes' : 'No hay clientes registrados'}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Nombre</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Correo</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Teléfono</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Procedencia</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {clientes.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{c.nombre}</td>
                  <td className="px-4 py-3 text-gray-500">{c.correo || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{c.telefono || '—'}</td>
                  <td className="px-4 py-3">
                    {c.procedencia && (
                      <Badge variant="secondary" className="text-xs">{c.procedencia}</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/clientes/${c.id}`} className="flex items-center justify-end text-emerald-600 hover:text-emerald-700">
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {total > limit && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500">
            Mostrando {Math.min((page - 1) * limit + 1, total)}–{Math.min(page * limit, total)} de {total}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              Anterior
            </Button>
            <Button variant="outline" size="sm" disabled={page * limit >= total} onClick={() => setPage(p => p + 1)}>
              Siguiente
            </Button>
          </div>
        </div>
      )}

      <ClienteFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleCreate}
        title="Nuevo cliente"
      />
    </div>
  )
}
