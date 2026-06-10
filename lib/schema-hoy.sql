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

-- Plantillas iniciales
insert into plantillas_whatsapp (nombre, cuerpo, orden) values
  ('Primer contacto', 'Hola {nombre}! 😊 Te escribo de Renova. Vi que te interesa {actividad}. ¿Te cuento los detalles?', 1),
  ('Seguimiento de interés', 'Hola {nombre}! ¿Cómo estás? Quería saber si pudiste revisar la información de {actividad} que te envié. Quedo atenta a tus dudas 🙌', 2),
  ('Recordatorio de pago', 'Hola {nombre}! Te recuerdo que tienes pendiente el pago de {actividad}. ¿Necesitas que te reenvíe los datos de transferencia?', 3),
  ('Invitación a taller', 'Hola {nombre}! 🌟 Tenemos un nuevo taller que creo que te puede encantar. ¿Te envío la información?', 4)
on conflict do nothing;
