'use client'

import { useEffect, useState, useCallback, MouseEvent as ReactMouseEvent } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface EventoLista {
  id: string
  titulo: string
  inicio: string | null
  fin: string | null
  allDay: boolean
}

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const HORA_INICIO = 7
const HORA_FIN = 22
const PX_HORA = 44

function lunesDe(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  const dia = (x.getDay() + 6) % 7 // 0 = lunes
  x.setDate(x.getDate() - dia)
  return x
}
function pad(n: number) { return String(n).padStart(2, '0') }
function ymd(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
function fmtDiaMes(d: Date) { return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}` }

export function VistaSemana({ onAgendar, refreshKey }: { onAgendar: (fecha: string, hora: string) => void; refreshKey?: number }) {
  const [lunes, setLunes] = useState<Date>(() => lunesDe(new Date()))
  const [eventos, setEventos] = useState<EventoLista[]>([])
  const [cargando, setCargando] = useState(true)

  const dias = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lunes); d.setDate(lunes.getDate() + i); return d
  })

  const cargar = useCallback(async () => {
    setCargando(true)
    const fin = new Date(lunes); fin.setDate(lunes.getDate() + 7)
    const res = await fetch(`/api/google/eventos?desde=${encodeURIComponent(lunes.toISOString())}&hasta=${encodeURIComponent(fin.toISOString())}`)
    const d = await res.json()
    setEventos(Array.isArray(d) ? d : [])
    setCargando(false)
  }, [lunes, refreshKey])
  useEffect(() => { cargar() }, [cargar])

  const horas = Array.from({ length: HORA_FIN - HORA_INICIO }, (_, i) => HORA_INICIO + i)
  const hoyYmd = ymd(new Date())

  function eventosDelDia(diaYmd: string) {
    return eventos.filter(ev => ev.inicio && !ev.allDay && ymd(new Date(ev.inicio)) === diaYmd)
  }
  function bloque(ev: EventoLista) {
    const ini = new Date(ev.inicio as string)
    const fin = ev.fin ? new Date(ev.fin) : new Date(ini.getTime() + 60 * 60000)
    const startMin = ini.getHours() * 60 + ini.getMinutes() - HORA_INICIO * 60
    const durMin = Math.max((fin.getTime() - ini.getTime()) / 60000, 30)
    const top = Math.max((startMin / 60) * PX_HORA, 0)
    const height = Math.max((durMin / 60) * PX_HORA - 2, 18)
    const t = ev.titulo
    const color = t.startsWith('ANULADA') ? 'bg-red-100 border-red-300 text-red-700'
      : t.startsWith('REAGENDADA') ? 'bg-amber-100 border-amber-300 text-amber-800'
      : 'bg-orange-100 border-orange-300 text-orange-800'
    return { top, height, color, hora: `${pad(ini.getHours())}:${pad(ini.getMinutes())}` }
  }

  function clickColumna(e: ReactMouseEvent<HTMLDivElement>, dia: Date) {
    const y = e.nativeEvent.offsetY
    let min = HORA_INICIO * 60 + (y / PX_HORA) * 60
    min = Math.round(min / 30) * 30
    const h = Math.floor(min / 60); const m = min % 60
    onAgendar(ymd(dia), `${pad(h)}:${pad(m)}`)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1">
          <button onClick={() => { const x = new Date(lunes); x.setDate(lunes.getDate() - 7); setLunes(x) }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"><ChevronLeft className="h-5 w-5" /></button>
          <button onClick={() => setLunes(lunesDe(new Date()))} className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50">Hoy</button>
          <button onClick={() => { const x = new Date(lunes); x.setDate(lunes.getDate() + 7); setLunes(x) }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"><ChevronRight className="h-5 w-5" /></button>
        </div>
        <p className="text-sm font-medium text-gray-700">{fmtDiaMes(dias[0])} – {fmtDiaMes(dias[6])}</p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white">
        <div className="min-w-[720px]">
          {/* Encabezado de días */}
          <div className="grid" style={{ gridTemplateColumns: '48px repeat(7, 1fr)' }}>
            <div className="border-b border-gray-100" />
            {dias.map((d, i) => (
              <div key={i} className={`text-center py-2 border-b border-l border-gray-100 ${ymd(d) === hoyYmd ? 'bg-orange-50' : ''}`}>
                <div className="text-xs text-gray-400">{DIAS[i]}</div>
                <div className={`text-sm font-semibold ${ymd(d) === hoyYmd ? 'text-orange-700' : 'text-gray-700'}`}>{pad(d.getDate())}</div>
              </div>
            ))}
          </div>
          {/* Grilla de horas */}
          <div className="grid" style={{ gridTemplateColumns: '48px repeat(7, 1fr)' }}>
            <div>
              {horas.map(h => (
                <div key={h} style={{ height: PX_HORA }} className="text-[10px] text-gray-400 text-right pr-1 -mt-1.5">{pad(h)}:00</div>
              ))}
            </div>
            {dias.map((dia, i) => (
              <div key={i} className="relative border-l border-gray-100 cursor-pointer" style={{ height: horas.length * PX_HORA }} onClick={(e) => clickColumna(e, dia)}>
                {horas.map((h, idx) => (
                  <div key={h} className="border-b border-gray-50 pointer-events-none" style={{ height: PX_HORA, position: 'absolute', top: idx * PX_HORA, left: 0, right: 0 }} />
                ))}
                {eventosDelDia(ymd(dia)).map(ev => {
                  const b = bloque(ev)
                  return (
                    <div key={ev.id} className={`absolute left-0.5 right-0.5 rounded border px-1 overflow-hidden pointer-events-none ${b.color}`} style={{ top: b.top, height: b.height }}>
                      <div className="text-[10px] font-medium leading-tight truncate">{b.hora} {ev.titulo}</div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      {cargando && <p className="text-xs text-gray-400 mt-2">Cargando calendario...</p>}
      <p className="text-xs text-gray-400 mt-2">Haz clic en un horario libre para agendar ahí.</p>
    </div>
  )
}
