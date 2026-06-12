// Migración acordada con Ángeles (2026-06-13):
// 1. "Paciente Fabiola" → tipo "Terapia Fabiola" (actividad propia, SIN terapeuta: ella no boletea)
// 2. Crear cliente Rodolfo Sánchez (es_terapeuta) y migrar "Paciente Rodolfo" → tipo "Terapias" + terapeuta asignado
// 3. "Paciente" a secas: se deja tal cual
// 4. Asistencias "Programa tu año 20XX" → todas a "Programa tu año 2026" (error de importación) + dedupe
// 5. Normalizar espacios al inicio/fin en nombres de actividad (asistencias y pagos)
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
)
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

async function asegurarAsistencia(clienteId, actividad) {
  const { data } = await supabase.from('asistencias').select('id')
    .eq('cliente_id', clienteId).eq('actividad_nombre', actividad).limit(1)
  if (!data || data.length === 0) {
    await supabase.from('asistencias').insert({ cliente_id: clienteId, actividad_nombre: actividad })
    return true
  }
  return false
}

// ── 1+2+3: migrar tipos huérfanos ────────────────────────────────────────
const { data: clientes } = await supabase.from('clientes').select('id, nombre, tipos_cliente, terapeuta')

// Crear (o encontrar) a Rodolfo Sánchez como cliente terapeuta
let rodolfo = (clientes ?? []).find(c => c.nombre.trim().toLowerCase().startsWith('rodolfo s'))
if (!rodolfo) {
  const { data, error } = await supabase.from('clientes').insert({
    nombre: 'Rodolfo Sánchez',
    es_terapeuta: true,
    comentario: 'Terapeuta — boletea honorarios a Renova. Creado en migración 2026-06-13.',
  }).select('id, nombre').single()
  if (error) { console.error('ERROR creando a Rodolfo:', error.message); process.exit(1) }
  rodolfo = data
  console.log(`✓ Cliente creado: Rodolfo Sánchez (${data.id}) — marcado como terapeuta`)
} else {
  await supabase.from('clientes').update({ es_terapeuta: true }).eq('id', rodolfo.id)
  console.log(`✓ Rodolfo ya existía como "${rodolfo.nombre}" — marcado como terapeuta`)
}

let fab = 0, rod = 0, asisNuevas = 0
for (const c of clientes ?? []) {
  const tipos = c.tipos_cliente ?? []
  let nuevos = null
  let setTerapeuta = false

  if (tipos.includes('Paciente Fabiola')) {
    nuevos = tipos.filter(t => t !== 'Paciente Fabiola')
    if (!nuevos.includes('Terapia Fabiola')) nuevos.push('Terapia Fabiola')
    if (await asegurarAsistencia(c.id, 'Terapia Fabiola')) asisNuevas++
    fab++
  }
  if (tipos.includes('Paciente Rodolfo')) {
    nuevos = (nuevos ?? tipos).filter(t => t !== 'Paciente Rodolfo')
    if (!nuevos.includes('Terapias')) nuevos.push('Terapias')
    if (await asegurarAsistencia(c.id, 'Terapias')) asisNuevas++
    setTerapeuta = true
    rod++
  }

  if (nuevos) {
    const update = { tipos_cliente: nuevos }
    if (setTerapeuta && !c.terapeuta) update.terapeuta = 'Rodolfo Sánchez'
    const { error } = await supabase.from('clientes').update(update).eq('id', c.id)
    if (error) console.error(`  error en ${c.nombre}: ${error.message}`)
  }
}
console.log(`✓ Pacientes Fabiola migrados a tipo "Terapia Fabiola": ${fab}`)
console.log(`✓ Pacientes Rodolfo migrados a "Terapias" + terapeuta Rodolfo Sánchez: ${rod}`)
console.log(`✓ Asistencias creadas en la migración: ${asisNuevas}`)

// ── 4: Programa tu año 20XX → 2026 ──────────────────────────────────────
const { data: programas } = await supabase.from('asistencias')
  .select('id, cliente_id, actividad_nombre')
  .like('actividad_nombre', 'Programa tu año 2%')
const aCorregir = (programas ?? []).filter(a => a.actividad_nombre !== 'Programa tu año 2026')
for (const a of aCorregir) {
  await supabase.from('asistencias').update({ actividad_nombre: 'Programa tu año 2026' }).eq('id', a.id)
}
console.log(`✓ Asistencias "Programa tu año 20XX" corregidas a 2026: ${aCorregir.length}`)

// Dedupe: dejar una sola "Programa tu año 2026" por cliente
const { data: prog26 } = await supabase.from('asistencias')
  .select('id, cliente_id').eq('actividad_nombre', 'Programa tu año 2026').order('created_at')
const vistos = new Set()
let borradas = 0
for (const a of prog26 ?? []) {
  if (vistos.has(a.cliente_id)) {
    await supabase.from('asistencias').delete().eq('id', a.id)
    borradas++
  } else {
    vistos.add(a.cliente_id)
  }
}
console.log(`✓ Duplicados de "Programa tu año 2026" eliminados: ${borradas} (quedó 1 por cliente, ${vistos.size} clientes)`)

// ── 5: normalizar espacios en nombres de actividad ──────────────────────
for (const tabla of ['asistencias', 'pagos']) {
  const { data: filas } = await supabase.from(tabla).select('id, actividad_nombre')
  let corregidas = 0
  for (const f of filas ?? []) {
    const limpio = (f.actividad_nombre || '').replace(/\s+/g, ' ').trim()
    if (limpio && limpio !== f.actividad_nombre) {
      await supabase.from(tabla).update({ actividad_nombre: limpio }).eq('id', f.id)
      corregidas++
    }
  }
  console.log(`✓ Nombres de actividad normalizados en ${tabla}: ${corregidas}`)
}

console.log('\n═══ MIGRACIÓN COMPLETA ═══')
