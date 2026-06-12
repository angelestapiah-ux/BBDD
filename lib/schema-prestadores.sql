-- Migración: marcas de prestador (docente / terapeuta) en clientes
-- Ejecutar en Supabase SQL Editor

alter table clientes add column if not exists es_docente boolean default false;
alter table clientes add column if not exists es_terapeuta boolean default false;
