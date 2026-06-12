// Revisa consistencia tras borrar actividades del catálogo:
// qué quedó, y qué tipos/asistencias/pagos referencian actividades que ya no existen.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
)
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const { data: actividades } = await supabase.from('actividades').select('nombre').order('nombre')
const catalogo = new Set((actividades ?? []).map(a => a.nombre))
console.log('═ Catálogo actual de actividades:')
for (const a of catalogo) console.log(`  - ${a}`)

const { data: clientes } = await supabase.from('clientes').select('id, nombre, tipos_cliente').not('tipos_cliente', 'is', null)
const tiposHuerfanos = new Map()
for (const c of clientes ?? []) {
  for (const t of c.tipos_cliente ?? []) {
    if (!catalogo.has(t)) {
      if (!tiposHuerfanos.has(t)) tiposHuerfanos.set(t, [])
      tiposHuerfanos.get(t).push(c.nombre)
    }
  }
}
console.log(`\n═ Tipos de cliente que ya no existen en el catálogo: ${tiposHuerfanos.size}`)
for (const [t, quienes] of tiposHuerfanos) {
  console.log(`  - "${t}" → ${quienes.length} cliente(s)${quienes.length <= 5 ? ': ' + quienes.join(', ') : ' (ej: ' + quienes.slice(0, 3).join(', ') + '...)'}`)
}

const { data: asis } = await supabase.from('asistencias').select('actividad_nombre')
const asisHuerfanas = new Map()
for (const a of asis ?? []) {
  if (!catalogo.has(a.actividad_nombre)) asisHuerfanas.set(a.actividad_nombre, (asisHuerfanas.get(a.actividad_nombre) || 0) + 1)
}
console.log(`\n═ Asistencias con actividad fuera del catálogo (histórico, OK): ${asisHuerfanas.size} nombres`)
for (const [n, count] of asisHuerfanas) console.log(`  - "${n}": ${count} asistencia(s)`)

const { data: pagos } = await supabase.from('pagos').select('actividad_nombre')
const pagosHuerfanos = new Map()
for (const p of pagos ?? []) {
  if (!catalogo.has(p.actividad_nombre)) pagosHuerfanos.set(p.actividad_nombre, (pagosHuerfanos.get(p.actividad_nombre) || 0) + 1)
}
console.log(`\n═ Pagos con actividad fuera del catálogo (histórico, OK): ${pagosHuerfanos.size} nombres`)
for (const [n, count] of pagosHuerfanos) console.log(`  - "${n}": ${count} pago(s)`)
