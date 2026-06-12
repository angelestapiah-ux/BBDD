import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
)
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const { data: cliente } = await supabase.from('clientes').select('id').limit(1).single()

// Tal como lo envía el formulario con fecha de actividad vacía
const r = await supabase.from('pagos').insert({
  cliente_id: cliente.id,
  actividad_nombre: 'PRUEBA HOMERO borrar',
  monto: '55000',
  fecha_pago: '2026-06-12',
  fecha_actividad: '',
  metodo_pago: 'webpay',
  estado: 'pagado',
  notas: '',
  requiere_factura: false,
  numero_factura: '',
  factura_interna: '',
}).select().single()
console.log('Como el formulario:', r.error ? `ERROR → ${r.error.message}` : 'OK')
if (r.data) {
  await supabase.from('asistencias').delete().eq('cliente_id', cliente.id).eq('actividad_nombre', 'PRUEBA HOMERO borrar')
  await supabase.from('pagos').delete().eq('id', r.data.id)
}
