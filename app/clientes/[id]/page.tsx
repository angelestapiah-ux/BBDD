'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ClienteConDetalle } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Pencil, Trash2, Plus } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ClienteFormDialog } from '@/components/clientes/ClienteFormDialog'
import { SeguimientoForm } from '@/components/clientes/SeguimientoForm'
import { PagoForm } from '@/components/clientes/PagoForm'
import { AsistenciaForm } from '@/components/clientes/AsistenciaForm'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

function fmt(d: string | null) {
  if (!d) return '—'
  try { return format(new Date(d + 'T12:00:00'), 'dd/MM/yyyy', { locale: es }) }
  catch { return d }
}

export default function ClienteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [cliente, setCliente] = useState<ClienteConDetalle | null>(null)
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [segOpen, setSegOpen] = useState(false)
  const [pagoOpen, setPagoOpen] = useState(false)
  const [asistenciaOpen, setAsistenciaOpen] = useState(false)

  const fetchCliente = useCallback(async () => {
    const res = await fetch(`/api/clientes/${id}`)
    if (!res.ok) { router.push('/clientes'); return }
    setCliente(await res.json())
    setLoading(false)
  }, [id, router])

  useEffect(() => { fetchCliente() }, [fetchCliente])

  async function handleEdit(data: Partial<ClienteConDetalle>) {
    const res = await fetch(`/api/clientes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      toast.success('Cliente actualizado')
      setEditOpen(false)
      fetchCliente()
    } else {
      toast.error('Error al actualizar')
    }
  }

  async function handleDelete() {
    if (!confirm('¿Eliminar este cliente? Esta acción no se puede deshacer.')) return
    const res = await fetch(`/api/clientes/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Cliente eliminado')
      router.push('/clientes')
    } else {
      toast.error('Error al eliminar')
    }
  }

  async function addSeguimiento(data: Record<string, string>) {
    const res = await fetch('/api/seguimientos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, cliente_id: id }),
    })
    if (res.ok) { toast.success('Seguimiento registrado'); setSegOpen(false); fetchCliente() }
    else toast.error('Error al guardar')
  }

  async function addPago(data: Record<string, string>) {
    const res = await fetch('/api/pagos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, cliente_id: id }),
    })
    if (res.ok) { toast.success('Pago registrado'); setPagoOpen(false); fetchCliente() }
    else toast.error('Error al guardar')
  }

  async function addAsistencia(data: Record<string, string>) {
    const res = await fetch('/api/asistencias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, cliente_id: id }),
    })
    if (res.ok) { toast.success('Asistencia registrada'); setAsistenciaOpen(false); fetchCliente() }
    else toast.error('Error al guardar')
  }

  if (loading) return <div className="p-8 text-gray-400">Cargando...</div>
  if (!cliente) return null

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/clientes" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h2 className="text-2xl font-bold text-gray-900 flex-1">{cliente.nombre}</h2>
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
          <Pencil className="h-4 w-4 mr-2" /> Editar
        </Button>
        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={handleDelete}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Datos básicos */}
      <Card className="mb-6">
        <CardContent className="pt-4 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div><p className="text-gray-400 mb-0.5">Correo</p><p className="font-medium">{cliente.correo || '—'}</p></div>
          <div><p className="text-gray-400 mb-0.5">Teléfono</p><p className="font-medium">{cliente.telefono || '—'}</p></div>
          <div><p className="text-gray-400 mb-0.5">Procedencia</p>
            {cliente.procedencia ? <Badge variant="secondary">{cliente.procedencia}</Badge> : <p className="font-medium">—</p>}
          </div>
          <div><p className="text-gray-400 mb-0.5">Cumpleaños</p><p className="font-medium">{fmt(cliente.cumpleanos)}</p></div>
          <div><p className="text-gray-400 mb-0.5">Incorporación</p><p className="font-medium">{fmt(cliente.fecha_incorporacion)}</p></div>
          {cliente.comentario && (
            <div className="col-span-2 md:col-span-3">
              <p className="text-gray-400 mb-0.5">Comentario</p>
              <p className="font-medium whitespace-pre-wrap">{cliente.comentario}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="seguimientos">
        <TabsList>
          <TabsTrigger value="asistencias">Asistencias ({cliente.asistencias?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="pagos">Pagos ({cliente.pagos?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="seguimientos">Seguimientos ({cliente.seguimientos?.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="asistencias">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-3">
              <CardTitle className="text-sm font-medium">Actividades asistidas</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setAsistenciaOpen(true)}>
                <Plus className="h-3 w-3 mr-1" /> Agregar
              </Button>
            </CardHeader>
            <CardContent>
              {!cliente.asistencias?.length ? (
                <p className="text-sm text-gray-400">Sin asistencias registradas</p>
              ) : (
                <ul className="space-y-2">
                  {cliente.asistencias.map(a => (
                    <li key={a.id} className="flex items-center justify-between text-sm">
                      <span className="font-medium">{a.actividad_nombre}</span>
                      <span className="text-gray-400">{fmt(a.fecha_asistencia)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pagos">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-3">
              <CardTitle className="text-sm font-medium">Pagos</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setPagoOpen(true)}>
                <Plus className="h-3 w-3 mr-1" /> Agregar
              </Button>
            </CardHeader>
            <CardContent>
              {!cliente.pagos?.length ? (
                <p className="text-sm text-gray-400">Sin pagos registrados</p>
              ) : (
                <ul className="space-y-2">
                  {cliente.pagos.map(p => (
                    <li key={p.id} className="flex items-center justify-between text-sm">
                      <div>
                        <span className="font-medium">{p.actividad_nombre}</span>
                        {p.monto && <span className="ml-2 text-emerald-600 font-semibold">${p.monto.toLocaleString()}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={p.estado === 'pagado' ? 'default' : p.estado === 'parcial' ? 'secondary' : 'outline'}>
                          {p.estado}
                        </Badge>
                        <span className="text-gray-400">{fmt(p.fecha_pago)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seguimientos">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-3">
              <CardTitle className="text-sm font-medium">Historial de contacto</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setSegOpen(true)}>
                <Plus className="h-3 w-3 mr-1" /> Agregar
              </Button>
            </CardHeader>
            <CardContent>
              {!cliente.seguimientos?.length ? (
                <p className="text-sm text-gray-400">Sin seguimientos registrados</p>
              ) : (
                <ul className="space-y-3">
                  {cliente.seguimientos.map(s => (
                    <li key={s.id} className="text-sm border-l-2 border-emerald-200 pl-3">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Badge variant="outline" className="text-xs">{s.tipo}</Badge>
                        <span className="text-gray-400">{fmt(s.fecha)}</span>
                        {s.usuario && <span className="text-gray-400">· {s.usuario}</span>}
                      </div>
                      <p className="whitespace-pre-wrap">{s.notas}</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ClienteFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        onSubmit={handleEdit}
        title="Editar cliente"
        initial={cliente}
      />
      <SeguimientoForm open={segOpen} onOpenChange={setSegOpen} onSubmit={addSeguimiento} />
      <PagoForm open={pagoOpen} onOpenChange={setPagoOpen} onSubmit={addPago} />
      <AsistenciaForm open={asistenciaOpen} onOpenChange={setAsistenciaOpen} onSubmit={addAsistencia} />
    </div>
  )
}
