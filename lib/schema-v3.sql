-- Migración v3: facturación en pagos, boletas de honorarios y gastos empresa
-- Ejecutar en Supabase SQL Editor (elegir "Run and enable RLS" si pregunta)

-- 1) Pagos: fecha de la actividad (distinta a la fecha de pago) + facturación
alter table pagos add column if not exists fecha_actividad date;
alter table pagos add column if not exists numero_factura text;
alter table pagos add column if not exists factura_interna text;

-- 2) Boletas de honorarios (docentes y terapeutas que boletean a Renova)
create table if not exists boletas_honorarios (
  id uuid default gen_random_uuid() primary key,
  prestador text not null,
  origen text check (origen in ('terapia','clases','manual')) default 'manual',
  glosa text not null,
  paciente_nombre text,
  pago_id uuid references pagos(id) on delete set null,
  monto_liquido numeric(12,2),
  retencion numeric(12,2),
  monto_bruto numeric(12,2),
  numero_boleta text,
  fecha date default now(),
  estado text check (estado in ('pendiente','emitida')) default 'pendiente',
  notas text,
  created_at timestamptz default now()
);
create index if not exists boletas_prestador_idx on boletas_honorarios (prestador);
create index if not exists boletas_estado_idx on boletas_honorarios (estado);

-- 3) Gastos varios de la empresa (réplica del Excel "Gastos Varios Renova")
create table if not exists gastos (
  id uuid default gen_random_uuid() primary key,
  fecha date not null,
  categoria text,
  descripcion text not null,
  tienda text,
  tipo_pago text,
  documento text check (documento in ('boleta','factura','otro')) default 'boleta',
  numero_documento text,
  monto numeric(12,2) not null,
  notas text,
  created_at timestamptz default now()
);
create index if not exists gastos_fecha_idx on gastos (fecha desc);

-- 4) Arriendo de sala/box (réplica del Excel "Arriendo sala")
create table if not exists arriendos_sala (
  id uuid default gen_random_uuid() primary key,
  profesional text not null,
  motivo text,
  fecha_sesion date,
  forma_pago text,
  fecha_pago date,
  monto numeric(12,2) not null,
  numero_factura text,
  notas text,
  created_at timestamptz default now()
);
create index if not exists arriendos_fecha_idx on arriendos_sala (fecha_sesion desc);
