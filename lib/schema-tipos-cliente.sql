-- Catálogo de tipos de cliente (configurable)
create table if not exists tipos_cliente (
  id uuid default gen_random_uuid() primary key,
  nombre text not null unique,
  orden int default 0,
  created_at timestamptz default now()
);

-- Tipos predefinidos
insert into tipos_cliente (nombre, orden) values
  ('Paciente', 1),
  ('Alumno/a Diplomado Practitioner', 2),
  ('Alumno/a Master', 3),
  ('Asistente a Talleres', 4),
  ('Paciente Fabiola', 5),
  ('Paciente Rodolfo', 6)
on conflict (nombre) do nothing;

-- Columna en clientes para guardar múltiples tipos seleccionados
alter table clientes add column if not exists tipos_cliente text[] default '{}';
