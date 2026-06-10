// Actualiza las plantillas de WhatsApp con redacción basada en PNL.
// Uso: node scripts/update-plantillas.mjs  (lee .env.local)
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
)

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const PLANTILLAS = [
  {
    nombre: 'Primer contacto',
    cuerpo: 'Hola {nombre}! 😊 Soy del equipo de Renova. Vi tu interés en {actividad} y quiero que tengas toda la información para decidir con calma. Cuando conozcas cómo funciona, vas a entender por qué tantas personas nos dicen que les cambió la forma de ver las cosas. ¿Prefieres que te cuente los detalles por aquí o coordinamos una llamada corta?',
    orden: 1,
  },
  {
    nombre: 'Seguimiento de interés',
    cuerpo: 'Hola {nombre}! ¿Cómo estás? 🙌 Me quedé pensando en tu interés por {actividad}. Imagínate por un momento cómo sería aplicar estas herramientas en tu vida y en tu trabajo... ese primer paso es más simple de lo que parece. Para avanzar con tu decisión, ¿qué te gustaría resolver primero: contenidos, fechas o formas de pago?',
    orden: 2,
  },
  {
    nombre: 'Recordatorio de pago',
    cuerpo: 'Hola {nombre}! 😊 Te escribo para asegurar tu lugar en {actividad}: solo falta completar el pago y quedas oficialmente dentro del grupo. ¿Te reenvío los datos de transferencia o prefieres que te mande un link de pago?',
    orden: 3,
  },
  {
    nombre: 'Invitación a taller',
    cuerpo: 'Hola {nombre}! 🌟 Se viene algo nuevo que pensé especialmente para personas como tú, que ya saben lo que se vive en Renova. Antes de abrir los cupos a todo el mundo, quería contártelo a ti primero. ¿Te envío la información?',
    orden: 4,
  },
  {
    nombre: 'Reactivar contacto',
    cuerpo: 'Hola {nombre}! Tanto tiempo 😊 Hace un tiempo conversamos sobre {actividad} y quizás en ese momento no era el momento adecuado... y a veces el momento correcto llega después. Si hoy estás en otra etapa, me encantaría retomar la conversación. ¿Cómo has estado?',
    orden: 5,
  },
  {
    nombre: 'Post-cotización',
    cuerpo: 'Hola {nombre}! 😊 Quería saber qué te pareció la propuesta de {actividad}. Quienes ya se decidieron me cuentan que lo que más valoran es el acompañamiento durante todo el proceso, y eso mismo quiero asegurar contigo. ¿Avanzamos con tu inscripción o resolvemos primero alguna duda?',
    orden: 6,
  },
]

for (const p of PLANTILLAS) {
  const { data: existente } = await supabase
    .from('plantillas_whatsapp')
    .select('id')
    .eq('nombre', p.nombre)
    .maybeSingle()

  if (existente) {
    const { error } = await supabase.from('plantillas_whatsapp').update({ cuerpo: p.cuerpo, orden: p.orden }).eq('id', existente.id)
    if (error) throw error
    console.log(`actualizada: ${p.nombre}`)
  } else {
    const { error } = await supabase.from('plantillas_whatsapp').insert(p)
    if (error) throw error
    console.log(`creada: ${p.nombre}`)
  }
}

const { data } = await supabase.from('plantillas_whatsapp').select('nombre, orden').order('orden')
console.log('\nPlantillas finales:', data.map(p => p.nombre).join(' | '))
