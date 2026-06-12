import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
)
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

// Caso 1: como lo envía el formulario sin tocar fechas (strings vacíos)
const r1 = await supabase.from('actividades').insert({
  nombre: 'PRUEBA HOMERO borrar', tipo: 'otro', descripcion: '', fecha_inicio: '', fecha_fin: '',
}).select().single()
console.log('Caso fechas vacías "":', r1.error ? `ERROR → ${r1.error.message}` : 'OK')
if (r1.data) await supabase.from('actividades').delete().eq('id', r1.data.id)

// Caso 2: con null
const r2 = await supabase.from('actividades').insert({
  nombre: 'PRUEBA HOMERO 2 borrar', tipo: 'otro', descripcion: null, fecha_inicio: null, fecha_fin: null,
}).select().single()
console.log('Caso fechas null:', r2.error ? `ERROR → ${r2.error.message}` : 'OK')
if (r2.data) await supabase.from('actividades').delete().eq('id', r2.data.id)
