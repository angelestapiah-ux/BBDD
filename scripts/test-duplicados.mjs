// Prueba la lógica de duplicados contra datos reales
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
)

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const { data, error } = await supabase
  .from('clientes')
  .select('id, nombre, telefono, correo')
  .not('telefono', 'is', null)
  .neq('telefono', '')
  .limit(5)

if (error) { console.error('ERROR:', error.message); process.exit(1) }
console.log('Muestra de clientes con teléfono:')
for (const c of data) console.log(`- ${c.nombre} | tel: "${c.telefono}" | correo: "${c.correo}"`)
