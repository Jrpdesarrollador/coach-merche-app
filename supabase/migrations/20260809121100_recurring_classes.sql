-- ============================================================
-- Coach Merche App — Clases recurrentes automáticas
--
-- Genera clases programadas cada martes y jueves a las 19:00
-- (horario Europe/Madrid):
--   · Martes  → Full Body
--   · Jueves  → EMOM Táctico
--
-- Idempotente: no duplica si ya existe una clase el mismo día,
-- hora y entrenamiento. Ejecutar periódicamente para extender
-- la ventana futura (p. ej. semanalmente desde el SQL Editor):
--
--   select public.ensure_recurring_classes(12);
--
-- pg_cron no está habilitado en este proyecto; la función se
-- invoca al aplicar migraciones y manualmente cuando haga falta.
-- ============================================================

-- ------------------------------------------------------------
-- ensure_recurring_classes
--
-- Crea workouts base si no existen y programa clases futuras.
-- Devuelve el número de filas insertadas en esta ejecución.
-- ------------------------------------------------------------
create or replace function public.ensure_recurring_classes(
  p_weeks_ahead integer default 12
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date;
  v_end date;
  v_now_madrid timestamp;
  v_full_body_id uuid;
  v_emom_id uuid;
  v_inserted integer := 0;
  v_batch integer;
  v_location constant text := 'Box Coach Merche';
  v_capacity constant integer := 16;
  v_start_time constant time := '19:00'::time;
begin
  if p_weeks_ahead is null or p_weeks_ahead < 1 or p_weeks_ahead > 52 then
    raise exception 'INVALID_WEEKS_AHEAD' using errcode = '22023';
  end if;

  v_now_madrid := now() at time zone 'Europe/Madrid';
  v_today := v_now_madrid::date;
  v_end := v_today + (p_weeks_ahead * 7);

  -- Workout: Full Body
  select w.id into v_full_body_id
  from public.workouts w
  where lower(trim(w.title)) = 'full body'
    and w.active
  order by w.created_at
  limit 1;

  if v_full_body_id is null then
    insert into public.workouts (
      title, description, poster_url, difficulty, duration_minutes, category, active
    )
    values (
      'Full Body',
      'Sesión completa de fuerza y acondicionamiento.',
      '/assets/workouts/full-body.png',
      'media',
      45,
      'Fuerza',
      true
    )
    returning id into v_full_body_id;
  end if;

  -- Workout: EMOM Táctico
  select w.id into v_emom_id
  from public.workouts w
  where lower(trim(w.title)) in ('emom táctico', 'emom tactico')
    and w.active
  order by w.created_at
  limit 1;

  if v_emom_id is null then
    insert into public.workouts (
      title, description, poster_url, difficulty, duration_minutes, category, active
    )
    values (
      'EMOM Táctico',
      'Entrenamiento por intervalos con enfoque metabólico.',
      '/assets/workouts/emom-tactico.png',
      'alta',
      30,
      'Metcon',
      true
    )
    returning id into v_emom_id;
  end if;

  -- Martes (dow = 2) → Full Body
  insert into public.classes (workout_id, date, start_time, location, capacity, status)
  select
    v_full_body_id,
    d::date,
    v_start_time,
    v_location,
    v_capacity,
    'scheduled'
  from generate_series(v_today, v_end, interval '1 day') as d
  where extract(dow from d::date) = 2
    and (d::date + v_start_time) >= v_now_madrid
    and not exists (
      select 1
      from public.classes c
      join public.workouts w on w.id = c.workout_id
      where c.date = d::date
        and c.start_time = v_start_time
        and lower(trim(w.title)) = 'full body'
    );

  get diagnostics v_batch = row_count;
  v_inserted := v_inserted + v_batch;

  -- Jueves (dow = 4) → EMOM Táctico
  insert into public.classes (workout_id, date, start_time, location, capacity, status)
  select
    v_emom_id,
    d::date,
    v_start_time,
    v_location,
    v_capacity,
    'scheduled'
  from generate_series(v_today, v_end, interval '1 day') as d
  where extract(dow from d::date) = 4
    and (d::date + v_start_time) >= v_now_madrid
    and not exists (
      select 1
      from public.classes c
      join public.workouts w on w.id = c.workout_id
      where c.date = d::date
        and c.start_time = v_start_time
        and lower(trim(w.title)) in ('emom táctico', 'emom tactico')
    );

  get diagnostics v_batch = row_count;
  v_inserted := v_inserted + v_batch;

  return v_inserted;
end;
$$;

revoke all on function public.ensure_recurring_classes(integer) from public;
grant execute on function public.ensure_recurring_classes(integer) to service_role;

comment on function public.ensure_recurring_classes(integer) is
  'Programa clases recurrentes: martes 19:00 Full Body, jueves 19:00 EMOM Táctico (Europe/Madrid). Idempotente.';

-- Poblar la ventana inicial al aplicar la migración.
select public.ensure_recurring_classes(12);
