-- Migración: registro de auditoría (quién hizo qué y cuándo)
-- Ejecutar en Supabase SQL Editor (elegir "Run and enable RLS" si pregunta)

create table if not exists auditoria (
  id uuid default gen_random_uuid() primary key,
  usuario text not null,
  accion text not null,        -- crear | editar | eliminar | exportar | importar | etc.
  tabla text not null,         -- clientes | pagos | seguimientos | ...
  registro_id text,
  detalle text,
  created_at timestamptz default now()
);

create index if not exists auditoria_created_idx on auditoria (created_at desc);
create index if not exists auditoria_usuario_idx on auditoria (usuario);
