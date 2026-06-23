// ============================================================================
// Clasifica un valor crudo del campo "tipo de cliente" en:
//   - tipo: la categoría canónica de cliente (Paciente, Alumni, ...)
//   - actividad: si el valor en realidad describe una actividad/programa,
//                su nombre canónico (para registrarlo como asistencia).
// Se usa en la importación de Excel y como referencia de la migración SQL.
// Orden: se evalúan primero los TIPOS puros; luego actividad + tipo implícito.
// ============================================================================
import { normalizarActividad } from './normalizar-actividad'

// Categorías oficiales de tipo de cliente (taxonomía acordada 2026-06-23)
export const TIPOS_CLIENTE = [
  'Paciente',
  'Alumni',
  'Asistente a talleres',
  'Prospecto',
  'Empresa/B2B',
] as const

function strip(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

export function clasificarTipo(raw: string): { tipo?: string; actividad?: string } {
  const v = (raw || '').trim()
  if (!v) return {}
  const l = strip(v)

  // 1) Tipos puros (sin actividad asociada)
  if (l === 'alumni') return { tipo: 'Alumni' }
  if (l === 'paciente' || l.startsWith('paciente ')) return { tipo: 'Paciente' }
  if (l.includes('asistente') && l.includes('taller')) return { tipo: 'Asistente a talleres' }
  if (l.includes('empresa') || l === 'b2b' || l.includes('corporativ')) return { tipo: 'Empresa/B2B' }
  if (l.includes('prospecto') || l.includes('lead')) return { tipo: 'Prospecto' }

  // 2) Actividad + tipo implícito (máster antes que practitioner)
  if (l.includes('master')) return { actividad: 'Diplomado Máster', tipo: 'Alumni' }
  if (l.includes('practitioner') || l.includes('prectitioner'))
    return { actividad: 'Diplomado Practitioner', tipo: 'Alumni' }
  if (l.includes('trainer')) return { actividad: 'Diplomado Trainer', tipo: 'Alumni' }
  if (l.includes('actualiz') || l.includes('clase'))
    return { actividad: 'Clase Actualización PNL 2026', tipo: 'Alumni' }
  if (l.includes('academia') || l.includes('learning'))
    return { actividad: 'Academia E-Learning', tipo: 'Alumni' }
  if (l.includes('mujer renova') || l.includes('ciclo anual'))
    return { actividad: 'Ciclo Anual Mujer Renova', tipo: 'Alumni' }
  if (l.includes('taller') || l.includes('workshop') || l.includes('inmobil'))
    return { actividad: normalizarActividad(v) || 'Taller', tipo: 'Asistente a talleres' }
  if (l.includes('terapia') || l.includes('fabiola') || l.includes('rodolfo') ||
      l.includes('ximena') || l.includes('nadia') || l.includes('dayana'))
    return { actividad: normalizarActividad(v) || 'Terapia (general)', tipo: 'Paciente' }
  if (l.includes('alumno') || l.includes('alumna')) return { tipo: 'Alumni' }

  // 3) Desconocido: lo dejamos como tipo tal cual (no perder info)
  return { tipo: v }
}
