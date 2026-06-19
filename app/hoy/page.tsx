'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Cliente, PlantillaWhatsapp, ETAPAS_FUNNEL, EtapaFunnel } from '@/lib/types'
import { ContactadoPanel } from '@/components/clientes/ContactadoPanel'
import { Phone, MessageSquare, CheckCircle2, Flame, CalendarClock, ChevronDown, Sun } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type ClienteHoy = Cliente & { ultimo_seguimiento: string | null; ultima_actividad: string | null }

const ETAPA_BADGE: Record<EtapaFunnel, string> = {
  nuevo:              'bg-gray-100 text-gray-600',
  contactado:         'bg-blue-100 text-blue-700',
  con_interes:        'bg-violet-100 text-violet-700',
  cotizacion_enviada: 'bg-yellow-100 text-yellow-700',
  negociando:         'bg-orange-100 text-orange-700',
  inscrito:           'bg-green-100 text-green-700',
  en_pausa:           'bg-rose-100 text-rose-700',
}

function diasDesde(fecha: string | null) {
  if (!fecha) return null
  return Math.floor((Date.now() - new Date(fecha).getTime()) / 86_400_000)
}

function renderPlantilla(cuerpo: string, c: ClienteHoy) {
  const primerNombre = c.nombre.split(' ')[0]
  return cuerpo
    .replaceAll('{nombre}', primerNombre)
    .replaceAll('{actividad}', c.ultima_actividad || 'nuestros programas')
}

// â”€â”€â”€ Selector de plantilla WhatsApp â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function WhatsappMenu({ cliente, plantillas, onEnviado, pos }: {
  cliente: ClienteHoy
  plantillas: PlantillaWhatsapp[]
  onEnviado: () => void
  pos: { top: number; right: number }
}) {
  async function enviar(plantilla: PlantillaWhatsapp | null) {
    const telefono = cliente.telefono!.replace(/\D/g, '')
    const texto = plantilla ? renderPlantilla(plantilla.cuerpo, cliente) : ''
    const url = `https://wa.me/${telefono}${texto ? `?text=${encodeURIComponent(texto)}` : ''}`
    window.open(url, '_blank', 'noopener,noreferrer')

    if (plantilla) {
      // Registrar el envÃ­o como seguimiento automÃ¡ticamente
      const res = await fetch('/api/seguimientos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_id: cliente.id,
          tipo: 'whatsapp',
          notas: `WhatsApp enviado Â· plantilla "${plantilla.nombre}"`,
          fecha: new Date().toISOString().slice(0, 10),
        }),
      })
      if (res.ok) toast.success('WhatsApp abierto y seguimiento registrado')
    }
    onEnviado()
  }

  return (
    <div
      style={{ position: 'fixed', top: pos.top, right: pos.right, zIndex: 9999 }}
      className="bg-white rounded-xl shadow-xl border border-gray-200 py-1 w-72"
      onClick={e => e.stopPropagation()}
    >
      <p className="px-3 py-1.5 text-xs font-semibold text-gray-500">Enviar WhatsApp con plantilla</p>
      {plantillas.map(p => (
        <button
          key={p.id}
          onClick={() => enviar(p)}
          className="w-full text-left px-3 py-2 hover:bg-green-50 transition-colors"
        >
          <span className="text-sm font-medium text-gray-800">{p.nombre}</span>
          <span className="block text-xs text-gray-400 truncate">{renderPlantilla(p.cuerpo, cliente)}</span>
        </button>
      ))}
      <div className="border-t border-gray-100 my-1" />
      <button
        onClick={() => enviar(null)}
        className="w-full text-left px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
      >
        Sin plantilla (mensaje en blanco)
      </button>
    </div>
  )
}

// â”€â”€â”€ Fila de cliente â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function FilaCliente({ c, plantillas, onActualizar, vencido }: {
  c: ClienteHoy
  plantillas: PlantillaWhatsapp[]
  onActualizar: () => void
  vencido?: boolean
}) {
  const [waOpen, setWaOpen] = useState(false)
  const [waPos, setWaPos] = useState<{ top: number; right: number } | null>(null)
  const [contactadoOpen, setContactadoOpen] = useState(false)
  const [contactadoPos, setContactadoPos] = useState<{ top: number; right: number } | null>(null)

  const dias = diasDesde(c.ultimo_seguimiento || c.created_at)

  useEffect(() => {
    function handler(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (!target.closest('[data-hoy-popup]')) {
        setWaOpen(false)
        setContactadoOpen(false)
      }
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  return (
    <div className={cn(
      'flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors',
      vencido && 'bg-red-50/40'
    )}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Link href={`/clientes/${c.id}`} className="font-medium text-gray-900 hover:text-orange-600">
            {c.nombre}
          </Link>
          {c.etapa && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ETAPA_BADGE[c.etapa]}`}>
              {ETAPAS_FUNNEL.find(e => e.value === c.etapa)?.label}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-0.5">
          {c.proximo_contacto && (
            <span className={vencido ? 'text-red-500 font-medium' : ''}>
              Agendado: {c.proximo_contacto}
            </span>
          )}
          {c.proximo_contacto && dias !== null && ' Â· '}
          {dias !== null && `${dias} dÃ­a${dias === 1 ? '' : 's'} sin contacto`}
          {c.ultima_actividad && ` Â· ${c.ultima_actividad}`}
        </p>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {c.telefono && (
          <div className="relative" data-hoy-popup>
            <button
              onClick={e => {
                e.stopPropagation()
                if (waOpen) { setWaOpen(false); return }
                const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect()
                setWaPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
                setWaOpen(true)
                setContactadoOpen(false)
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors"
            >
              <MessageSquare size={13} /> WhatsApp <ChevronDown size={11} />
            </button>
            {waOpen && waPos && (
              <WhatsappMenu cliente={c} plantillas={plantillas} pos={waPos} onEnviado={() => { setWaOpen(false); onActualizar() }} />
            )}
          </div>
        )}
        {c.telefono && (
          <a
            href={`tel:${c.telefono}`}
            title="Llamar"
            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          >
            <Phone size={14} />
          </a>
        )}
        <div className="relative" data-contactado-panel data-hoy-popup>
          <button
            onClick={e => {
              e.stopPropagation()
              if (contactadoOpen) { setContactadoOpen(false); return }
              const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect()
              setContactadoPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
              setContactadoOpen(true)
              setWaOpen(false)
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 transition-colors"
          >
            <CheckCircle2 size={13} /> Contactado
          </button>
          {contactadoOpen && contactadoPos && (
            <ContactadoPanel
              clienteId={c.id}
              pos={contactadoPos}
              onSaved={() => { setContactadoOpen(false); onActualizar() }}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// â”€â”€â”€ PÃ¡gina â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function HoyPage() {
  const [agendados, setAgendados] = useState<ClienteHoy[]>([])
  const [enfriandose, setEnfriandose] = useState<ClienteHoy[]>([])
  const [plantillas, setPlantillas] = useState<PlantillaWhatsapp[]>([])
  const [loading, setLoading] = useState(true)

  const fetchHoy = useCallback(async () => {
    const res = await fetch('/api/hoy')
    if (res.ok) {
      const json = await res.json()
      setAgendados(json.agendados || [])
      setEnfriandose(json.enfriandose || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchHoy()
    fetch('/api/plantillas')
      .then(r => r.ok ? r.json() : [])
      .then(d => setPlantillas(Array.isArray(d) ? d : []))
      .catch(() => {})
  }, [fetchHoy])

  const hoy = new Date().toISOString().slice(0, 10)
  const vencidos = agendados.filter(c => c.proximo_contacto && c.proximo_contacto < hoy)
  const deHoy = agendados.filter(c => !c.proximo_contacto || c.proximo_contacto >= hoy)
  const total = agendados.length + enfriandose.length

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-1">
        <Sun className="h-6 w-6 text-orange-500" />
        <h2 className="text-2xl font-bold text-gray-900">Hoy</h2>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        {loading ? 'Cargando...' : total === 0
          ? 'ðŸŽ‰ Â¡Todo al dÃ­a! No hay contactos pendientes.'
          : `${total} cliente${total === 1 ? '' : 's'} por contactar`}
      </p>

      {!loading && vencidos.length > 0 && (
        <section className="mb-6">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-red-600 mb-2">
            <CalendarClock size={15} /> Atrasados ({vencidos.length})
          </h3>
          <div className="rounded-lg border border-red-200 overflow-hidden">
            {vencidos.map(c => (
              <FilaCliente key={c.id} c={c} plantillas={plantillas} onActualizar={fetchHoy} vencido />
            ))}
          </div>
        </section>
      )}

      {!loading && deHoy.length > 0 && (
        <section className="mb-6">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
            <CalendarClock size={15} /> Agendados para hoy ({deHoy.length})
          </h3>
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            {deHoy.map(c => (
              <FilaCliente key={c.id} c={c} plantillas={plantillas} onActualizar={fetchHoy} />
            ))}
          </div>
        </section>
      )}

      {!loading && enfriandose.length > 0 && (
        <section className="mb-6">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-amber-600 mb-2">
            <Flame size={15} /> EnfriÃ¡ndose â€” 7+ dÃ­as sin contacto en etapa activa ({enfriandose.length})
          </h3>
          <div className="rounded-lg border border-amber-200 overflow-hidden">
            {enfriandose.map(c => (
              <FilaCliente key={c.id} c={c} plantillas={plantillas} onActualizar={fetchHoy} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
