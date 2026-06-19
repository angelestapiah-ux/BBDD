-- ════════════════════════════════════════════════════════════════════
--  Cobranza por cuotas — tarea diaria que marca cuotas vencidas
--  Pegar y ejecutar UNA VEZ en Supabase → SQL Editor.
--  (Si pg_cron aún no está activo, actívalo en Database → Extensions, o
--   esta misma sentencia "create extension" lo habilita.)
-- ════════════════════════════════════════════════════════════════════

create extension if not exists pg_cron;

-- Quita el job previo si existe (para poder re-ejecutar este script sin avance)
do $$
begin
  perform cron.unschedule('marcar-cuotas-vencidas-diario');
exception when others then
  null;
end $$;

-- Programa marcar_cuotas_vencidas() todos los días a las 09:00 UTC
-- (aprox. 05:00–06:00 en Chile según horario de verano/invierno).
select cron.schedule(
  'marcar-cuotas-vencidas-diario',
  '0 9 * * *',
  $$ select marcar_cuotas_vencidas(); $$
);

-- Verás el job activo con:
--   select jobname, schedule, active from cron.job;
