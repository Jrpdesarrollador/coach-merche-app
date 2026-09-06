-- ============================================================
-- Coach Merche App — cada plan con entrenamiento crea una clase reservable
--
-- El plan diario sigue gestionando el contenido y las notificaciones, pero
-- desde ahora también mantiene sincronizada la clase que ven las alumnas.
-- ============================================================

alter table public.classes
  add column if not exists daily_plan_id uuid
    references public.daily_plans (id) on delete set null;

create unique index if not exists classes_daily_plan_id_unique_idx
  on public.classes (daily_plan_id)
  where daily_plan_id is not null;

create index if not exists classes_daily_plan_schedule_idx
  on public.classes (date, start_time, daily_plan_id)
  where status = 'scheduled';

-- Las clases creadas desde el plan diario pueden utilizar la fecha y hora que
-- elija Merche. Se conserva el horario fijo para las clases recurrentes base.
create or replace function public.enforce_class_schedule()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_now_madrid timestamp;
begin
  if new.status <> 'scheduled' or new.daily_plan_id is not null then
    return new;
  end if;

  v_now_madrid := now() at time zone 'Europe/Madrid';

  if (new.date + new.start_time) < v_now_madrid then
    return new;
  end if;

  if extract(dow from new.date) not in (2, 4)
     or new.start_time <> '19:00'::time then
    raise exception 'INVALID_CLASS_SCHEDULE' using errcode = '22023';
  end if;

  return new;
end;
$$;

comment on function public.enforce_class_schedule() is
  'Mantiene martes/jueves 19:00 para clases base y permite el horario elegido en planes diarios.';

create or replace function public.sync_daily_plan_bookable_class()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_class_id uuid;
  v_workout_title text;
begin
  if tg_op = 'DELETE' then
    select c.id, w.title
    into v_class_id, v_workout_title
    from public.classes c
    join public.workouts w on w.id = c.workout_id
    where c.daily_plan_id = old.id
    for update of c;

    if v_class_id is not null then
      delete from public.notifications
      where type = 'class_reminder'
        and metadata->>'class_id' = v_class_id::text;

      with cancelled as (
        update public.class_bookings
        set status = 'cancelled'
        where class_id = v_class_id
          and status = 'active'
        returning user_id
      )
      insert into public.notifications (user_id, type, title, body, metadata)
      select
        cancelled.user_id,
        'custom',
        'Clase cancelada',
        coalesce(v_workout_title, 'Entrenamiento')
          || ' · ' || to_char(old.plan_date, 'DD/MM/YYYY')
          || ' a las ' || to_char(old.plan_time, 'HH24:MI') || '.',
        jsonb_build_object('class_id', v_class_id, 'class_date', old.plan_date, 'url', '/clases')
      from cancelled;

      update public.classes
      set status = 'cancelled', daily_plan_id = null
      where id = v_class_id;
    end if;

    return old;
  end if;

  if not new.active or new.workout_id is null then
    select c.id, w.title
    into v_class_id, v_workout_title
    from public.classes c
    join public.workouts w on w.id = c.workout_id
    where c.daily_plan_id = new.id
    for update of c;

    if v_class_id is not null then
      delete from public.notifications
      where type = 'class_reminder'
        and metadata->>'class_id' = v_class_id::text;

      with cancelled as (
        update public.class_bookings
        set status = 'cancelled'
        where class_id = v_class_id
          and status = 'active'
        returning user_id
      )
      insert into public.notifications (user_id, type, title, body, metadata)
      select
        cancelled.user_id,
        'custom',
        'Clase cancelada',
        coalesce(v_workout_title, 'Entrenamiento')
          || ' · ' || to_char(new.plan_date, 'DD/MM/YYYY')
          || ' a las ' || to_char(new.plan_time, 'HH24:MI') || '.',
        jsonb_build_object('class_id', v_class_id, 'class_date', new.plan_date, 'url', '/clases')
      from cancelled;

      update public.classes
      set status = 'cancelled'
      where id = v_class_id;
    end if;

    return new;
  end if;

  -- Mantiene la misma clase al editar el entrenamiento, fecha u hora.
  select c.id
  into v_class_id
  from public.classes c
  where c.daily_plan_id = new.id
  for update;

  -- Si ya existía una clase recurrente en esa franja (incluso cancelada),
  -- se reutiliza para no duplicar la sesión en el calendario.
  if v_class_id is null then
    select c.id
    into v_class_id
    from public.classes c
    where c.date = new.plan_date
      and c.start_time = new.plan_time
      and c.daily_plan_id is null
    order by
      case c.status when 'scheduled' then 0 when 'cancelled' then 1 else 2 end,
      c.created_at
    limit 1
    for update;
  end if;

  if v_class_id is null then
    insert into public.classes (
      workout_id,
      date,
      start_time,
      location,
      capacity,
      status,
      notes,
      created_by,
      daily_plan_id
    )
    values (
      new.workout_id,
      new.plan_date,
      new.plan_time,
      'Box Coach Merche',
      16,
      'scheduled',
      new.note,
      new.created_by,
      new.id
    );
  else
    update public.classes
    set
      workout_id = new.workout_id,
      date = new.plan_date,
      start_time = new.plan_time,
      status = 'scheduled',
      notes = new.note,
      daily_plan_id = new.id
    where id = v_class_id;
  end if;

  return new;
end;
$$;

revoke all on function public.sync_daily_plan_bookable_class() from public;

drop trigger if exists daily_plans_sync_bookable_class on public.daily_plans;
create trigger daily_plans_sync_bookable_class
  after insert or update of plan_date, plan_time, workout_id, note, active
  on public.daily_plans
  for each row execute function public.sync_daily_plan_bookable_class();

drop trigger if exists daily_plans_cancel_bookable_class on public.daily_plans;
create trigger daily_plans_cancel_bookable_class
  before delete on public.daily_plans
  for each row execute function public.sync_daily_plan_bookable_class();

-- Recupera automáticamente los planes que ya estaban creados antes de esta
-- migración, incluidas las clases del 8 y 10 de septiembre.
update public.daily_plans
set plan_time = plan_time
where active
  and workout_id is not null;
