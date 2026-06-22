'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, MessageSquare, Phone, Mail, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { getSupabase } from '@/lib/supabase'

export type Urgente = {
  cliente_id: string
  nombre: string
  correo: string | null
  telefono: string | null
  procedencia: string | null
  etapa: string | null
  ultimo_contacto: string
  horas: number
  nunca_contactado: boolean
}

const tiempoDesde = (h: number) => (h >= 48 ? `${Math.floor(h / 24)} d` : `${h} h`)

// Arma el link de WhatsApp con número chileno normalizado + mensaje PNL (pregunta abierta).
function waLink(tel: string | null, nombre: string): string | null {
  if (!tel) return null
  let d = tel.replace(/\D/g, '')
  if (!d) return null
  if (!d.startsWith('56')) {
    if (d.length === 9 && d.startsWith('9')) d = '56' + d
    else if (d.length === 8) d = '569' + d
  }
  const primer = (nombre || '').trim().split(/\s+/)[0] || ''
  const msg = `Hola ${primer}, ¡qué gusto saludarte! Te escribo de Renova PNL. Vi tu interés y me encantaría acompañarte en tu siguiente paso. ¿Qué te gustaría lograr con este proceso?`
  return `https://wa.me/${d}?text=${encodeURIComponent(msg)}`
}

const iconBtn =
  'inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-orange-600 transition-colors'

export default function SeguimientosUrgentes({ urgentes: inicial }: { urgentes: Urgente[] }) {
  const [urgentes, setUrgentes] = useState<Urgente[]>(inicial)
  const [abierto, setAbierto] = useState<string | null>(null)
  const [tipo, setTipo] = useState('whatsapp')
  const [nota, setNota] = useState('')
  const [guardando, setGuardando] = useState(false)

  async function registrar(u: Urgente) {
    setGuardando(true)
    let usuario = 'Dashboard'
    try {
      const { data } = await getSupabase().auth.getUser()
      if (data?.user?.email) usuario = data.user.email
    } catch { /* sin sesión: queda 'Dashboard' */ }
    const res = await fetch('/api/seguimientos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cliente_id: u.cliente_id,
        tipo,
        notas: nota || null,
        usuario,
        fecha: new Date().toISOString(),
      }),
    })
    setGuardando(false)
    if (res.ok) {
      toast.success('Seguimiento registrado')
      setUrgentes(prev => prev.filter(x => x.cliente_id !== u.cliente_id))
      setAbierto(null); setNota(''); setTipo('whatsapp')
    } else {
      toast.error('No se pudo registrar')
    }
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-rose-500" /> Seguimientos urgentes
            </CardTitle>
            <p className="text-xs text-gray-400 mt-0.5">
              Prospectos nuevos (últimos 7 días) sin contacto hace +72h · acciona sin salir de aquí
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-rose-100 text-rose-700 text-sm font-bold px-3 py-1">
            {urgentes.length}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {urgentes.length === 0 ? (
          <p className="text-sm text-green-700">Al día: ningún prospecto nuevo sin contacto +72h. 🎉</p>
        ) : (
          <>
            <div className="max-h-96 overflow-y-auto divide-y divide-gray-100 -mt-1">
              {urgentes.map(u => {
                const wa = waLink(u.telefono, u.nombre)
                return (
                  <div key={u.cliente_id} className="py-2">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
                      <a href={`/clientes/${u.cliente_id}`} className="flex-1 min-w-0 group">
                        <span className="block text-sm text-gray-800 truncate group-hover:underline">{u.nombre}</span>
                        <span className="block text-xs text-gray-400 truncate">
                          {u.procedencia || 'Sin procedencia'}{u.nunca_contactado ? ' · sin primer contacto' : ''}
                        </span>
                      </a>
                      <span className="shrink-0 text-xs font-medium text-rose-600 mr-1">{tiempoDesde(u.horas)}</span>
                      {wa && (
                        <a href={wa} target="_blank" rel="noopener noreferrer" title="WhatsApp" className={iconBtn}>
                          <MessageSquare className="h-4 w-4" />
                        </a>
                      )}
                      {u.telefono && (
                        <a href={`tel:${u.telefono}`} title="Llamar" className={iconBtn}><Phone className="h-4 w-4" /></a>
                      )}
                      {u.correo && (
                        <a href={`mailto:${u.correo}`} title="Correo" className={iconBtn}><Mail className="h-4 w-4" /></a>
                      )}
                      <button
                        type="button"
                        title="Registrar seguimiento"
                        onClick={() => setAbierto(abierto === u.cliente_id ? null : u.cliente_id)}
                        className={iconBtn + (abierto === u.cliente_id ? ' bg-orange-100 text-orange-600' : '')}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </button>
                    </div>

                    {abierto === u.cliente_id && (
                      <div className="mt-2 ml-4 flex flex-wrap items-center gap-2">
                        <select
                          value={tipo}
                          onChange={e => setTipo(e.target.value)}
                          className="h-8 rounded border border-gray-300 px-2 text-xs"
                        >
                          <option value="whatsapp">WhatsApp</option>
                          <option value="llamada">Llamada</option>
                          <option value="correo">Correo</option>
                          <option value="otro">Otro</option>
                        </select>
                        <input
                          value={nota}
                          onChange={e => setNota(e.target.value)}
                          placeholder="Nota (opcional)"
                          className="h-8 flex-1 min-w-[140px] rounded border border-gray-300 px-2 text-xs"
                        />
                        <button
                          type="button"
                          disabled={guardando}
                          onClick={() => registrar(u)}
                          className="h-8 rounded-md bg-orange-600 px-3 text-xs font-medium text-white hover:bg-orange-700 disabled:opacity-50"
                        >
                          {guardando ? 'Guardando…' : 'Registrar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setAbierto(null)}
                          className="h-8 rounded-md px-2 text-xs text-gray-400 hover:text-gray-600"
                        >
                          Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <p className="text-xs text-gray-400 mt-3">
              Al registrar un seguimiento, el prospecto sale de la lista ·{' '}
              <a href="/seguimientos" className="text-orange-600 hover:underline">ir a Seguimientos</a>
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
