-- Migración: historial de cambios de etapa del funnel
-- Ejecutar en Supabase SQL Editor (elegir "Run and enable RLS" si pregunta)

create table if not exists etapa_historial (
  id uuid default gen_random_uuid() primary key,
  cliente_id uuid references clientes(id) on delete cascade,
  etapa_anterior text,
  etapa_nueva text not null,
  created_at timestamptz default now()
);

create index if not exists etapa_historial_cliente_idx on etapa_historial (cliente_id);
