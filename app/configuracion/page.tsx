'use client'

import { useEffect, useState, useCallback, Fragment } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Plus, Trash2, KeyRound, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { ROLES, PERMISOS, Rol, Permiso, permisosDeRol } from '@/lib/permisos'

interface PerfilUsuario { user_id: string; rol: Rol; permisos_extra: Permiso[] }

interface EventoAuditoria {
  id: string
  usuario: string
  accion: string
  tabla: string
  detalle: string | null
  created_at: string
}

const ACCION_BADGE: Record<string, string> = {
  crear:    'bg-green-100 text-green-700',
  editar:   'bg-blue-100 text-blue-700',
  eliminar: 'bg-red-100 text-red-700',
  exportar: 'bg-yellow-100 text-yellow-700',
  importar: 'bg-violet-100 text-violet-700',
  masiva:   'bg-orange-100 text-orange-700',
}

interface Usuario {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
}

interface Plantilla { id: string; nombre: string; cuerpo: string }

export default function ConfiguracionPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [nuevoOpen, setNuevoOpen] = useState(false)
  const [cambioPassOpen, setCambioPassOpen] = useState<Usuario | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newPass, setNewPass] = useState('')
  const [saving, setSaving] = useState(false)
  const [nombreResponsable, setNombreResponsable] = useState('')
  const [plantillas, setPlantillas] = useState<Plantilla[]>([])
  const [perfiles, setPerfiles] = useState<Record<string, PerfilUsuario>>({})
  const [permisosAbiertos, setPermisosAbiertos] = useState<string | null>(null)
  const [nuevoRol, setNuevoRol] = useState<Rol>('operacion')
  const [auditoria, setAuditoria] = useState<EventoAuditoria[]>([])
  const [auditoriaCargada, setAuditoriaCargada] = useState(false)
  const [filtroUsuario, setFiltroUsuario] = useState('')
  const [nuevaPlantillaNombre, setNuevaPlantillaNombre] = useState('')
  const [nuevaPlantillaCuerpo, setNuevaPlantillaCuerpo] = useState('')
  const [savingPlantilla, setSavingPlantilla] = useState(false)
  const router = useRouter()

  const fetchUsuarios = useCallback(async () => {
    const res = await fetch('/api/admin/usuarios')
    if (res.ok) setUsuarios(await res.json())
    setLoading(false)
  }, [])


  const fetchPlantillas = useCallback(async () => {
    const res = await fetch('/api/plantillas')
    if (res.ok) {
      const d = await res.json()
      setPlantillas(Array.isArray(d) ? d : [])
    }
  }, [])

  const fetchPerfiles = useCallback(async () => {
    const res = await fetch('/api/admin/perfiles')
    if (res.ok) {
      const lista: PerfilUsuario[] = await res.json()
      const map: Record<string, PerfilUsuario> = {}
      for (const p of lista) map[p.user_id] = p
      setPerfiles(map)
    }
  }, [])

  async function guardarPerfil(userId: string, rol: Rol, permisosExtra: Permiso[]) {
    const res = await fetch('/api/admin/perfiles', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, rol, permisos_extra: permisosExtra }),
    })
    if (res.ok) {
      toast.success('Perfil actualizado')
      fetchPerfiles()
    } else {
      const err = await res.json().catch(() => ({}))
      toast.error(err.error || 'Error al actualizar perfil')
    }
  }

  const fetchAuditoria = useCallback(async (usuario?: string) => {
    const params = new URLSearchParams({ limit: '100' })
    if (usuario) params.set('usuario', usuario)
    const res = await fetch(`/api/auditoria?${params}`)
    if (res.ok) {
      const d = await res.json()
      setAuditoria(Array.isArray(d) ? d : [])
    }
    setAuditoriaCargada(true)
  }, [])

  useEffect(() => {
    fetchUsuarios()
    fetchPlantillas()
    fetchPerfiles()
    fetchAuditoria()
    // Cargar preferencia guardada en este navegador
    setNombreResponsable(localStorage.getItem('renova_responsable') || '')
  }, [fetchUsuarios, fetchPlantillas, fetchPerfiles, fetchAuditoria])

  async function agregarPlantilla(e: React.FormEvent) {
    e.preventDefault()
    if (!nuevaPlantillaNombre.trim() || !nuevaPlantillaCuerpo.trim()) return
    setSavingPlantilla(true)
    const res = await fetch('/api/plantillas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: nuevaPlantillaNombre.trim(), cuerpo: nuevaPlantillaCuerpo.trim() }),
    })
    if (res.ok) {
      toast.success('Plantilla agregada')
      setNuevaPlantillaNombre(''); setNuevaPlantillaCuerpo('')
      fetchPlantillas()
    } else toast.error('Error al agregar plantilla')
    setSavingPlantilla(false)
  }

  async function eliminarPlantilla(p: Plantilla) {
    if (!confirm(`¿Eliminar la plantilla "${p.nombre}"?`)) return
    const res = await fetch(`/api/plantillas/${p.id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Plantilla eliminada'); fetchPlantillas() }
    else toast.error('Error al eliminar')
  }

  function guardarNombreResponsable(e: React.FormEvent) {
    e.preventDefault()
    localStorage.setItem('renova_responsable', nombreResponsable.trim())
    toast.success('Preferencia guardada')
  }

  async function handleLogout() {
    const { createBrowserClient } = await import('@supabase/ssr')
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    await supabase.auth.signOut()
    router.push('/login')
  }

  async function crearUsuario(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/admin/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, rol: nuevoRol }),
    })
    if (res.ok) {
      toast.success('Usuario creado correctamente')
      setNuevoOpen(false)
      setEmail(''); setPassword(''); setNuevoRol('operacion')
      fetchUsuarios()
      fetchPerfiles()
    } else {
      const err = await res.json()
      toast.error(err.error || 'Error al crear usuario')
    }
    setSaving(false)
  }

  async function eliminarUsuario(u: Usuario) {
    if (!confirm(`¿Eliminar al usuario ${u.email}? Esta acción no se puede deshacer.`)) return
    const res = await fetch(`/api/admin/usuarios/${u.id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Usuario eliminado'); fetchUsuarios() }
    else toast.error('Error al eliminar')
  }

  async function cambiarContrasena(e: React.FormEvent) {
    e.preventDefault()
    if (!cambioPassOpen) return
    setSaving(true)
    const res = await fetch(`/api/admin/usuarios/${cambioPassOpen.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: newPass }),
    })
    if (res.ok) {
      toast.success('Contraseña actualizada')
      setCambioPassOpen(null)
      setNewPass('')
    } else {
      toast.error('Error al cambiar contraseña')
    }
    setSaving(false)
  }

  function fmt(d: string | null) {
    if (!d) return 'Nunca'
    try { return format(new Date(d), 'dd/MM/yyyy HH:mm', { locale: es }) }
    catch { return d }
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Configuración</h2>
          <p className="text-gray-500 text-sm mt-1">Administración de usuarios del sistema</p>
        </div>
        <Button variant="outline" onClick={handleLogout} className="text-gray-600">
          <LogOut className="h-4 w-4 mr-2" /> Cerrar sesión
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-4">
          <CardTitle className="text-base">Usuarios</CardTitle>
          <Button size="sm" onClick={() => setNuevoOpen(true)} className="bg-orange-600 hover:bg-orange-700">
            <Plus className="h-4 w-4 mr-2" /> Nuevo usuario
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-gray-400">Cargando...</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Correo</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Perfil</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Último acceso</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {usuarios.map(u => {
                  const p = perfiles[u.id] || { user_id: u.id, rol: 'operacion' as Rol, permisos_extra: [] as Permiso[] }
                  const base = permisosDeRol(p.rol)
                  const personalizables = PERMISOS.filter(perm => !base.has(perm.key))
                  const abierto = permisosAbiertos === u.id
                  return (
                    <Fragment key={u.id}>
                      <tr className="hover:bg-gray-50">
                        <td className="px-3 py-3 font-medium">{u.email}</td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <select
                              value={p.rol}
                              onChange={e => guardarPerfil(u.id, e.target.value as Rol, [])}
                              className="h-7 pl-2 pr-6 rounded border border-gray-200 text-xs text-gray-700 bg-white focus:outline-none focus:border-orange-400 cursor-pointer"
                              title={ROLES.find(r => r.value === p.rol)?.descripcion}
                            >
                              {ROLES.map(r => (
                                <option key={r.value} value={r.value}>{r.label}</option>
                              ))}
                            </select>
                            {p.rol !== 'admin' && (
                              <button
                                onClick={() => setPermisosAbiertos(abierto ? null : u.id)}
                                className={`text-xs underline transition-colors ${
                                  p.permisos_extra.length > 0 ? 'text-orange-600 font-medium' : 'text-gray-400 hover:text-orange-600'
                                }`}
                              >
                                {p.permisos_extra.length > 0 ? `+${p.permisos_extra.length} extra` : 'personalizar'}
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-gray-400">{fmt(u.last_sign_in_at)}</td>
                        <td className="px-3 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <Button size="sm" variant="ghost" onClick={() => setCambioPassOpen(u)} title="Cambiar contraseña">
                              <KeyRound className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700" onClick={() => eliminarUsuario(u)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                      {abierto && p.rol !== 'admin' && (
                        <tr>
                          <td colSpan={4} className="px-3 pb-3 pt-0 bg-orange-50/40">
                            <p className="text-xs text-gray-500 mb-2 pt-2">
                              Permisos extra para <span className="font-medium">{u.email}</span> (además de los de su rol):
                            </p>
                            <div className="flex flex-wrap gap-x-5 gap-y-1.5">
                              {personalizables.map(perm => (
                                <label key={perm.key} className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={p.permisos_extra.includes(perm.key)}
                                    onChange={e => {
                                      const nuevos = e.target.checked
                                        ? [...p.permisos_extra, perm.key]
                                        : p.permisos_extra.filter(x => x !== perm.key)
                                      guardarPerfil(u.id, p.rol, nuevos)
                                    }}
                                    className="h-3.5 w-3.5 accent-orange-600"
                                  />
                                  {perm.label}
                                </label>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Dialog nuevo usuario */}
      <Dialog open={nuevoOpen} onOpenChange={setNuevoOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Nuevo usuario</DialogTitle></DialogHeader>
          <form onSubmit={crearUsuario} className="space-y-4">
            <div>
              <Label>Correo electrónico *</Label>
              <Input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="usuario@renova.cl" />
            </div>
            <div>
              <Label>Contraseña *</Label>
              <Input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
            </div>
            <div>
              <Label>Perfil</Label>
              <select
                value={nuevoRol}
                onChange={e => setNuevoRol(e.target.value as Rol)}
                className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm text-gray-700 bg-white focus:outline-none focus:border-orange-400"
              >
                {ROLES.map(r => (
                  <option key={r.value} value={r.value}>{r.label} — {r.descripcion}</option>
                ))}
              </select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNuevoOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving} className="bg-orange-600 hover:bg-orange-700">
                {saving ? 'Creando...' : 'Crear usuario'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Tipos de cliente: ahora son el catálogo de Actividades */}
      <Card className="mt-6">
        <CardHeader className="py-4">
          <CardTitle className="text-base">Tipos de cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            Los tipos de cliente están 100% sincronizados con el catálogo de{' '}
            <a href="/actividades" className="text-orange-600 hover:underline font-medium">Actividades</a>.
            Para agregar un tipo nuevo, crea la actividad correspondiente ahí — aparecerá
            automáticamente como opción al crear o editar clientes, y al asignarla se
            registrará también su asistencia.
          </p>
        </CardContent>
      </Card>

      {/* Plantillas de WhatsApp */}
      <Card className="mt-6">
        <CardHeader className="py-4">
          <CardTitle className="text-base">Plantillas de WhatsApp</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-gray-400 mb-3">
            Usa <code className="bg-gray-100 px-1 rounded">{'{nombre}'}</code> y{' '}
            <code className="bg-gray-100 px-1 rounded">{'{actividad}'}</code> como variables — se reemplazan
            automáticamente con los datos del cliente al enviar.
          </p>
          <div className="space-y-2 mb-4">
            {plantillas.map(p => (
              <div key={p.id} className="flex items-start justify-between gap-2 border border-gray-100 rounded-lg px-3 py-2 hover:bg-gray-50">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800">{p.nombre}</p>
                  <p className="text-xs text-gray-400">{p.cuerpo}</p>
                </div>
                <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 shrink-0" onClick={() => eliminarPlantilla(p)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
            {plantillas.length === 0 && (
              <p className="text-sm text-gray-400 px-1">Sin plantillas configuradas</p>
            )}
          </div>
          <form onSubmit={agregarPlantilla} className="space-y-2">
            <Input
              placeholder="Nombre de la plantilla (ej: Primer contacto)"
              value={nuevaPlantillaNombre}
              onChange={e => setNuevaPlantillaNombre(e.target.value)}
              className="max-w-sm"
            />
            <div className="flex gap-2">
              <Input
                placeholder="Mensaje... usa {nombre} y {actividad}"
                value={nuevaPlantillaCuerpo}
                onChange={e => setNuevaPlantillaCuerpo(e.target.value)}
              />
              <Button type="submit" disabled={savingPlantilla} size="sm" className="bg-orange-600 hover:bg-orange-700 shrink-0">
                <Plus className="h-4 w-4 mr-1" /> Agregar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Preferencias personales */}
      <Card className="mt-6">
        <CardHeader className="py-4">
          <CardTitle className="text-base">Mis preferencias</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={guardarNombreResponsable} className="space-y-3">
            <div>
              <Label htmlFor="nombre-responsable">Nombre por defecto como responsable</Label>
              <p className="text-xs text-gray-400 mt-0.5 mb-2">
                Se pre-llenará automáticamente en todos los nuevos seguimientos que registres desde este navegador.
              </p>
              <div className="flex gap-2 max-w-sm">
                <Input
                  id="nombre-responsable"
                  placeholder="ej: Ángeles"
                  value={nombreResponsable}
                  onChange={e => setNombreResponsable(e.target.value)}
                />
                <Button type="submit" size="sm" className="bg-orange-600 hover:bg-orange-700 shrink-0">
                  Guardar
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Auditoría */}
      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between py-4">
          <CardTitle className="text-base">Auditoría — últimas 100 acciones</CardTitle>
          <select
            value={filtroUsuario}
            onChange={e => { setFiltroUsuario(e.target.value); fetchAuditoria(e.target.value || undefined) }}
            className="h-8 pl-2 pr-7 rounded-lg border border-gray-200 text-xs text-gray-600 bg-white focus:outline-none focus:border-orange-400 cursor-pointer"
          >
            <option value="">Todos los usuarios</option>
            {usuarios.map(u => (
              <option key={u.id} value={u.email}>{u.email}</option>
            ))}
          </select>
        </CardHeader>
        <CardContent>
          {!auditoriaCargada ? (
            <p className="text-sm text-gray-400">Cargando...</p>
          ) : auditoria.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              Sin registros aún. Las acciones del equipo se registrarán automáticamente desde ahora.
            </p>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 border-b sticky top-0">
                  <tr>
                    <th className="text-left px-2 py-2 font-medium text-gray-600">Fecha</th>
                    <th className="text-left px-2 py-2 font-medium text-gray-600">Usuario</th>
                    <th className="text-left px-2 py-2 font-medium text-gray-600">Acción</th>
                    <th className="text-left px-2 py-2 font-medium text-gray-600">Sección</th>
                    <th className="text-left px-2 py-2 font-medium text-gray-600">Detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {auditoria.map(e => (
                    <tr key={e.id} className="hover:bg-gray-50">
                      <td className="px-2 py-2 text-gray-400 whitespace-nowrap">
                        {fmt(e.created_at)}
                      </td>
                      <td className="px-2 py-2 text-gray-600 max-w-[140px] truncate" title={e.usuario}>
                        {e.usuario}
                      </td>
                      <td className="px-2 py-2">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${ACCION_BADGE[e.accion] || 'bg-gray-100 text-gray-600'}`}>
                          {e.accion}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-gray-600 capitalize">{e.tabla}</td>
                      <td className="px-2 py-2 text-gray-500 max-w-[280px] truncate" title={e.detalle || ''}>
                        {e.detalle || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog cambiar contraseña */}
      {cambioPassOpen && (
        <Dialog open onOpenChange={() => setCambioPassOpen(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Cambiar contraseña — {cambioPassOpen.email}</DialogTitle></DialogHeader>
            <form onSubmit={cambiarContrasena} className="space-y-4">
              <div>
                <Label>Nueva contraseña *</Label>
                <Input type="password" required minLength={6} value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="Mínimo 6 caracteres" />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCambioPassOpen(null)}>Cancelar</Button>
                <Button type="submit" disabled={saving} className="bg-orange-600 hover:bg-orange-700">
                  {saving ? 'Guardando...' : 'Cambiar contraseña'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
