'use client'

import { useState } from 'react'
import { toast } from 'sonner'

const PROXIMO_OPCIONES = [
  { label: 'Mañana', dias: 1 },
  { label: '3 días', dias: 3 },
  { label: '1 sem', dias: 7 },
  { label: 'Sin fecha', dias: null },
] as const

function fechaEnDias(dias: number) {
  const d = new Date()
  d.setDate(d.getDate() + dias)
  return d.toISOString().slice(0, 10)
}

// Panel flotante para registrar un contacto rápido + agendar el próximo.
// Al guardar: crea el seguimiento y actualiza proximo_contacto del cliente
// (la fecha elegida, o null para sacarlo de la vista "Hoy").
export function ContactadoPanel({ clienteId, onSaved, pos }: {
  clienteId: string
  onSaved: () => void
  pos: { top: number; right: number }
}) {
  const [tipo, setTipo] = useState<'llamada' | 'whatsapp' | 'correo' | 'otro'>('whatsapp')
  const [nota, setNota] = useState('')
  const [proximoDias, setProximoDias] = useState<number | null>(3)
  const [saving, setSaving] = useState(false)

  async function guardar() {
    setSaving(true)
    const hoy = new Date().toISOString().slice(0, 10)
    const proximo = proximoDias !== null ? fechaEnDias(proximoDias) : null

    const res = await fetch('/api/seguimientos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cliente_id: clienteId, tipo, notas: nota || `${tipo} registrado`, fecha: hoy }),
    })
    if (!res.ok) {
      setSaving(false)
      toast.error('Error al guardar')
      return
    }

    const resCliente = await fetch(`/api/clientes/${clienteId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proximo_contacto: proximo }),
    })
    setSaving(false)
    if (!resCliente.ok) {
      toast.warning('Contacto guardado, pero no se pudo agendar el próximo')
    } else {
      toast.success(proximo ? `Contacto guardado · próximo: ${proximo}` : 'Contacto guardado')
    }
    onSaved()
  }

  return (
    <div
      style={{ position: 'fixed', top: pos.top, right: pos.right, zIndex: 9999 }}
      className="bg-white rounded-xl shadow-xl border border-gray-200 p-3 w-64"
      onClick={e => e.stopPropagation()}
    >
      <p className="text-xs font-semibold text-gray-700 mb-2">Registrar contacto</p>
      <div className="flex gap-1.5 mb-2">
        {(['llamada', 'whatsapp', 'correo', 'otro'] as const).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setTipo(t)}
            className={`px-2 py-1 rounded text-xs border capitalize transition-colors ${
              tipo === t
                ? 'bg-orange-600 text-white border-orange-600'
                : 'bg-white text-gray-500 border-gray-200 hover:border-orange-300'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <input
        type="text"
        placeholder="Nota breve (opcional)..."
        value={nota}
        onChange={e => setNota(e.target.value)}
        className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 mb-2 focus:outline-none focus:border-orange-400"
        onKeyDown={e => e.key === 'Enter' && guardar()}
      />
      <p className="text-xs font-semibold text-gray-700 mb-1.5">¿Cuándo recontactar?</p>
      <div className="flex gap-1.5 mb-2">
        {PROXIMO_OPCIONES.map(o => (
          <button
            key={o.label}
            type="button"
            onClick={() => setProximoDias(o.dias)}
            className={`px-2 py-1 rounded text-xs border transition-colors ${
              proximoDias === o.dias
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-500 border-gray-200 hover:border-blue-300'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      <button
        onClick={guardar}
        disabled={saving}
        className="w-full bg-orange-600 hover:bg-orange-700 text-white text-xs py-1.5 rounded font-medium transition-colors disabled:opacity-50"
      >
        {saving ? 'Guardando...' : '✓ Guardar contacto'}
      </button>
    </div>
  )
}
