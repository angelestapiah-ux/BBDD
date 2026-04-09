'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [recovering, setRecovering] = useState(false)
  const [recoveryEmail, setRecoveryEmail] = useState('')
  const [recoverySent, setRecoverySent] = useState(false)
  const [recoveryLoading, setRecoveryLoading] = useState(false)
  const router = useRouter()

  function getSupabase() {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await getSupabase().auth.signInWithPassword({ email, password })
    if (error) {
      setError('Correo o contraseña incorrectos')
      setLoading(false)
    } else {
      router.push('/')
      router.refresh()
    }
  }

  async function handleRecovery(e: React.FormEvent) {
    e.preventDefault()
    setRecoveryLoading(true)
    const { error } = await getSupabase().auth.resetPasswordForEmail(recoveryEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setRecoveryLoading(false)
    if (error) {
      setError('Error al enviar el correo. Verifica el email ingresado.')
    } else {
      setRecoverySent(true)
    }
  }

  if (recovering) {
    return (
      <div className="min-h-screen bg-orange-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-orange-600">RENOVA</h1>
            <p className="text-gray-500 mt-1">Sistema CRM</p>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recuperar contraseña</CardTitle>
            </CardHeader>
            <CardContent>
              {recoverySent ? (
                <div className="space-y-4">
                  <p className="text-sm text-green-600">
                    Te enviamos un correo a <strong>{recoveryEmail}</strong> con instrucciones para restablecer tu contraseña.
                  </p>
                  <Button variant="outline" className="w-full" onClick={() => { setRecovering(false); setRecoverySent(false); setError('') }}>
                    Volver al login
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleRecovery} className="space-y-4">
                  <p className="text-sm text-gray-500">Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.</p>
                  <div>
                    <Label htmlFor="recovery-email">Correo electrónico</Label>
                    <Input
                      id="recovery-email"
                      type="email"
                      required
                      value={recoveryEmail}
                      onChange={e => setRecoveryEmail(e.target.value)}
                      placeholder="usuario@renova.cl"
                    />
                  </div>
                  {error && <p className="text-sm text-red-500">{error}</p>}
                  <Button type="submit" disabled={recoveryLoading} className="w-full bg-orange-600 hover:bg-orange-700">
                    {recoveryLoading ? 'Enviando...' : 'Enviar correo'}
                  </Button>
                  <Button type="button" variant="ghost" className="w-full" onClick={() => { setRecovering(false); setError('') }}>
                    Volver al login
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-orange-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-orange-600">RENOVA</h1>
          <p className="text-gray-500 mt-1">Sistema CRM</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Iniciar sesión</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="usuario@renova.cl"
                />
              </div>
              <div>
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => { setRecovering(true); setRecoveryEmail(email); setError('') }}
                  className="text-sm text-orange-600 hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" disabled={loading} className="w-full bg-orange-600 hover:bg-orange-700">
                {loading ? 'Ingresando...' : 'Ingresar'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
