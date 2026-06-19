'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, ChevronRight, GraduationCap, Sun, Users, Receipt, Keyboard, MessageSquare, RotateCcw, Lightbulb } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

// ─── Contenido del tutorial ──────────────────────────────────────────────
const CAPITULOS = [
  {
    id: 'rutina',
    icono: Sun,
    titulo: 'Tu rutina diaria: la vista "Hoy"',
    resumen: 'Lo primero que haces cada mañana. 10 minutos que ordenan todo el día.',
    pasos: [
      { t: 'Abre el CRM y entra a "Hoy"', d: 'Es la primera opción del menú (ícono de sol ☀️). Ahí está tu trabajo del día, ya priorizado: no necesitas buscar a quién contactar.' },
      { t: 'Parte por los "Atrasados" (rojo)', d: 'Son recontactos que ya vencieron. Trabájalos primero — un lead que espera se enfría rápido.' },
      { t: 'Sigue con "Agendados para hoy"', d: 'Los compromisos del día: gente a la que prometiste volver a escribir.' },
      { t: 'Revisa "Enfriándose" (ámbar)', d: 'Clientes interesados que llevan 7+ días sin contacto. El sistema los detecta solo — son ventas que se están escapando.' },
      { t: 'Contacta a cada uno SIN salir de la lista', d: 'Cada fila tiene botón de WhatsApp (con plantillas listas), llamada y "Contactado". Trabaja la lista de arriba a abajo.' },
    ],
    tip: 'Meta diaria: dejar la vista "Hoy" vacía. Si lo logras todos los días, ningún lead se pierde nunca.',
  },
  {
    id: 'contactos',
    icono: MessageSquare,
    titulo: 'Registrar contactos y agendar el siguiente',
    resumen: 'La regla de oro: todo contacto queda registrado y SIEMPRE con próximo paso.',
    pasos: [
      { t: 'Tras hablar con alguien, click en "Contactado" (✓)', d: 'Está en la vista Hoy y en la lista de Clientes (aparece al pasar el mouse sobre la fila).' },
      { t: 'Elige el tipo y anota lo esencial', d: 'WhatsApp, llamada, correo u otro. Una nota corta basta: "le interesa, pidió valores", "no contesta, reintentar".' },
      { t: 'Elige cuándo recontactar — el paso MÁS importante', d: 'Mañana / 3 días / 1 semana. Esto hace que el cliente vuelva a aparecer en "Hoy" en la fecha correcta. Sin próximo paso, el lead muere.' },
      { t: 'Para WhatsApp usa las plantillas', d: 'En "Hoy", el botón verde WhatsApp despliega mensajes pre-escritos con técnicas de PNL, ya personalizados con el nombre de la persona. Un click: se abre WhatsApp con el texto listo Y el seguimiento se registra solo.' },
    ],
    tip: 'Nunca cierres una conversación sin agendar el siguiente contacto. Esa única costumbre es la diferencia entre un CRM que vende y una libreta de teléfonos.',
  },
  {
    id: 'clientes',
    icono: Users,
    titulo: 'Clientes y el funnel de venta',
    resumen: 'Cómo entra un lead y cómo avanza hasta inscribirse.',
    pasos: [
      { t: 'Crear un cliente toma 10 segundos', d: 'Botón "Nuevo cliente" → nombre, teléfono y canal de origen. Nada más. Los demás datos se completan después, cuando los tengas.' },
      { t: 'Si ya existe, el sistema te avisa', d: 'Al escribir el teléfono o correo de alguien registrado aparece una alerta amarilla con link a su perfil. Mejor actualizar que duplicar.' },
      { t: 'El "tipo de cliente" son las actividades', d: 'Al asignarle una actividad como tipo, su asistencia se registra sola en el perfil. ¿Falta un tipo? Créalo en la sección Actividades.' },
      { t: 'Docentes, terapeutas y pacientes', d: 'En el perfil, los botones 🎓 Docente y 🩺 Terapeuta marcan a quienes boletean a Renova. A los pacientes se les asigna su terapeuta (campo "Terapeuta") y quedan con la etiqueta "Paciente de NN".' },
      { t: 'El funnel ahora es POR actividad', d: 'Una misma persona puede estar en distinta etapa según la actividad: inscrita en la clase y en "Con interés" para el taller, al mismo tiempo. Las etapas son Nuevo → Contactado → Con interés → Cotización enviada → Negociando → Inscrito.' },
      { t: 'Dónde avanzas la etapa', d: 'En la ficha del cliente, pestaña "Actividades y pagos": cada actividad tiene su propio menú de etapa, lo cambias con un click. Si la persona aún no tiene esa actividad, usa "Sumar una actividad al funnel".' },
      { t: 'Edita directo en la tabla', d: 'Click sobre el correo o teléfono de cualquier fila y lo corriges ahí mismo. Enter guarda.' },
      { t: 'La columna "Funnel" muestra sus oportunidades', d: 'En la lista de Clientes, cada persona muestra chips de "Actividad: Etapa" — su funnel de un vistazo. Para cambiarlos, abre su ficha.' },
      { t: 'Los leads de las webs entran solos', d: 'Cuando alguien deja sus datos en una web de Renova, aparece automáticamente como cliente "Nuevo" en la vista Hoy, con su web de origen. Contáctalo el mismo día: es un lead caliente.' },
    ],
    tip: 'El semáforo de la lista (verde/ámbar/rojo) indica cuánto hace que no contactas a cada cliente. Rojo = más de 72 horas.',
  },
  {
    id: 'pagos',
    icono: Receipt,
    titulo: 'Pagos y cobranza',
    resumen: 'Registrar pagos, cobrar en cuotas y no perder ningún vencimiento.',
    pasos: [
      { t: 'Registrar un pago', d: 'Desde el perfil (botón verde "Pago"). Eliges la actividad — si es nueva para el cliente, se agrega sola a su perfil. Tiene fecha de pago y fecha de actividad separadas, y botón "Sin cobro" para becas o cortesías.' },
      { t: 'Cobrar en cuotas (plan de pago)', d: 'Al registrar un pago elige "Plan de cuotas": indicas cuántas cuotas, el monto total y la fecha de la 1ª; el sistema reparte parejo y calcula los vencimientos mensuales. Puedes ajustar a mano cualquier monto o fecha antes de guardar.' },
      { t: 'Seguir las cuotas con semáforo', d: 'En la ficha del cliente, bajo cada actividad ves sus cuotas con semáforo: verde al día, ámbar si vence en 3 días o menos, rojo si está vencida. Con "Marcar pagada" confirmas cada cuota cuando llega su abono (y "Deshacer" la revierte).' },
      { t: 'Estados: Pagado, Pendiente, Parcial', d: 'Usa "Pendiente" para cuotas comprometidas y "Parcial" para abonos. Un pago "Pagado" siempre exige el monto (salvo "Sin cobro"). Un plan de cuotas avanza a "Parcial" a medida que pagas cada cuota.' },
      { t: 'Cobrar pendientes en un click', d: 'En la página Pagos, los pendientes tienen el botón verde "Pagado" para confirmarlos al instante. Los pagos con plan muestran la etiqueta "Plan de cuotas" — esos se gestionan cuota a cuota desde la ficha.' },
      { t: 'Facturación', d: 'Marca "requiere factura" y anota el N° al emitirla; el campo "Facturación interna" lleva el folio para el SII. Todo se consolida en Reportes → pestaña Facturación.' },
      { t: 'Honorarios automáticos', d: 'Si el paciente tiene terapeuta asignado (marcado con 🩺 en su perfil), cada pago genera sola la boleta pendiente del terapeuta en Honorarios, con el pago como referencia. Las de docentes se ingresan manualmente ahí mismo: pones el líquido y el sistema calcula el bruto a boletear.' },
      { t: 'Gastos de la empresa', d: 'En "Gastos empresa" se registran los gastos varios del día a día y el arriendo de sala, con totales por boleta/factura como en la antigua planilla.' },
    ],
    tip: 'Revisa cada lunes: las cuotas próximas a vencer (semáforo ámbar/rojo en las fichas), Pagos con filtro "Pendiente" y Honorarios con filtro "Pendiente".',
  },
  {
    id: 'atajos',
    icono: Keyboard,
    titulo: 'Atajos y trucos de velocidad',
    resumen: 'Para volar en el CRM.',
    pasos: [
      { t: 'Búsqueda flexible (sin tildes ni nombre completo)', d: 'La búsqueda de Clientes ignora tildes y entiende palabras sueltas: "maria perez" encuentra a "María José Pérez Soto". Y Ctrl+K abre el buscador maestro desde cualquier pantalla.' },
      { t: 'Acciones masivas', d: 'En Clientes, marca varios con los checkboxes y cámbiales la etapa o el tipo a todos de una vez con la barra que aparece abajo.' },
      { t: 'Botón de ayuda "?"', d: 'Abajo a la derecha, en todas las pantallas. Escribe tu duda en lenguaje normal ("cómo registro un pago") y te muestra el paso a paso.' },
      { t: 'Importar y exportar Excel', d: '"Importar Excel" carga clientes masivamente (detecta las columnas solo). El botón "Exportar" en Clientes descarga la base.' },
      { t: 'Reporte de perfiles incompletos', d: 'En Reportes → pestaña "Sin contacto" ves los clientes sin teléfono ni correo, para completarlos. Se exporta a Excel.' },
      { t: 'Tema Dorado ✨', d: 'Botón en la barra superior derecha, por si prefieres el modo oscuro elegante.' },
    ],
    tip: 'Si olvidas cualquier cosa de este tutorial, el botón "?" siempre está ahí — pregúntale como le preguntarías a un compañero.',
  },
]

const STORAGE_KEY = 'renova_tutorial_progreso'

export default function TutorialPage() {
  const [completados, setCompletados] = useState<Set<string>>(new Set())
  const [abierto, setAbierto] = useState<string>(CAPITULOS[0].id)

  useEffect(() => {
    try {
      const guardado = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
      if (Array.isArray(guardado)) setCompletados(new Set(guardado))
    } catch { /* primer ingreso */ }
  }, [])

  function marcar(id: string) {
    setCompletados(prev => {
      const s = new Set(prev)
      if (s.has(id)) s.delete(id); else s.add(id)
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(s))) } catch {}
      return s
    })
    // Abrir automáticamente el siguiente capítulo pendiente
    const idx = CAPITULOS.findIndex(c => c.id === id)
    const siguiente = CAPITULOS.slice(idx + 1).find(c => !completados.has(c.id))
    if (siguiente && !completados.has(id)) setAbierto(siguiente.id)
  }

  function reiniciar() {
    setCompletados(new Set())
    try { localStorage.removeItem(STORAGE_KEY) } catch {}
    setAbierto(CAPITULOS[0].id)
  }

  const progreso = Math.round((completados.size / CAPITULOS.length) * 100)

  return (
    <div className="p-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <GraduationCap className="h-6 w-6 text-orange-500" />
        <h2 className="text-2xl font-bold text-gray-900">Tutorial del CRM</h2>
      </div>
      <p className="text-sm text-gray-500 mb-5">
        5 capítulos · ~15 minutos. Al terminar sabrás operar el CRM completo.
      </p>

      {/* Barra de progreso */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-orange-600 rounded-full transition-all duration-500"
            style={{ width: `${progreso}%` }}
          />
        </div>
        <span className="text-sm font-semibold text-gray-700 w-20">{progreso}%</span>
        {completados.size > 0 && (
          <button onClick={reiniciar} title="Reiniciar tutorial" className="p-1.5 rounded-lg text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-colors">
            <RotateCcw size={14} />
          </button>
        )}
      </div>

      {progreso === 100 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 text-center">
          <p className="text-base font-semibold text-green-700">🎉 ¡Tutorial completado!</p>
          <p className="text-sm text-green-600 mt-1">
            Ya estás lista/o para operar. Tu próximo paso: abre la vista{' '}
            <Link href="/hoy" className="underline font-medium">Hoy</Link> y trabaja tu primera lista.
          </p>
        </div>
      )}

      {/* Capítulos */}
      <div className="space-y-3">
        {CAPITULOS.map((cap, i) => {
          const Icono = cap.icono
          const done = completados.has(cap.id)
          const open = abierto === cap.id

          return (
            <div key={cap.id} className={cn(
              'bg-white rounded-xl border transition-colors overflow-hidden',
              done ? 'border-green-200' : open ? 'border-orange-300' : 'border-gray-200'
            )}>
              {/* Cabecera del capítulo */}
              <button
                onClick={() => setAbierto(open ? '' : cap.id)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50 transition-colors"
              >
                <div className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center shrink-0',
                  done ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'
                )}>
                  {done ? <CheckCircle2 size={18} /> : <Icono size={17} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-semibold', done ? 'text-gray-400 line-through' : 'text-gray-800')}>
                    {i + 1}. {cap.titulo}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{cap.resumen}</p>
                </div>
                <ChevronRight className={cn('h-4 w-4 text-gray-300 transition-transform shrink-0', open && 'rotate-90')} />
              </button>

              {/* Contenido */}
              {open && (
                <div className="px-4 pb-4 border-t border-gray-100">
                  <ol className="space-y-3 mt-3.5">
                    {cap.pasos.map((p, j) => (
                      <li key={j} className="flex gap-3">
                        <span className="shrink-0 w-6 h-6 rounded-full bg-orange-50 border border-orange-200 text-orange-700 text-xs font-bold flex items-center justify-center mt-0.5">
                          {j + 1}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-gray-800">{p.t}</p>
                          <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{p.d}</p>
                        </div>
                      </li>
                    ))}
                  </ol>

                  <div className="mt-4 flex gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2.5">
                    <Lightbulb className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-yellow-800 leading-relaxed">{cap.tip}</p>
                  </div>

                  <button
                    onClick={() => marcar(cap.id)}
                    className={cn(
                      'mt-4 w-full py-2.5 rounded-lg text-sm font-medium transition-colors',
                      done
                        ? 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        : 'bg-orange-600 hover:bg-orange-700 text-white'
                    )}
                  >
                    {done ? 'Marcar como pendiente' : '✓ Capítulo entendido — siguiente'}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <p className="text-xs text-gray-400 mt-6 text-center">
        ¿Dudas puntuales después? Usa el botón <span className="font-semibold">?</span> abajo a la derecha — responde preguntas en lenguaje normal.
      </p>
    </div>
  )
}
