'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ClienteConDetalle, Asistencia, Pago, Seguimiento, Actividad, Oportunidad, ETAPAS_FUNNEL, EtapaFunnel, Cuota, PagoFormPayload } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Pencil, Trash2, Plus, FileSpreadsheet, FileText, Receipt, MessageSquare, Phone, Mail, MoreHorizontal, AlertTriangle, Target, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ClienteFormDialog } from '@/components/clientes/ClienteFormDialog'
import { exportarPerfilExcel, exportarPerfilPDF } from '@/lib/export'
import { SeguimientoForm } from '@/components/clientes/SeguimientoForm'
import { getSupabase } from '@/lib/supabase'
import { PagoForm } from '@/components/clientes/PagoForm'
import { AsistenciaForm } from '@/components/clientes/AsistenciaForm'
import { usePerfil } from '@/components/shared/usePerfil'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

function fmt(d: string | null) {
  if (!d) return null
  try { return format(new Date(d + 'T12:00:00'), 'dd/MM/yyyy', { locale: es }) }
  catch { return d }
}

// Semáforo de una cuota: verde = al día / pagada, ámbar = vence pronto, rojo = vencida
function semaforoCuota(c: Cuota): { dot: string; label: string } {
  if (c.estado === 'pagada') return { dot: 'bg-green-500', label: 'Pagada' }
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  const venc = new Date(c.fecha_vencimiento + 'T12:00:00')
  const dias = Math.ceil((venc.getTime() - hoy.getTime()) / 86400000)
  if (c.estado === 'vencida' || dias < 0) return { dot: 'bg-red-500', label: 'Vencida' }
  if (dias <= 3) return { dot: 'bg-amber-500', label: dias === 0 ? 'Vence hoy' : `Vence en ${dias}d` }
  return { dot: 'bg-green-400', label: 'Al día' }
}

// Días entre el pago real y el vencimiento (negativo = adelantado, positivo = atrasado)
function diasPagoVsVenc(venc: string, pago: string): number {
  const v = new Date(venc + 'T12:00:00'); const p = new Date(pago + 'T12:00:00')
  return Math.round((p.getTime() - v.getTime()) / 86400000)
}

// ─── Etapa badge config ─────────────────────────────────────────────────
const ETAPA_BADGE: Record<EtapaFunnel, { bg: string; text: string }> = {
  nuevo:               { bg: 'bg-gray-100',   text: 'text-gray-600' },
  contactado:          { bg: 'bg-blue-100',   text: 'text-blue-700' },
  con_interes:         { bg: 'bg-violet-100', text: 'text-violet-700' },
  cotizacion_enviada:  { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  negociando:          { bg: 'bg-orange-100', text: 'text-orange-700' },
  inscrito:            { bg: 'bg-green-100',  text: 'text-green-700' },
  en_pausa:            { bg: 'bg-rose-100',   text: 'text-rose-700' },
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
  const perfil = usePerfil()
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [cliente, setCliente] = useState<ClienteConDetalle | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAllFields, setShowAllFields] = useState(false)
  const [tab, setTab] = useState('actividades')
  const [cuotas, setCuotas] = useState<Cuota[]>([])
  // Detalle A: registrar la fecha real al marcar una cuota pagada (default = vencimiento)
  const [cuotaPagando, setCuotaPagando] = useState<string | null>(null)
  const [fechaPagoTmp, setFechaPagoTmp] = useState('')
  const [facturaTmp, setFacturaTmp] = useState('')
  const [facturaIntTmp, setFacturaIntTmp] = useState('')
  // Confirmar el metodo de pago real al marcar una cuota pagada (default = metodo del plan)
  const [metodoTmp, setMetodoTmp] = useState('')

  // P3: usuario logueado para pre-llenar responsable
  const [currentUserEmail, setCurrentUserEmail] = useState('')

  // dialogs de creación
  const [editOpen, setEditOpen] = useState(false)
  const [segOpen, setSegOpen] = useState(false)
  const [pagoOpen, setPagoOpen] = useState(false)
  const [asistenciaOpen, setAsistenciaOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)  // P5
  const [inscribirPrompt, setInscribirPrompt] = useState<{ actividad: string; opId?: string } | null>(null)

  // dialogs de edición
  const [editSeg, setEditSeg] = useState<Seguimiento | null>(null)
  const [editPago, setEditPago] = useState<Pago | null>(null)
  const [editAsistencia, setEditAsistencia] = useState<Asistencia | null>(null)

  // Oportunidades (funnel por actividad): catálogo + formulario de alta
  const [catalogo, setCatalogo] = useState<Actividad[]>([])
  const [nuevaOpActividad, setNuevaOpActividad] = useState('')
  const [nuevaOpCustom, setNuevaOpCustom] = useState('')
  const [nuevaOpEtapa, setNuevaOpEtapa] = useState<EtapaFunnel>('nuevo')

  const fetchCliente = useCallback(async () => {
    const res = await fetch(`/api/clientes/${id}`)
    if (!res.ok) { router.push('/clientes'); return }
    setCliente(await res.json())
    setLoading(false)
  }, [id, router])

  useEffect(() => { fetchCliente() }, [fetchCliente])

  const fetchCuotas = useCallback(async () => {
    const res = await fetch(`/api/cuotas?cliente_id=${id}`)
    if (res.ok) setCuotas(await res.json())
  }, [id])

  useEffect(() => { fetchCuotas() }, [fetchCuotas])

  // Catálogo de actividades para el selector de nueva oportunidad
  useEffect(() => {
    fetch('/api/actividades').then(r => r.ok ? r.json() : []).then(d => setCatalogo(Array.isArray(d) ? d : [])).catch(() => {})
  }, [])

  // P3: responsable por defecto — preferencia guardada en localStorage, fallback al email
  useEffect(() => {
    const guardado = typeof window !== 'undefined' ? localStorage.getItem('renova_responsable') : ''
    if (guardado) {
      setCurrentUserEmail(guardado)
    } else {
      getSupabase().auth.getUser().then(({ data }) => {
        if (data.user?.email) setCurrentUserEmail(data.user.email)
      })
    }
  }, [])

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

  // Marcas de prestador: un click en el perfil define docente/terapeuta
  async function toggleMarca(campo: 'es_docente' | 'es_terapeuta') {
    if (!cliente) return
    const nuevoValor = !cliente[campo]
    const res = await fetch(`/api/clientes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [campo]: nuevoValor }),
    })
    if (res.ok) {
      setCliente(prev => prev ? { ...prev, [campo]: nuevoValor } : prev)
      toast.success(nuevoValor
        ? `Marcado como ${campo === 'es_docente' ? 'docente' : 'terapeuta'} — entra al flujo de Honorarios`
        : 'Marca quitada')
    } else {
      toast.error('Error al actualizar')
    }
  }

  // ── Oportunidades (funnel por actividad) ──────────────────────────────
  async function addOportunidad(actividad_nombre: string, etapa: EtapaFunnel) {
    const res = await fetch('/api/oportunidades', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cliente_id: id, actividad_nombre, etapa, responsable: currentUserEmail || null }),
    })
    if (res.ok) {
      toast.success('Oportunidad agregada')
      setNuevaOpActividad(''); setNuevaOpCustom(''); setNuevaOpEtapa('nuevo')
      fetchCliente()
    } else {
      const e = await res.json().catch(() => ({}))
      toast.error(e.error || 'Error al agregar')
    }
  }

  async function cambiarEtapaOportunidad(op: Oportunidad, etapa: EtapaFunnel) {
    setCliente(prev => prev ? { ...prev, oportunidades: prev.oportunidades?.map(o => o.id === op.id ? { ...o, etapa } : o) } : prev)
    const res = await fetch('/api/oportunidades', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: op.id, etapa }),
    })
    if (res.ok) toast.success('Etapa actualizada')
    else { toast.error('Error al actualizar'); fetchCliente() }
  }

  async function deleteOportunidad(op: Oportunidad) {
    if (!confirm(`¿Quitar la oportunidad de "${op.actividad_nombre}"?`)) return
    const res = await fetch(`/api/oportunidades?id=${op.id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Oportunidad quitada'); fetchCliente() }
    else toast.error('Error al quitar')
  }

  // P5: abre modal de confirmación
  function handleDeleteCliente() {
    setMoreOpen(false)
    setDeleteDialogOpen(true)
  }

  async function confirmarEliminarCliente() {
    const res = await fetch(`/api/clientes/${id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Cliente eliminado'); router.push('/clientes') }
    else { toast.error('Error al eliminar'); setDeleteDialogOpen(false) }
  }

  async function addSeguimiento(data: Record<string, string>) {
    const res = await fetch('/api/seguimientos', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, cliente_id: id }),
    })
    if (res.ok) { toast.success('Seguimiento registrado'); setSegOpen(false); fetchCliente() }
    else toast.error('Error al guardar')
  }

  async function addPago(data: PagoFormPayload) {
    const res = await fetch('/api/pagos', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, cliente_id: id }),
    })
    if (res.ok) {
      toast.success('Pago registrado')
      setPagoOpen(false)
      // ¿Este pago deja al cliente inscrito en esa actividad?
      const actividad = String(data.actividad_nombre || '')
      if (actividad) {
        const op = (cliente?.oportunidades ?? []).find(o => o.actividad_nombre === actividad)
        if (!op || op.etapa !== 'inscrito') setInscribirPrompt({ actividad, opId: op?.id })
      }
      fetchCliente()
      fetchCuotas()
    } else {
      toast.error('Error al guardar')
    }
  }

  async function confirmarInscrito() {
    if (!inscribirPrompt) return
    const { actividad, opId } = inscribirPrompt
    if (opId) {
      await fetch('/api/oportunidades', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: opId, etapa: 'inscrito' }),
      })
    } else {
      await fetch('/api/oportunidades', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cliente_id: id, actividad_nombre: actividad, etapa: 'inscrito', responsable: currentUserEmail || null }),
      })
    }
    toast.success('Marcado como Inscrito')
    setInscribirPrompt(null)
    fetchCliente()
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

  async function marcarCuotaPagada(c: Cuota, fechaPago: string, numeroFactura: string, facturaInterna: string, metodoPago: string) {
    const fp = fechaPago || c.fecha_vencimiento || new Date().toISOString().slice(0, 10)
    const res = await fetch(`/api/cuotas/${c.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: 'pagada', fecha_pago: fp, metodo_pago: metodoPago || null, numero_factura: numeroFactura || null, factura_interna: facturaInterna || null }),
    })
    if (res.ok) { toast.success('Cuota marcada como pagada'); setCuotaPagando(null); fetchCuotas(); fetchCliente() }
    else toast.error('Inténtalo nuevamente')
  }

  async function revertirCuota(c: Cuota) {
    const res = await fetch(`/api/cuotas/${c.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: 'pendiente', fecha_pago: '' }),
    })
    if (res.ok) { toast.success('Cuota vuelta a pendiente'); fetchCuotas(); fetchCliente() }
    else toast.error('Inténtalo nuevamente')
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

  // Opciones de actividad para una nueva oportunidad (sin las que ya tienen una)
  const oportunidades = cliente.oportunidades ?? []
  const actividadesConOportunidad = new Set(oportunidades.map(o => o.actividad_nombre))
  const opcionesActividad = Array.from(new Set([
    ...(cliente.asistencias ?? []).map(a => a.actividad_nombre),
    ...(cliente.pagos ?? []).map(p => p.actividad_nombre),
    ...catalogo.map(a => a.nombre),
  ])).filter(n => n && !actividadesConOportunidad.has(n))
  const nuevaOpActividadFinal = nuevaOpActividad === '__otra__' ? nuevaOpCustom.trim() : nuevaOpActividad

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

            {/* Resumen de oportunidades (funnel por actividad) — abre la pestaña */}
            <button
              onClick={() => setTab('actividades')}
              title="Ver oportunidades por actividad"
              className="h-6 px-2 rounded-full text-xs font-medium bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors inline-flex items-center gap-1"
            >
              <Target className="h-3 w-3" />
              {oportunidades.length} oportunidad{oportunidades.length === 1 ? '' : 'es'}
            </button>

            {/* Marcas de prestador (un click) */}
            <button
              onClick={() => toggleMarca('es_docente')}
              title={cliente.es_docente ? 'Quitar marca de docente' : 'Marcar como docente (entra al flujo de Honorarios)'}
              className={`h-6 px-2 rounded-full text-xs font-medium border transition-colors ${
                cliente.es_docente
                  ? 'bg-indigo-100 text-indigo-700 border-indigo-200'
                  : 'bg-white text-gray-300 border-dashed border-gray-300 hover:text-indigo-600 hover:border-indigo-300'
              }`}
            >
              🎓 Docente
            </button>
            <button
              onClick={() => toggleMarca('es_terapeuta')}
              title={cliente.es_terapeuta ? 'Quitar marca de terapeuta' : 'Marcar como terapeuta (entra al flujo de Honorarios)'}
              className={`h-6 px-2 rounded-full text-xs font-medium border transition-colors ${
                cliente.es_terapeuta
                  ? 'bg-teal-100 text-teal-700 border-teal-200'
                  : 'bg-white text-gray-300 border-dashed border-gray-300 hover:text-teal-600 hover:border-teal-300'
              }`}
            >
              🩺 Terapeuta
            </button>

            {/* Etiqueta derivada: paciente de su terapeuta */}
            {cliente.terapeuta && (
              <span className="h-6 px-2 rounded-full text-xs font-medium bg-rose-100 text-rose-700 inline-flex items-center">
                Paciente de {cliente.terapeuta}
              </span>
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
              <a
                href={`https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(cliente.correo)}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-orange-600 hover:underline"
              >
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
          <Button size="sm" variant="outline" className="border-green-600 text-green-700 hover:bg-green-50" onClick={() => setPagoOpen(true)}>
            <Receipt className="h-3.5 w-3.5 mr-1" /> Pago
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
                {perfil.permisos.has('eliminar') && (
                  <>
                    <div className="border-t border-gray-100 my-1" />
                    <button onClick={() => { handleDeleteCliente(); setMoreOpen(false) }} className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-red-50 text-red-600">
                      <Trash2 size={14} /> Eliminar cliente
                    </button>
                  </>
                )}
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
      <Tabs value={tab} onValueChange={v => setTab(v ?? 'oportunidades')}>
        <TabsList>
          <TabsTrigger value="seguimientos">
            Seguimientos ({cliente.seguimientos?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="actividades">
            Actividades y pagos ({new Set([
              ...(cliente.asistencias ?? []).map(a => a.actividad_nombre),
              ...(cliente.pagos ?? []).map(p => p.actividad_nombre),
              ...oportunidades.map(o => o.actividad_nombre),
            ]).size})
          </TabsTrigger>
          <TabsTrigger value="etapas">
            Historial ({cliente.oportunidad_historial?.length ?? 0})
          </TabsTrigger>
          {(cliente.boletas_prestador?.length ?? 0) > 0 && (
            <TabsTrigger value="honorarios">
              Honorarios ({cliente.boletas_prestador!.length})
            </TabsTrigger>
          )}
        </TabsList>

        {/* HONORARIOS — boletas donde este cliente es el prestador */}
        {(cliente.boletas_prestador?.length ?? 0) > 0 && (
          <TabsContent value="honorarios">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between py-3">
                <CardTitle className="text-sm font-medium">Boletas de honorarios como prestador</CardTitle>
                <Link href="/honorarios" className="text-xs text-orange-600 hover:underline">Ver sección Honorarios →</Link>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {cliente.boletas_prestador!.map(b => (
                    <li key={b.id} className="flex items-center justify-between gap-2 text-sm border-b border-gray-100 last:border-0 pb-2 last:pb-0">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{b.glosa}</p>
                        <p className="text-xs text-gray-400">
                          {b.fecha?.slice(0, 10).split('-').reverse().join('/')}
                          {b.monto_bruto ? ` · bruto $${Math.round(b.monto_bruto).toLocaleString('es-CL')}` : ''}
                        </p>
                      </div>
                      <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-medium ${
                        b.estado === 'emitida' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {b.estado === 'emitida' ? `Emitida${b.numero_boleta ? ` · ${b.numero_boleta}` : ''}` : 'Pendiente'}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </TabsContent>
        )}

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
                  {/* P4: más reciente primero */}
                  {[...cliente.seguimientos].reverse().map(s => (
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

        {/* ACTIVIDADES, PAGOS Y FUNNEL — todo por actividad en un solo lugar */}
        <TabsContent value="actividades">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-3">
              <div>
                <CardTitle className="text-sm font-medium">Actividades y pagos</CardTitle>
                <p className="text-xs text-gray-400 mt-0.5">Cada actividad lleva su etapa del funnel, sus pagos y su avance, todo junto.</p>
              </div>
              <Button size="sm" variant="outline" className="border-green-600 text-green-700 hover:bg-green-50" onClick={() => setPagoOpen(true)}>
                <Plus className="h-3 w-3 mr-1" /> Pago
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">

              {/* Sumar una actividad al funnel (sin necesidad de un pago) */}
              <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                <p className="text-xs text-gray-500 font-medium">Sumar una actividad al funnel</p>
                <div className="flex flex-wrap items-end gap-2">
                  <div className="flex-1 min-w-[180px]">
                    <Select value={nuevaOpActividad || undefined} onValueChange={v => setNuevaOpActividad(v ?? '')}>
                      <SelectTrigger><SelectValue placeholder="Elige una actividad..." /></SelectTrigger>
                      <SelectContent>
                        {opcionesActividad.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                        <SelectItem value="__otra__">Otra (escribir)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-44">
                    <Select value={nuevaOpEtapa} onValueChange={v => v && setNuevaOpEtapa(v as EtapaFunnel)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ETAPAS_FUNNEL.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    size="sm"
                    className="bg-orange-600 hover:bg-orange-700"
                    disabled={!nuevaOpActividadFinal}
                    onClick={() => nuevaOpActividadFinal && addOportunidad(nuevaOpActividadFinal, nuevaOpEtapa)}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Agregar
                  </Button>
                </div>
                {nuevaOpActividad === '__otra__' && (
                  <Input
                    placeholder="Nombre de la actividad"
                    value={nuevaOpCustom}
                    onChange={e => setNuevaOpCustom(e.target.value)}
                  />
                )}
              </div>

              {(() => {
                const asistencias = cliente.asistencias ?? []
                const pagos = cliente.pagos ?? []
                const nombres = Array.from(new Set([
                  ...asistencias.map(a => a.actividad_nombre),
                  ...pagos.map(p => p.actividad_nombre),
                  ...oportunidades.map(o => o.actividad_nombre),
                ]))

                if (nombres.length === 0) {
                  return (
                    <div className="text-center py-6">
                      <p className="text-sm text-gray-400 mb-3">Sin actividades, pagos ni oportunidades registradas</p>
                      <Button size="sm" className="bg-orange-600 hover:bg-orange-700" onClick={() => setPagoOpen(true)}>
                        <Plus className="h-3.5 w-3.5 mr-1" /> Registrar pago
                      </Button>
                    </div>
                  )
                }

                return (
                  <div className="space-y-4">
                    {nombres.map(nombre => {
                      const asis = asistencias.filter(a => a.actividad_nombre === nombre)
                      const pgs = pagos.filter(p => p.actividad_nombre === nombre)
                      const op = oportunidades.find(o => o.actividad_nombre === nombre)
                      const totalPagado = pgs.filter(p => p.estado === 'pagado').reduce((s, p) => s + (p.monto || 0), 0)
                      const cfg = op ? ETAPA_BADGE[op.etapa] : null
                      const cuotasAct = cuotas.filter(c => c.actividad_nombre === nombre)

                      return (
                        <div key={nombre} className="border border-gray-100 rounded-xl overflow-hidden">
                          {/* Encabezado de la actividad: nombre + etapa del funnel */}
                          <div className="flex items-center justify-between gap-2 px-3 py-2 bg-gray-50 group">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-sm font-semibold text-gray-800 truncate">{nombre}</span>
                              {asis[0]?.fecha_asistencia && (
                                <span className="text-xs text-gray-400 shrink-0">desde {fmt(asis[0].fecha_asistencia)}</span>
                              )}
                              {asis.length === 0 && pgs.length === 0 && (
                                <span className="text-xs text-gray-300 shrink-0">(en funnel, sin pago aún)</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {totalPagado > 0 && (
                                <span className="text-xs font-semibold text-green-700">${totalPagado.toLocaleString('es-CL')} pagado</span>
                              )}
                              {/* Etapa del funnel de esta actividad */}
                              {op ? (
                                <Select value={op.etapa} onValueChange={v => v && cambiarEtapaOportunidad(op, v as EtapaFunnel)}>
                                  <SelectTrigger className={`h-7 text-xs px-2 border-0 shadow-none w-auto gap-1 font-medium rounded-full ${cfg!.bg} ${cfg!.text}`}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {ETAPAS_FUNNEL.map(e => {
                                      const c = ETAPA_BADGE[e.value]
                                      return (
                                        <SelectItem key={e.value} value={e.value}>
                                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${c.bg} ${c.text}`}>{e.label}</span>
                                        </SelectItem>
                                      )
                                    })}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Select value={undefined} onValueChange={v => v && addOportunidad(nombre, v as EtapaFunnel)}>
                                  <SelectTrigger className="h-7 text-xs px-2 border-dashed border-gray-300 text-gray-400 w-auto shadow-none rounded-full">
                                    <SelectValue placeholder="+ etapa" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {ETAPAS_FUNNEL.map(e => (
                                      <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                              {asis[0] && (
                                <>
                                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100" onClick={() => setEditAsistencia(asis[0])}>
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-red-500" onClick={() => deleteAsistencia(asis[0])}>
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </>
                              )}
                              {op && asis.length === 0 && pgs.length === 0 && (
                                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-red-500" onClick={() => deleteOportunidad(op)} title="Quitar del funnel">
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </div>

                          {/* Pagos de la actividad */}
                          {pgs.length > 0 ? (
                            <ul className="divide-y divide-gray-50">
                              {pgs.map(p => (
                                <li key={p.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm group">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <Badge variant={p.estado === 'pagado' ? 'default' : p.estado === 'parcial' ? 'secondary' : 'outline'} className="shrink-0">
                                      {p.estado}
                                    </Badge>
                                    <span className="font-semibold text-orange-600 shrink-0">
                                      {p.metodo_pago === 'sin_cobro' ? 'Sin cobro' : p.monto ? `$${p.monto.toLocaleString('es-CL')}` : '—'}
                                    </span>
                                    {p.tiene_plan_cuotas && (
                                      <span className="text-xs font-medium text-orange-700 bg-orange-100 rounded-full px-2 py-0.5 shrink-0">Plan de cuotas</span>
                                    )}
                                    {p.requiere_factura && (
                                      <span title={p.numero_factura ? `Factura N° ${p.numero_factura}` : 'Requiere factura (sin número aún)'}>
                                        <Receipt className={`h-3.5 w-3.5 ${p.numero_factura ? 'text-green-600' : 'text-orange-500'}`} />
                                      </span>
                                    )}
                                    {p.notas && <span className="text-xs text-gray-400 truncate">{p.notas}</span>}
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-xs text-gray-400">
                                      {fmt(p.fecha_pago)}
                                      {p.fecha_actividad && p.fecha_actividad !== p.fecha_pago && ` · act: ${fmt(p.fecha_actividad)}`}
                                    </span>
                                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100" onClick={() => setEditPago(p)}>
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-red-500" onClick={() => deletePago(p)}>
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="px-3 py-2 text-xs text-gray-300">Sin pagos para esta actividad</p>
                          )}

                          {/* Plan de cuotas de la actividad (semáforo + marcar pagada) */}
                          {cuotasAct.length > 0 && (
                            <div className="border-t border-gray-100 bg-orange-50/40">
                              <p className="px-3 pt-2 pb-1 text-xs font-medium text-gray-500">Plan de cuotas</p>
                              <ul className="divide-y divide-gray-50">
                                {cuotasAct.map(c => {
                                  const sem = semaforoCuota(c)
                                  return (
                                    <li key={c.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${sem.dot}`} />
                                        <span className="text-gray-500 shrink-0">Cuota {c.numero_cuota}/{c.total_cuotas}</span>
                                        <span className="font-semibold text-gray-800 shrink-0">${(c.monto || 0).toLocaleString('es-CL')}</span>
                                        <span className="text-xs text-gray-400 shrink-0">vence {fmt(c.fecha_vencimiento)}</span>
                                        {c.estado === 'pagada' && c.fecha_pago && (() => {
                                          const d = diasPagoVsVenc(c.fecha_vencimiento, c.fecha_pago)
                                          return (
                                            <span className="text-xs shrink-0 truncate">
                                              <span className="text-green-700">· pagada {fmt(c.fecha_pago)}</span>
                                              {d > 0
                                                ? <span className="text-rose-600"> ({d}d atrasada)</span>
                                                : d < 0
                                                  ? <span className="text-emerald-600"> ({-d}d adelantada)</span>
                                                  : <span className="text-gray-400"> (al día)</span>}
                                            </span>
                                          )
                                        })()}
                                        {c.numero_factura && (
                                          <span className="text-xs shrink-0 text-blue-600" title="Factura">· F {c.numero_factura}</span>
                                        )}
                                        {c.factura_interna && (
                                          <span className="text-xs shrink-0 text-gray-500" title="Factura interna (folio SII)">· int {c.factura_interna}</span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0">
                                        <span className={`text-xs font-medium ${c.estado === 'pagada' ? 'text-green-700' : c.estado === 'vencida' ? 'text-red-600' : 'text-gray-500'}`}>{sem.label}</span>
                                        {c.estado === 'pagada' ? (
                                          <Button size="sm" variant="ghost" className="h-7 text-xs text-gray-400" onClick={() => revertirCuota(c)}>Deshacer</Button>
                                        ) : cuotaPagando === c.id ? (
                                          <div className="flex items-center gap-1">
                                            <input
                                              type="date"
                                              value={fechaPagoTmp}
                                              onChange={e => setFechaPagoTmp(e.target.value)}
                                              className="h-7 rounded border border-gray-300 px-1 text-xs"
                                              title="Fecha real del pago (por defecto, la del vencimiento)"
                                            />
                                            <input
                                              type="text"
                                              value={facturaTmp}
                                              onChange={e => setFacturaTmp(e.target.value)}
                                              placeholder="N° factura"
                                              className="h-7 w-20 rounded border border-gray-300 px-1 text-xs"
                                              title="N° de factura (opcional)"
                                            />
                                            <input
                                              type="text"
                                              value={facturaIntTmp}
                                              onChange={e => setFacturaIntTmp(e.target.value)}
                                              placeholder="Folio interno"
                                              className="h-7 w-20 rounded border border-gray-300 px-1 text-xs"
                                              title="Folio de factura interna SII (opcional)"
                                            />
                                            {/* Metodo de pago real de esta cuota: default = metodo del plan, ajustable al confirmar */}
                                            <select
                                              value={metodoTmp}
                                              onChange={e => setMetodoTmp(e.target.value)}
                                              className="h-7 rounded border border-gray-300 px-1 text-xs"
                                              title="Confirma el metodo de pago real de esta cuota"
                                            >
                                              <option value="transferencia">Transferencia</option>
                                              <option value="efectivo">Efectivo</option>
                                              <option value="tarjeta">Tarjeta</option>
                                              <option value="webpay">Link Webpay</option>
                                              <option value="otro">Otro</option>
                                            </select>
                                            <Button size="sm" variant="outline" className="h-7 text-xs border-green-600 text-green-700 hover:bg-green-50" onClick={() => marcarCuotaPagada(c, fechaPagoTmp, facturaTmp, facturaIntTmp, metodoTmp)}>
                                              <CheckCircle2 className="h-3 w-3 mr-1" /> Confirmar
                                            </Button>
                                            <Button size="sm" variant="ghost" className="h-7 text-xs text-gray-400" onClick={() => setCuotaPagando(null)}>Cancelar</Button>
                                          </div>
                                        ) : (
                                          <Button
                                            size="sm" variant="outline"
                                            className="h-7 text-xs border-green-600 text-green-700 hover:bg-green-50"
                                            onClick={() => { setCuotaPagando(c.id); setFechaPagoTmp(c.fecha_vencimiento || new Date().toISOString().slice(0, 10)); setFacturaTmp(c.numero_factura || ''); setFacturaIntTmp(c.factura_interna || ''); setMetodoTmp(c.metodo_pago || pgs.find(p => p.tiene_plan_cuotas)?.metodo_pago || 'transferencia') }}
                                          >
                                            <CheckCircle2 className="h-3 w-3 mr-1" /> Marcar pagada
                                          </Button>
                                        )}
                                      </div>
                                    </li>
                                  )
                                })}
                              </ul>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </CardContent>
          </Card>
        </TabsContent>
        {/* HISTORIAL — recorrido del funnel por actividad (oportunidad) */}
        <TabsContent value="etapas">
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-medium">Recorrido por el funnel (por actividad)</CardTitle>
            </CardHeader>
            <CardContent>
              {!cliente.oportunidad_historial?.length ? (
                <p className="text-sm text-gray-400 text-center py-6">
                  Sin movimientos de etapa registrados aún. Se irán registrando a medida que avances cada oportunidad.
                </p>
              ) : (() => {
                const hist = cliente.oportunidad_historial!
                const actividades = Array.from(new Set(hist.map(h => h.actividad_nombre || '—')))
                return (
                  <div className="space-y-4">
                    {actividades.map(act => {
                      const items = hist.filter(h => (h.actividad_nombre || '—') === act)
                      return (
                        <div key={act}>
                          <p className="text-sm font-semibold text-gray-800 mb-2">{act}</p>
                          <ul className="space-y-2">
                            {items.map(h => {
                              const anterior = h.etapa_anterior ? ETAPAS_FUNNEL.find(e => e.value === h.etapa_anterior)?.label : 'Inicio'
                              const nueva = ETAPAS_FUNNEL.find(e => e.value === h.etapa_nueva)?.label || h.etapa_nueva
                              const cfg = ETAPA_BADGE[h.etapa_nueva]
                              return (
                                <li key={h.id} className="flex items-center gap-3 text-sm border-l-2 border-orange-200 pl-3">
                                  <span className="text-gray-400 text-xs w-32 shrink-0">
                                    {format(new Date(h.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                                  </span>
                                  <span className="text-gray-500">{anterior}</span>
                                  <span className="text-gray-300">→</span>
                                  {cfg ? (
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>{nueva}</span>
                                  ) : (
                                    <span className="font-medium">{nueva}</span>
                                  )}
                                </li>
                              )
                            })}
                          </ul>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── Dialogs ───────────────────────────────────────────────────── */}
      <ClienteFormDialog open={editOpen} onOpenChange={setEditOpen} onSubmit={handleEdit} title="Editar cliente" initial={cliente} />
      {/* P3: pre-llenar Responsable con usuario logueado */}
      <SeguimientoForm open={segOpen} onOpenChange={setSegOpen} onSubmit={addSeguimiento} defaultUsuario={currentUserEmail} />
      <PagoForm open={pagoOpen} onOpenChange={setPagoOpen} onSubmit={addPago} asistencias={cliente.asistencias ?? []} />
      <AsistenciaForm open={asistenciaOpen} onOpenChange={setAsistenciaOpen} onSubmit={addAsistencia} />

      {/* P5: modal de confirmación eliminar cliente */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Eliminar cliente
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            ¿Estás segura de que deseas eliminar a{' '}
            <span className="font-semibold">{cliente.nombre}</span>?
            Esta acción también eliminará sus seguimientos, pagos, asistencias y oportunidades,
            y no se puede deshacer.
          </p>
          <DialogFooter className="gap-2 mt-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={confirmarEliminarCliente}
              className="bg-red-600 hover:bg-red-700"
            >
              Sí, eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Prompt: ¿queda inscrito tras el pago? */}
      {inscribirPrompt && (
        <Dialog open onOpenChange={() => setInscribirPrompt(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-700">
                <Target className="h-5 w-5" />
                ¿Queda inscrito?
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-gray-600">
              ¿Este pago deja a <span className="font-semibold">{cliente.nombre}</span> inscrito en{' '}
              <span className="font-semibold">{inscribirPrompt.actividad}</span>?
            </p>
            <DialogFooter className="gap-2 mt-2">
              <Button variant="outline" onClick={() => setInscribirPrompt(null)}>Ahora no</Button>
              <Button onClick={confirmarInscrito} className="bg-green-600 hover:bg-green-700">Sí, marcar Inscrito</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
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
  const [responsables, setResponsables] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/responsables').then(r => r.ok ? r.json() : []).then(d => setResponsables(Array.isArray(d) ? d : [])).catch(() => {})
  }, [])

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
            <Input list="responsables-edit-seg" value={usuario} onChange={e => setUsuario(e.target.value)} />
            <datalist id="responsables-edit-seg">
              {responsables.map(r => <option key={r} value={r} />)}
            </datalist>
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
  const [fechaActividad, setFechaActividad] = useState(pago.fecha_actividad || '')
  const [metodo, setMetodo] = useState(pago.metodo_pago || 'transferencia')
  const [estado, setEstado] = useState(pago.estado)
  const [notas, setNotas] = useState(pago.notas || '')
  const [requiereFactura, setRequiereFactura] = useState(pago.requiere_factura)
  const [numeroFactura, setNumeroFactura] = useState(pago.numero_factura || '')
  const [facturaInterna, setFacturaInterna] = useState(pago.factura_interna || '')
  const [saving, setSaving] = useState(false)

  const esSinCobro = metodo === 'sin_cobro'
  const actividadesUnicas = Array.from(new Map(asistencias.map(a => [a.actividad_nombre, a])).values())

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (estado === 'pagado' && !esSinCobro && (!monto || Number(monto) <= 0)) {
      toast.error('Un pago en estado "Pagado" necesita el monto')
      return
    }
    setSaving(true)
    await onSave({
      actividad_nombre: actividad,
      monto: esSinCobro ? 0 : (monto ? Number(monto) : null),
      fecha_pago: fecha || null,
      fecha_actividad: fechaActividad || null,
      metodo_pago: metodo,
      estado,
      notas: notas || null,
      requiere_factura: requiereFactura,
      numero_factura: numeroFactura || null,
      factura_interna: facturaInterna || null,
    })
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
              <Label>Monto{esSinCobro && ' (sin cobro)'}</Label>
              <Input type="number" value={esSinCobro ? '0' : monto} disabled={esSinCobro} onChange={e => setMonto(e.target.value)} />
            </div>
            <div>
              <Label>Fecha de pago</Label>
              <Input type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
            </div>
            <div>
              <Label>Fecha de la actividad</Label>
              <Input type="date" value={fechaActividad} onChange={e => setFechaActividad(e.target.value)} />
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
            <div className="col-span-2">
              <Label>Método</Label>
              <Select value={metodo} onValueChange={v => v && setMetodo(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="tarjeta">Tarjeta</SelectItem>
                  <SelectItem value="webpay">Link de pago Webpay</SelectItem>
                  <SelectItem value="sin_cobro">Sin cobro</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Notas</Label>
            <Textarea rows={2} value={notas} onChange={e => setNotas(e.target.value)} />
          </div>
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={requiereFactura}
              onChange={e => setRequiereFactura(e.target.checked)}
              className="h-4 w-4 rounded accent-orange-600"
            />
            <span className="text-sm font-medium text-gray-700">Cliente requiere factura</span>
          </label>
          {requiereFactura && (
            <div>
              <Label>N° de factura</Label>
              <Input value={numeroFactura} onChange={e => setNumeroFactura(e.target.value)} placeholder="ej: 1745" />
            </div>
          )}
          <div>
            <Label>Facturación interna (registro SII)</Label>
            <Input value={facturaInterna} onChange={e => setFacturaInterna(e.target.value)} placeholder="N° o folio interno" />
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
