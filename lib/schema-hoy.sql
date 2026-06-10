-- Migración: vista "Hoy" + plantillas de WhatsApp
-- Ejecutar en Supabase SQL Editor

-- Campo de próximo contacto en clientes
alter table clientes add column if not exists proximo_contacto date;
create index if not exists clientes_proximo_contacto_idx on clientes (proximo_contacto);

-- Plantillas de mensajes WhatsApp con variables {nombre}, {actividad}
create table if not exists plantillas_whatsapp (
  id uuid default gen_random_uuid() primary key,
  nombre text not null,
  cuerpo text not null,
  orden int default 0,
  created_at timestamptz default now()
);

-- Plantillas iniciales (redacción con técnicas de PNL — ver scripts/update-plantillas.mjs)
insert into plantillas_whatsapp (nombre, cuerpo, orden) values
  ('Primer contacto', 'Hola {nombre}! 😊 Soy del equipo de Renova. Vi tu interés en {actividad} y quiero que tengas toda la información para decidir con calma. Cuando conozcas cómo funciona, vas a entender por qué tantas personas nos dicen que les cambió la forma de ver las cosas. ¿Prefieres que te cuente los detalles por aquí o coordinamos una llamada corta?', 1),
  ('Seguimiento de interés', 'Hola {nombre}! ¿Cómo estás? 🙌 Me quedé pensando en tu interés por {actividad}. Imagínate por un momento cómo sería aplicar estas herramientas en tu vida y en tu trabajo... ese primer paso es más simple de lo que parece. Para avanzar con tu decisión, ¿qué te gustaría resolver primero: contenidos, fechas o formas de pago?', 2),
  ('Recordatorio de pago', 'Hola {nombre}! 😊 Te escribo para asegurar tu lugar en {actividad}: solo falta completar el pago y quedas oficialmente dentro del grupo. ¿Te reenvío los datos de transferencia o prefieres que te mande un link de pago?', 3),
  ('Invitación a taller', 'Hola {nombre}! 🌟 Se viene algo nuevo que pensé especialmente para personas como tú, que ya saben lo que se vive en Renova. Antes de abrir los cupos a todo el mundo, quería contártelo a ti primero. ¿Te envío la información?', 4),
  ('Reactivar contacto', 'Hola {nombre}! Tanto tiempo 😊 Hace un tiempo conversamos sobre {actividad} y quizás en ese momento no era el momento adecuado... y a veces el momento correcto llega después. Si hoy estás en otra etapa, me encantaría retomar la conversación. ¿Cómo has estado?', 5),
  ('Post-cotización', 'Hola {nombre}! 😊 Quería saber qué te pareció la propuesta de {actividad}. Quienes ya se decidieron me cuentan que lo que más valoran es el acompañamiento durante todo el proceso, y eso mismo quiero asegurar contigo. ¿Avanzamos con tu inscripción o resolvemos primero alguna duda?', 6)
on conflict do nothing;
