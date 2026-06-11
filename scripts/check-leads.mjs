// Revisa leads y seguimientos recientes de formularios web
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
)
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const hace2dias = new Date(Date.now() - 2 * 86400000).toISOString()

const { data: segs } = await supabase
  .from('seguimientos')
  .select('notas, usuario, created_at, clientes(nombre)')
  .eq('usuario', 'Formulario web')
  .gte('created_at', hace2dias)
  .order('created_at', { ascending: false })

console.log('Seguimientos de formularios web (48h):', segs?.length ?? 0)
for (const s of segs ?? []) console.log(`- [${s.created_at}] ${s.clientes?.nombre}: ${s.notas}`)

const { data: nuevos } = await supabase
  .from('clientes')
  .select('nombre, telefono, procedencia, created_at')
  .gte('created_at', hace2dias)
  .order('created_at', { ascending: false })

console.log('\nClientes creados (48h):', nuevos?.length ?? 0)
for (const c of nuevos ?? []) console.log(`- [${c.created_at}] ${c.nombre} | ${c.telefono} | origen: ${c.procedencia}`)
