'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ClienteConDetalle, Asistencia, Pago, Seguimiento, ETAPAS_FUNNEL, EtapaFunnel } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Pencil, Trash2, Plus, FileSpreadsheet, FileText, Receipt, MessageSquare, Phone, Mail, MoreHorizontal } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ClienteFormDialog } from '@/components/clientes/ClienteFormDialog'
import { exportarPerfilExcel, exportarPerfilPDF } from '@/lib/export'
import { SeguimientoForm } from '@/components/clientes/SeguimientoForm'
import { PagoForm } from '@/components/clientes/PagoForm'
import { AsistenciaForm } from '@/components/clientes/AsistenciaForm'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

function fmt(d: string | null) {
  if (!d) return null
  try { return format(new Date(d + 'T12:00:00'), 'dd/MM/yyyy', { locale: es }) }
  catch { return d }
}

// ─── Etapa badge config ─────────────────────────────────────────────────
const ETAPA_BADGE: Record<EtapaFunnel, { bg: string; text: string }> = {
  nuevo:               { bg: 'bg-gray-100',   text: 'text-gray-600' },
  contactado:          { bg: 'bg-blue-100',   text: 'text-blue-700' },
  con_interes:         { bg: 'bg-violet-100', text: 'text-violet-700' },
  cotizacion_enviada:  { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  negociando:          { bg: 'bg-orange-100', text: 'text-orange-700' },
  inscrito:            { bg: 'bg-green-100',  text: 'text-green-700' },
}

// ─── Campo helper: shows value if present, "+agregar" if not ───────────
function Campo({
  label,
  value,
  onAgregar,
  badge,
}: {
  label: string
  value: React.ReactNode | null | undefined
  onAgregar?: () => void
  badge?: boolean
}) {
  const hasValue = value !== null && value !== undefined && value !== '' && value !== '—'
  if (!hasValue && !onAgregar) return null
  if (!hasValue) {
    return (
      <div>
        <p className="text-xs text-gray-400 mb-0.5">{label}</p>
        <button
          onClick={onAgregar}
          className="text-xs text-gray-300 hover:text-orange-500 transition-colors"
        >
          + agregar
        </button>
      </div>
    )
  }
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      {badge ? (
        <Badge variant="secondary" className="text-xs">{value}</Badge>
      ) : (
        <p className="text-sm font-medium text-gray-800">{value}</p>
      )}
    </div>
  )
}

export default function ClienteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [cliente, setCliente] = useState<ClienteConDetalle | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAllFields, setShowAllFields] = useState(false)
  const [etapaCambiando, setEtapaCambiando] = useState(false)

  // dialogs de creación
  const [editOpen, setEditOpen] = useState(false)
  const [segOpen, setSegOpen] = useState(false)
  const [pagoOpen, setPagoOpen] = useState(false)
  const [asistenciaOpen, setAsistenciaOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)

  // dialogs de edición
  const [editSeg, setEditSeg] = useState<Seguimiento | null>(null)
  const [editPago, setEditPago] = useState<Pago | null>(null)
  const [editAsistencia, setEditAsistencia] = useState<Asistencia | null>(null)

  const fetchCliente = useCallback(async () => {
    const res = await fetch(`/api/clientes/${id}`)
    if (!res.ok) { router.push('/clientes'); return }
    setCliente(await res.json())
    setLoading(false)
  }, [id, router])

  useEffect(() => { fetchCliente() }, [fetchCliente])

  async function exportar(tipo: 'excel' | 'pdf') {
    toast.info('Preparando exportación...')
    const res = await fetch(`/api/clientes/${id}`)
    if (!res.ok) { toast.error('Error al obtener datos'); return }
    const datos: ClienteConDetalle = await res.json()
    if (tipo === 'excel') exportarPerfilExcel(datos)
    else await exportarPerfilPDF(datos)
  }

  async function handleEdit(data: Partial<ClienteConDetalle>) {
    const res = await fetch(`/api/clientes/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    })
    if (res.ok) { toast.success('Cliente actualizado'); setEditOpen(false); fetchCliente() }
    else toast.error('Error al actualizar')
  }

  async function handleEtapaChange(etapa: EtapaFunnel) {
    setEtapaCambiando(true)
    const res = await fetch(`/api/clientes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ etapa }),
    })
    setEtapaCambiando(false)
    if (res.ok) {
      setCliente(prev => prev ? { ...prev, etapa } : prev)
      toast.success('Etapa actualizada')
    } else {
      toast.error('Error al actualizar')
    }
  }

  async function handleDeleteCliente() {
    if (!confirm('¿Eliminar este cliente? Esta acción no se puede deshacer.')) return
    const res = await fetch(`/api/clientes/${id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Cliente eliminado'); router.push('/clientes') }
    else toast.error('Error al eliminar')
  }

  async function addSeguimiento(data: Record<string, string>) {
    const res = await fetch('/api/seguimientos', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, cliente_id: id }),
    })
    if (res.ok) { toast.success('Seguimiento registrado'); setSegOpen(false); fetchCliente() }
    else toast.error('Error al guardar')
  }

  async function addPago(data: Record<string, string | boolean>) {
    const res = await fetch('/api/pagos', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, cliente_id: id }),
    })
    if (res.ok) { toast.success('Pago registrado'); setPagoOpen(false); fetchCliente() }
    else toast.error('Error al guardar')
  }

  async function addAsistencia(data: Record<string, string>) {
    const res = await fetch('/api/asistencias', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, cliente_id: id }),
    })
    if (res.ok) { toast.success('Asistencia registrada'); setAsistenciaOpen(false); fetchCliente() }
    else toast.error('Error al guardar')
  }

  async function saveEditSeg(data: Partial<Seguimiento>) {
    if (!editSeg) return
    const res = await fetch(`/api/seguimientos/${editSeg.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    })
    if (res.ok) { toast.success('Seguimiento actualizado'); setEditSeg(null); fetchCliente() }
    else toast.error('Error al actualizar')
  }

  async function deleteSeg(s: Seguimiento) {
    if (!confirm('¿Eliminar este seguimiento?')) return
    const res = await fetch(`/api/seguimientos/${s.id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Eliminado'); fetchCliente() }
    else toast.error('Error al eliminar')
  }

  async function saveEditPago(data: Partial<Pago>) {
    if (!editPago) return
    const res = await fetch(`/api/pagos/${editPago.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    })
    if (res.ok) { toast.success('Pago actualizado'); setEditPago(null); fetchCliente() }
    else toast.error('Error al actualizar')
  }

  async function deletePago(p: Pago) {
    if (!confirm('¿Eliminar este pago?')) return
    const res = await fetch(`/api/pagos/${p.id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Eliminado'); fetchCliente() }
    else toast.error('Error al eliminar')
  }

  async function saveEditAsistencia(data: Partial<Asistencia>) {
    if (!editAsistencia) return
    const res = await fetch(`/api/asistencias/${editAsistencia.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    })
    if (res.ok) { toast.success('Asistencia actualizada'); setEditAsistencia(null); fetchCliente() }
    else toast.error('Error al actualizar')
  }

  async function deleteAsistencia(a: Asistencia) {
    if (!confirm('¿Eliminar esta asistencia?')) return
    const res = await fetch(`/api/asistencias/${a.id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Eliminado'); fetchCliente() }
    else toast.error('Error al eliminar')
  }

  if (loading) return <div className="p-8 text-gray-400">Cargando...</div>
  if (!cliente) return null

  const etapaCfg = cliente.etapa ? ETAPA_BADGE[cliente.etapa] : null
  const etapaLabel = cliente.etapa ? ETAPAS_FUNNEL.find(e => e.value === cliente.etapa)?.label : null

  return (
    <div className="p-6 max-w-4xl">

      {/* ─── Header ────────────────────────────────────────────────────── */}
      <div className="flex items-start gap-3 mb-6">
        <Link href="/clientes" className="text-gray-400 hover:text-gray-600 mt-1">
          <ArrowLeft className="h-5 w-5" />
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-2xl font-bold text-gray-900">{cliente.nombre}</h2>

            {/* Etapa — clickable select */}
            {etapaCfg && etapaLabel && (
              <Select
                value={cliente.etapa || 'nuevo'}
                onValueChange={v => handleEtapaChange(v as EtapaFunnel)}
                disabled={etapaCambiando}
              >
                <SelectTrigger className={`h-6 text-xs px-2 border-0 shadow-none w-auto gap-1 font-medium rounded-full ${etapaCfg.bg} ${etapaCfg.text}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ETAPAS_FUNNEL.map(e => {
                    const cfg = ETAPA_BADGE[e.value]
                    return (
                      <SelectItem key={e.value} value={e.value}>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>{e.label}</span>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            )}

            {!cliente.etapa && (
              <Select value="" onValueChange={v => handleEtapaChange(v as EtapaFunnel)}>
                <SelectTrigger className="h-6 text-xs px-2 border-dashed border-gray-300 text-gray-400 w-auto shadow-none">
                  <SelectValue placeholder="+ etapa" />
                </SelectTrigger>
                <SelectContent>
                  {ETAPAS_FUNNEL.map(e => (
                    <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Quick contact row */}
          <div className="flex items-center gap-3 mt-1.5">
            {cliente.telefono && (
              <>
                <a
                  href={`https://wa.me/${cliente.telefono.replace(/\D/g, '')}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-green-600 hover:underline"
                >
                  <MessageSquare size={12} /> {cliente.telefono}
                </a>
                <a href={`tel:${cliente.telefono}`} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                  <Phone size={12} /> Llamar
                </a>
              </>
            )}
            {cliente.correo && (
              <a href={`mailto:${cliente.correo}`} className="flex items-center gap-1 text-xs text-gray-500 hover:underline">
                <Mail size={12} /> {cliente.correo}
              </a>
            )}
            {cliente.procedencia && (
              <Badge variant="secondary" className="text-xs h-5">{cliente.procedencia}</Badge>
            )}
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="outline" className="bg-orange-600 hover:bg-orange-700 text-white border-orange-600 hover:border-orange-700" onClick={() => setSegOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Seguimiento
          </Button>
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <div className="relative">
            <Button variant="outline" size="sm" onClick={() => setMoreOpen(!moreOpen)}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
            {moreOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-xl shadow-xl border border-gray-200 py-1 w-44">
                <button onClick={() => { exportar('excel'); setMoreOpen(false) }} className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-gray-50 text-gray-700">
                  <FileSpreadsheet size={14} /> Exportar Excel
                </button>
                <button onClick={() => { exportar('pdf'); setMoreOpen(false) }} className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-gray-50 text-gray-700">
                  <FileText size={14} /> Exportar PDF
                </button>
                <div className="border-t border-gray-100 my-1" />
                <button onClick={() => { handleDeleteCliente(); setMoreOpen(false) }} className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-red-50 text-red-600">
                  <Trash2 size={14} /> Eliminar cliente
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Perfil limpio ─────────────────────────────────────────────── */}
      <Card className="mb-6">
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4 text-sm">

            {/* Siempre visibles si tienen valor */}
            <Campo label="Teléfono 2" value={cliente.telefono2} onAgregar={() => setEditOpen(true)} />
            <Campo label="Correo 2" value={cliente.correo2} onAgregar={() => setEditOpen(true)} />
            <Campo label="RUT / DNI" value={cliente.documento_identidad} onAgregar={() => setEditOpen(true)} />
            <Campo label="Edad" value={cliente.edad?.toString()} onAgregar={() => setEditOpen(true)} />
            <Campo label="Género" value={cliente.genero ? cliente.genero.charAt(0).toUpperCase() + cliente.genero.slice(1) : null} onAgregar={() => setEditOpen(true)} />
            <Campo label="Estado civil" value={cliente.estado_civil} onAgregar={() => setEditOpen(true)} />
            <Campo label="Profesión" value={cliente.profesion} onAgregar={() => setEditOpen(true)} />
            <Campo label="Ciudad" value={cliente.ciudad} onAgregar={() => setEditOpen(true)} />
            <Campo label="País" value={cliente.pais} onAgregar={() => setEditOpen(true)} />

            {(showAllFields || (cliente.cumpleanos || cliente.fecha_incorporacion)) && (
              <>
                <Campo label="Cumpleaños" value={fmt(cliente.cumpleanos)} onAgregar={() => setEditOpen(true)} />
                <Campo label="Incorporación" value={fmt(cliente.fecha_incorporacion)} onAgregar={() => setEditOpen(true)} />
              </>
            )}

            {/* Tipo de cliente */}
            {cliente.tipos_cliente && cliente.tipos_cliente.length > 0 && (
              <div className="col-span-2 md:col-span-3">
                <p className="text-xs text-gray-400 mb-1">Tipo de cliente</p>
                <div className="flex flex-wrap gap-2 items-center">
                  {cliente.tipos_cliente.map(t => (
                    <Badge key={t} className="bg-orange-100 text-orange-700 border-orange-200 text-xs">{t}</Badge>
                  ))}
                  {cliente.modalidad_paciente && (
                    <Badge variant="outline" className="capitalize border-blue-300 text-blue-700 text-xs">
                      {cliente.modalidad_paciente}
                    </Badge>
                  )}
                  {cliente.terapeuta && (
                    <span className="text-xs text-gray-500">Terapeuta: {cliente.terapeuta}</span>
                  )}
                </div>
              </div>
            )}

            {/* Comentario */}
            {cliente.comentario && (
              <div className="col-span-2 md:col-span-3">
                <p className="text-xs text-gray-400 mb-0.5">Comentario</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{cliente.comentario}</p>
              </div>
            )}
          </div>

          {/* Toggle "ver más / menos" */}
          <button
            onClick={() => setShowAllFields(!showAllFields)}
            className="mt-4 text-xs text-gray-400 hover:text-orange-600 transition-colors flex items-center gap-1"
          >
            {showAllFields ? '▲ Ver menos' : '▼ Ver todos los campos'}
          </button>
        </CardContent>
      </Card>

      {/* ─── Tabs ──────────────────────────────────────────────────────── */}
      <Tabs defaultValue="seguimientos">
        <TabsList>
          <TabsTrigger value="seguimientos">
            Seguimientos ({cliente.seguimientos?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="pagos">
            Pagos ({cliente.pagos?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="asistencias">
            Asistencias ({cliente.asistencias?.length ?? 0})
          </TabsTrigger>
        </TabsList>

        {/* SEGUIMIENTOS */}
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
                <div className="text-center py-6">
                  <p className="text-sm text-gray-400 mb-3">Sin seguimientos registrados</p>
                  <Button size="sm" className="bg-orange-600 hover:bg-orange-700" onClick={() => setSegOpen(true)}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Registrar primer contacto
                  </Button>
                </div>
              ) : (
                <ul className="space-y-3">
                  {cliente.seguimientos.map(s => (
                    <li key={s.id} className="text-sm border-l-2 border-orange-200 pl-3 group">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Badge variant="outline" className="text-xs">{s.tipo}</Badge>
                        <span className="text-gray-400">{fmt(s.fecha)}</span>
                        {s.usuario && <span className="text-gray-400">· {s.usuario}</span>}
                        <div className="ml-auto flex gap-1">
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100" onClick={() => setEditSeg(s)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-red-500" onClick={() => deleteSeg(s)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <p className="whitespace-pre-wrap">{s.notas}</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* PAGOS */}
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
                <div className="text-center py-6">
                  <p className="text-sm text-gray-400 mb-3">Sin pagos registrados</p>
                  <Button size="sm" className="bg-orange-600 hover:bg-orange-700" onClick={() => setPagoOpen(true)}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Agregar pago
                  </Button>
                </div>
              ) : (
                <ul className="space-y-2">
                  {cliente.pagos.map(p => (
                    <li key={p.id} className="text-sm border-b border-gray-100 last:border-0 pb-2 last:pb-0 group">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium">{p.actividad_nombre}</span>
                          {p.monto && <span className="ml-2 text-orange-600 font-semibold">${p.monto.toLocaleString()}</span>}
                          {p.requiere_factura && <span title="Requiere factura"><Receipt className="inline h-3.5 w-3.5 text-orange-500 ml-1" /></span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={p.estado === 'pagado' ? 'default' : p.estado === 'parcial' ? 'secondary' : 'outline'}>
                            {p.estado}
                          </Badge>
                          <span className="text-gray-400">{fmt(p.fecha_pago)}</span>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100" onClick={() => setEditPago(p)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-red-500" onClick={() => deletePago(p)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      {p.notas && <p className="text-gray-400 mt-0.5 text-xs">{p.notas}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ASISTENCIAS */}
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
                <div className="text-center py-6">
                  <p className="text-sm text-gray-400 mb-3">Sin asistencias registradas</p>
                  <Button size="sm" className="bg-orange-600 hover:bg-orange-700" onClick={() => setAsistenciaOpen(true)}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Registrar asistencia
                  </Button>
                </div>
              ) : (
                <ul className="space-y-2">
                  {cliente.asistencias.map(a => (
                    <li key={a.id} className="flex items-center justify-between text-sm group">
                      <span className="font-medium">{a.actividad_nombre}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">{fmt(a.fecha_asistencia)}</span>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100" onClick={() => setEditAsistencia(a)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-red-500" onClick={() => deleteAsistencia(a)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── Dialogs ───────────────────────────────────────────────────── */}
      <ClienteFormDialog open={editOpen} onOpenChange={setEditOpen} onSubmit={handleEdit} title="Editar cliente" initial={cliente} />
      <SeguimientoForm open={segOpen} onOpenChange={setSegOpen} onSubmit={addSeguimiento} />
      <PagoForm open={pagoOpen} onOpenChange={setPagoOpen} onSubmit={addPago} asistencias={cliente.asistencias ?? []} />
      <AsistenciaForm open={asistenciaOpen} onOpenChange={setAsistenciaOpen} onSubmit={addAsistencia} />

      {editSeg && <EditSeguimientoDialog seg={editSeg} onClose={() => setEditSeg(null)} onSave={saveEditSeg} />}
      {editPago && <EditPagoDialog pago={editPago} onClose={() => setEditPago(null)} onSave={saveEditPago} asistencias={cliente.asistencias ?? []} />}
      {editAsistencia && <EditAsistenciaDialog asistencia={editAsistencia} onClose={() => setEditAsistencia(null)} onSave={saveEditAsistencia} />}
    </div>
  )
}

// ─── Dialogs de edición inline ──────────────────────────────────────────

function EditSeguimientoDialog({ seg, onClose, onSave }: {
  seg: Seguimiento
  onClose: () => void
  onSave: (data: Partial<Seguimiento>) => Promise<void>
}) {
  const [tipo, setTipo] = useState(seg.tipo)
  const [notas, setNotas] = useState(seg.notas)
  const [fecha, setFecha] = useState(seg.fecha?.slice(0, 16) || '')
  const [usuario, setUsuario] = useState(seg.usuario || '')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await onSave({ tipo, notas, fecha, usuario: usuario || null })
    setSaving(false)
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Editar seguimiento</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={v => v && setTipo(v as Seguimiento['tipo'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="llamada">Llamada</SelectItem>
                  <SelectItem value="correo">Correo</SelectItem>
                  <SelectItem value="visita">Visita</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Fecha y hora</Label>
              <Input type="datetime-local" value={fecha} onChange={e => setFecha(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Responsable</Label>
            <Input value={usuario} onChange={e => setUsuario(e.target.value)} />
          </div>
          <div>
            <Label>Notas *</Label>
            <Textarea rows={3} required value={notas} onChange={e => setNotas(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving} className="bg-orange-600 hover:bg-orange-700">
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EditPagoDialog({ pago, onClose, onSave, asistencias }: {
  pago: Pago
  onClose: () => void
  onSave: (data: Partial<Pago>) => Promise<void>
  asistencias: Asistencia[]
}) {
  const [actividad, setActividad] = useState(pago.actividad_nombre)
  const [monto, setMonto] = useState(pago.monto?.toString() || '')
  const [fecha, setFecha] = useState(pago.fecha_pago || '')
  const [metodo, setMetodo] = useState(pago.metodo_pago || 'transferencia')
  const [estado, setEstado] = useState(pago.estado)
  const [notas, setNotas] = useState(pago.notas || '')
  const [saving, setSaving] = useState(false)

  const actividadesUnicas = Array.from(new Map(asistencias.map(a => [a.actividad_nombre, a])).values())

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await onSave({ actividad_nombre: actividad, monto: monto ? Number(monto) : null, fecha_pago: fecha || null, metodo_pago: metodo, estado, notas: notas || null })
    setSaving(false)
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Editar pago</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Actividad *</Label>
            <Select value={actividad} onValueChange={v => v && setActividad(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {actividadesUnicas.map(a => (
                  <SelectItem key={a.id} value={a.actividad_nombre}>{a.actividad_nombre}</SelectItem>
                ))}
                <SelectItem value={actividad}>{actividad} (actual)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Monto</Label>
              <Input type="number" value={monto} onChange={e => setMonto(e.target.value)} />
            </div>
            <div>
              <Label>Fecha</Label>
              <Input type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
            </div>
            <div>
              <Label>Método</Label>
              <Select value={metodo} onValueChange={v => v && setMetodo(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="tarjeta">Tarjeta</SelectItem>
                  <SelectItem value="webpay">Link de pago Webpay</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Estado</Label>
              <Select value={estado} onValueChange={v => v && setEstado(v as Pago['estado'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pagado">Pagado</SelectItem>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="parcial">Parcial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Notas</Label>
            <Textarea rows={2} value={notas} onChange={e => setNotas(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving} className="bg-orange-600 hover:bg-orange-700">
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EditAsistenciaDialog({ asistencia, onClose, onSave }: {
  asistencia: Asistencia
  onClose: () => void
  onSave: (data: Partial<Asistencia>) => Promise<void>
}) {
  const [nombre, setNombre] = useState(asistencia.actividad_nombre)
  const [fecha, setFecha] = useState(asistencia.fecha_asistencia || '')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await onSave({ actividad_nombre: nombre, fecha_asistencia: fecha || null })
    setSaving(false)
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Editar asistencia</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Actividad *</Label>
            <Input required value={nombre} onChange={e => setNombre(e.target.value)} />
          </div>
          <div>
            <Label>Fecha</Label>
            <Input type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving} className="bg-orange-600 hover:bg-orange-700">
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
