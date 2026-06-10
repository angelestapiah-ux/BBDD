-- Migración: perfiles de usuario (roles y permisos)
-- Ejecutar en Supabase SQL Editor (elegir "Run and enable RLS" si pregunta)

create table if not exists perfiles_usuario (
  user_id uuid primary key,
  rol text not null default 'operacion' check (rol in ('admin','operacion','visor')),
  permisos_extra jsonb not null default '[]',
  updated_at timestamptz default now()
);

-- IMPORTANTE: todos los usuarios EXISTENTES quedan como admin
-- (son el equipo de confianza actual; los usuarios nuevos entran como "operacion")
insert into perfiles_usuario (user_id, rol)
select id, 'admin' from auth.users
on conflict (user_id) do nothing;
