-- ============================================================
-- Coach Merche App — Clases de demo (OPCIONAL)
--
-- Script independiente del seed principal. NO se ejecuta en
-- db:push:seed. Úsalo manualmente en el SQL Editor de Supabase
-- para probar el calendario con 2-3 clases futuras.
--
-- Requisitos previos:
--   - Al menos un workout activo en public.workouts
--   - Un perfil admin (created_by) opcional
--
-- Ajusta las fechas relativas a «hoy» y los workout_id si hace falta.
-- ============================================================

-- Ejemplo: insertar workouts de demo si no existen
insert into public.workouts (title, description, poster_url, difficulty, duration_minutes, category, active)
values
  (
    'Full Body',
    'Sesión completa de fuerza y acondicionamiento.',
    '/assets/workouts/full-body.png',
    'media',
    45,
    'Fuerza',
    true
  ),
  (
    'EMOM Táctico',
    'Entrenamiento por intervalos con enfoque metabólico.',
    '/assets/workouts/emom-tactico.png',
    'alta',
    30,
    'Metcon',
    true
  )
on conflict do nothing;

-- Clases programadas para la semana que viene (fechas relativas)
with demo_workouts as (
  select id, title, row_number() over (order by created_at) as rn
  from public.workouts
  where active = true
  limit 2
)
insert into public.classes (workout_id, date, start_time, location, capacity, status)
select
  w.id,
  (current_date + (1 + (w.rn % 5))::int)::date,
  case w.rn when 1 then '10:00'::time else '20:00'::time end,
  'Box Coach Merche',
  case w.rn when 1 then 12 else 8 end,
  'scheduled'
from demo_workouts w;

-- Tercera clase: fin de semana
insert into public.classes (workout_id, date, start_time, location, capacity, status)
select
  id,
  (current_date + 6)::date,
  '11:30'::time,
  'Box Coach Merche',
  10,
  'scheduled'
from public.workouts
where active = true
order by created_at
limit 1;
