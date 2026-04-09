'use client'

import { useEffect, useState, useCallback } from 'react'
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

interface Usuario {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
}

interface TipoCliente { id: string; nombre: string }

export default function ConfiguracionPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [nuevoOpen, setNuevoOpen] = useState(false)
  const [cambioPassOpen, setCambioPassOpen] = useState<Usuario | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newPass, setNewPass] = useState('')
  const [saving, setSaving] = useState(false)
  const [tipos, setTipos] = useState<TipoCliente[]>([])
  const [nuevoTipo, setNuevoTipo] = useState('')
  const [savingTipo, setSavingTipo] = useState(false)
  const router = useRouter()

  const fetchUsuarios = useCallback(async () => {
    const res = await fetch('/api/admin/usuarios')
    if (res.ok) setUsuarios(await res.json())
    setLoading(false)
  }, [])

  const fetchTipos = useCallback(async () => {
    const res = await fetch('/api/tipos-cliente')
    if (res.ok) setTipos(await res.json())
  }, [])

  useEffect(() => { fetchUsuarios(); fetchTipos() }, [fetchUsuarios, fetchTipos])

  async function agregarTipo(e: React.FormEvent) {
    e.preventDefault()
    if (!nuevoTipo.trim()) return
    setSavingTipo(true)
    const res = await fetch('/api/tipos-cliente', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: nuevoTipo.trim() }),
    })
    if (res.ok) { toast.success('Tipo agregado'); setNuevoTipo(''); fetchTipos() }
    else toast.error('Error al agregar tipo')
    setSavingTipo(false)
  }

  async function eliminarTipo(t: TipoCliente) {
    if (!confirm(`¿Eliminar el tipo "${t.nombre}"?`)) return
    const res = await fetch(`/api/tipos-cliente/${t.id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Tipo eliminado'); fetchTipos() }
    else toast.error('Error al eliminar')
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
      body: JSON.stringify({ email, password }),
    })
    if (res.ok) {
      toast.success('Usuario creado correctamente')
      setNuevoOpen(false)
      setEmail(''); setPassword('')
      fetchUsuarios()
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
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Último acceso</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {usuarios.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3 font-medium">{u.email}</td>
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
                ))}
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
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNuevoOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving} className="bg-orange-600 hover:bg-orange-700">
                {saving ? 'Creando...' : 'Crear usuario'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Tipos de cliente */}
      <Card className="mt-6">
        <CardHeader className="py-4">
          <CardTitle className="text-base">Tipos de cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm mb-4">
            <tbody className="divide-y divide-gray-100">
              {tipos.map(t => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2">{t.nombre}</td>
                  <td className="px-3 py-2 text-right">
                    <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700" onClick={() => eliminarTipo(t)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </td>
                </tr>
              ))}
              {tipos.length === 0 && (
                <tr><td className="px-3 py-2 text-gray-400">Sin tipos configurados</td></tr>
              )}
            </tbody>
          </table>
          <form onSubmit={agregarTipo} className="flex gap-2">
            <Input
              placeholder="Nombre del tipo..."
              value={nuevoTipo}
              onChange={e => setNuevoTipo(e.target.value)}
              className="max-w-xs"
            />
            <Button type="submit" disabled={savingTipo} size="sm" className="bg-orange-600 hover:bg-orange-700">
              <Plus className="h-4 w-4 mr-1" /> Agregar
            </Button>
          </form>
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
