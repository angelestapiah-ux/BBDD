// ============================================================================
// Normaliza variantes de actividad_nombre a un PROGRAMA CANÓNICO.
// Espejo EXACTO de la función SQL normalizar_actividad()
// (ver migracion-normalizar-actividad.sql). Si cambias una, cambia la otra.
//
// Orden importante: Máster se evalúa ANTES que Practitioner ("Master
// Practitioner" contiene ambas y es el Máster); las personas se evalúan
// antes que "terapia" genérica.
// ============================================================================
export function normalizarActividad(n: string | null | undefined): string | null {
  if (n == null) return null
  const s = n.trim()
  const l = s.toLowerCase()
  if (l.includes('master') || l.includes('máster')) return 'Diplomado Máster'
  if (l.includes('trainer')) return 'Diplomado Trainer'
  if (l.includes('practitioner') || l.includes('prectitioner')) return 'Diplomado Practitioner'
  if (l.includes('fabiola')) return 'Terapia Fabiola'
  if (l.includes('rodolfo')) return 'Terapia Rodolfo'
  if (l.includes('ximena')) return 'Terapia Ximena'
  if (l.includes('nadia')) return 'Terapia Nadia'
  if (l.includes('dayana')) return 'Terapia Dayana'
  if (l.includes('inmobil') || l.includes('taller inm')) return 'Taller Inmobiliario'
  if (l.includes('madre')) return 'Taller de la Madre'
  if (l.includes('actualiz')) return 'Clase Actualización PNL 2026'
  if (l.includes('mujer renova') || l.includes('ciclo anual')) return 'Ciclo Anual Mujer Renova'
  if (l.includes('alumni')) return 'Alumni'
  if (l.includes('programa tu a')) return 'Programa tu año 2026'
  if (l.includes('learning') || l.includes('academia')) return 'Academia E-Learning'
  if (l.includes('terapia')) return 'Terapia (general)'
  return s
}
