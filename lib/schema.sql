-- Schema RENOVA CRM
-- Ejecutar en Supabase SQL Editor

-- Tabla de clientes
create table if not exists clientes (
  id uuid default gen_random_uuid() primary key,
  nombre text not null,
  correo text,
  telefono text,
  comentario text,
  procedencia text,
  cumpleanos date,
  fecha_incorporacion date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Tabla de actividades (catálogo)
create table if not exists actividades (
  id uuid default gen_random_uuid() primary key,
  nombre text not null,
  tipo text check (tipo in ('diplomado_presencial','diplomado_online','taller','coaching','asesoria','otro')) default 'otro',
  descripcion text,
  fecha_inicio date,
  fecha_fin date,
  created_at timestamptz default now()
);

-- Tabla de asistencias (cliente ↔ actividad, texto libre por ahora)
create table if not exists asistencias (
  id uuid default gen_random_uuid() primary key,
  cliente_id uuid references clientes(id) on delete cascade,
  actividad_nombre text not null,
  fecha_asistencia date,
  created_at timestamptz default now()
);

-- Tabla de pagos
create table if not exists pagos (
  id uuid default gen_random_uuid() primary key,
  cliente_id uuid references clientes(id) on delete cascade,
  actividad_nombre text not null,
  monto numeric(10,2),
  fecha_pago date,
  metodo_pago text,
  estado text check (estado in ('pagado','pendiente','parcial')) default 'pendiente',
  notas text,
  created_at timestamptz default now()
);

-- Tabla de seguimientos
create table if not exists seguimientos (
  id uuid default gen_random_uuid() primary key,
  cliente_id uuid references clientes(id) on delete cascade,
  fecha timestamptz not null default now(),
  tipo text check (tipo in ('llamada','whatsapp','correo','visita','otro')) default 'otro',
  notas text not null,
  usuario text,
  created_at timestamptz default now()
);

-- Trigger para updated_at en clientes
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger clientes_updated_at
  before update on clientes
  for each row execute function update_updated_at();

-- Índices para búsquedas frecuentes
create index if not exists clientes_nombre_idx on clientes using gin (to_tsvector('spanish', nombre));
create index if not exists clientes_correo_idx on clientes (correo);
create index if not exists clientes_telefono_idx on clientes (telefono);
create index if not exists asistencias_cliente_idx on asistencias (cliente_id);
create index if not exists pagos_cliente_idx on pagos (cliente_id);
create index if not exists seguimientos_cliente_idx on seguimientos (cliente_id);
