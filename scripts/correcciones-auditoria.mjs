// Correcciones seguras post-auditoría:
// 1. Dedupe de asistencias (mismo cliente + actividad → queda la más antigua)
// 2. Marcar es_terapeuta a clientes que ya figuran como terapeuta de pacientes
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
)
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

// 1. Dedupe asistencias
const { data: asis } = await supabase.from('asistencias').select('id, cliente_id, actividad_nombre, created_at').order('created_at')
const vistos = new Set()
let borradas = 0
for (const a of asis ?? []) {
  const k = `${a.cliente_id}|${a.actividad_nombre}`
  if (vistos.has(k)) {
    await supabase.from('asistencias').delete().eq('id', a.id)
    borradas++
  } else {
    vistos.add(k)
  }
}
console.log(`✓ Asistencias duplicadas eliminadas: ${borradas}`)

// 2. Marcar terapeutas que existen como clientes
const { data: clientes } = await supabase.from('clientes').select('id, nombre, terapeuta, es_terapeuta')
const asignados = new Set((clientes ?? []).filter(c => c.terapeuta).map(c => c.terapeuta.trim().toLowerCase()))
for (const c of clientes ?? []) {
  if (!c.es_terapeuta && asignados.has(c.nombre.trim().toLowerCase())) {
    await supabase.from('clientes').update({ es_terapeuta: true }).eq('id', c.id)
    console.log(`✓ Marcado como terapeuta: ${c.nombre}`)
  }
}

// Reportar terapeutas asignados que NO existen como clientes
const nombresClientes = new Set((clientes ?? []).map(c => c.nombre.trim().toLowerCase()))
const faltantes = [...new Set((clientes ?? []).filter(c => c.terapeuta).map(c => c.terapeuta.trim()))]
  .filter(t => !nombresClientes.has(t.toLowerCase()))
console.log(`\nTerapeutas asignados que NO existen como clientes: ${faltantes.length ? faltantes.join(', ') : 'ninguno'}`)
