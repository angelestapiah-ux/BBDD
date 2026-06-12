// Auditoría general de consistencia de datos del CRM
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
)
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const problemas = []
const ok = []

// 1. Tipos de cliente huérfanos (fuera del catálogo de actividades)
const { data: actividades } = await supabase.from('actividades').select('nombre')
const catalogo = new Set((actividades ?? []).map(a => a.nombre))
const { data: clientes } = await supabase.from('clientes').select('id, nombre, tipos_cliente, terapeuta, telefono, correo, es_terapeuta')
const huerfanos = new Map()
for (const c of clientes ?? []) {
  for (const t of c.tipos_cliente ?? []) {
    if (!catalogo.has(t)) huerfanos.set(t, (huerfanos.get(t) || 0) + 1)
  }
}
if (huerfanos.size) problemas.push(`Tipos huérfanos: ${[...huerfanos].map(([t, n]) => `"${t}"(${n})`).join(', ')}`)
else ok.push('Todos los tipos de cliente existen en el catálogo')

// 2. Pagos "pagado" sin monto (y sin ser sin_cobro)
const { data: pagosMal } = await supabase.from('pagos')
  .select('id, actividad_nombre, metodo_pago, clientes(nombre)')
  .eq('estado', 'pagado').or('monto.is.null,monto.eq.0')
const pagadosSinMonto = (pagosMal ?? []).filter(p => p.metodo_pago !== 'sin_cobro')
if (pagadosSinMonto.length) problemas.push(`Pagos "pagado" sin monto: ${pagadosSinMonto.length} (ej: ${pagadosSinMonto.slice(0, 3).map(p => `${p.clientes?.nombre} · ${p.actividad_nombre}`).join(' | ')})`)
else ok.push('Ningún pago "pagado" sin monto (excluyendo sin cobro)')

// 3. Teléfonos duplicados entre clientes
const porTel = new Map()
for (const c of clientes ?? []) {
  const d = (c.telefono || '').replace(/\D/g, '')
  const key = d.length >= 8 ? d.slice(-8) : null
  if (!key) continue
  if (!porTel.has(key)) porTel.set(key, [])
  porTel.get(key).push(c.nombre)
}
const dupTel = [...porTel.values()].filter(v => v.length > 1)
if (dupTel.length) problemas.push(`Teléfonos compartidos por 2+ clientes: ${dupTel.length} casos (ej: ${dupTel.slice(0, 3).map(g => g.join(' / ')).join(' · ')})`)
else ok.push('Sin teléfonos duplicados')

// 4. Asistencias duplicadas (mismo cliente + misma actividad)
const { data: asis } = await supabase.from('asistencias').select('cliente_id, actividad_nombre')
const asisKey = new Map()
for (const a of asis ?? []) {
  const k = `${a.cliente_id}|${a.actividad_nombre}`
  asisKey.set(k, (asisKey.get(k) || 0) + 1)
}
const asisDup = [...asisKey.values()].filter(v => v > 1).length
if (asisDup) problemas.push(`Asistencias duplicadas (cliente+actividad): ${asisDup} pares`)
else ok.push('Sin asistencias duplicadas')

// 5. Pacientes con terapeuta no registrado como cliente terapeuta
const terapeutasMarcados = new Set((clientes ?? []).filter(c => c.es_terapeuta).map(c => c.nombre.trim().toLowerCase()))
const terapeutasAsignados = new Set((clientes ?? []).filter(c => c.terapeuta).map(c => c.terapeuta.trim()))
const noRegistrados = [...terapeutasAsignados].filter(t => !terapeutasMarcados.has(t.toLowerCase()))
if (noRegistrados.length) problemas.push(`Terapeutas asignados a pacientes pero NO marcados como terapeuta: ${noRegistrados.join(', ')}`)
else ok.push('Todos los terapeutas asignados están registrados y marcados')

// 6. Boletas pendientes muy antiguas (30+ días)
const { data: boletas } = await supabase.from('boletas_honorarios').select('prestador, fecha, estado')
const antiguas = (boletas ?? []).filter(b => b.estado === 'pendiente' && b.fecha && (Date.now() - new Date(b.fecha).getTime()) > 30 * 86400000)
if (antiguas.length) problemas.push(`Boletas pendientes con 30+ días: ${antiguas.length}`)
else ok.push('Sin boletas pendientes antiguas')

// 7. Nombres de actividad con espacios raros (residuales)
const { data: asisRaras } = await supabase.from('asistencias').select('actividad_nombre')
const raras = new Set((asisRaras ?? []).map(a => a.actividad_nombre).filter(n => n !== n.replace(/\s+/g, ' ').trim()))
if (raras.size) problemas.push(`Nombres de actividad con espacios sin normalizar: ${raras.size}`)
else ok.push('Nombres de actividad normalizados')

// 8. Clientes sin ningún dato de contacto
const sinContacto = (clientes ?? []).filter(c => !c.telefono && !c.correo)
if (sinContacto.length) problemas.push(`Clientes sin teléfono NI correo: ${sinContacto.length} (no se pueden contactar)`)
else ok.push('Todos los clientes tienen algún dato de contacto')

console.log('═══ AUDITORÍA DE DATOS ═══\n')
console.log(`✅ Correcto (${ok.length}):`)
for (const o of ok) console.log(`  ✓ ${o}`)
console.log(`\n⚠️ Hallazgos (${problemas.length}):`)
for (const p of problemas) console.log(`  ! ${p}`)
