-- ============================================================
-- Coach Merche App — entrenamientos en imagen, hora y calendario
-- ============================================================

alter table public.workouts
  add column if not exists media_type text not null default 'image',
  add column if not exists image_path text;

update public.workouts
set media_type = case
  when video_path is not null or video_url is not null then 'video'
  else 'image'
end;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'workouts_media_type_check'
      and conrelid = 'public.workouts'::regclass
  ) then
    alter table public.workouts
      add constraint workouts_media_type_check
      check (media_type in ('image', 'video'));
  end if;
end;
$$;

alter table public.daily_plans
  add column if not exists plan_time time not null default '19:00';

create index if not exists daily_plans_calendar_idx
  on public.daily_plans (plan_date, plan_time)
  where active;

-- Los planes futuros deben ser visibles para que aparezcan en el calendario.
drop policy if exists "daily_plans_select" on public.daily_plans;
create policy "daily_plans_select"
  on public.daily_plans for select
  to authenticated
  using (
    public.is_admin()
    or (active and public.is_approved_member())
  );

-- Imágenes de entrenamiento de hasta 10 MB en el bucket público ya existente.
update storage.buckets
set
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'workouts';

-- Amplía los tipos de aviso con la planificación de entrenamiento.
alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (
    type in (
      'class_reminder',
      'new_workout',
      'new_class',
      'custom',
      'booking_confirmed',
      'new_post',
      'training_scheduled'
    )
  );

create or replace function public.notify_daily_plan_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_workout_title text;
  v_body text;
  v_url text;
begin
  if tg_op = 'DELETE' then
    delete from public.notifications
    where type = 'training_scheduled'
      and metadata->>'daily_plan_id' = old.id::text;
    return old;
  end if;

  if not new.active or new.workout_id is null then
    delete from public.notifications
    where type = 'training_scheduled'
      and metadata->>'daily_plan_id' = new.id::text;
    return new;
  end if;

  select w.title
  into v_workout_title
  from public.workouts w
  where w.id = new.workout_id;

  if v_workout_title is null then
    return new;
  end if;

  v_url := '/entrenamientos?workout=' || new.workout_id::text;
  v_body := v_workout_title || ' · ' || to_char(new.plan_date, 'DD/MM/YYYY')
    || ' a las ' || to_char(new.plan_time, 'HH24:MI') || '.';

  -- Sustituye el aviso anterior al editar el mismo día y evita duplicados.
  delete from public.notifications
  where type = 'training_scheduled'
    and metadata->>'daily_plan_id' = new.id::text;

  -- Si el entrenamiento acaba de crearse desde el plan diario, este aviso
  -- sustituye al genérico de "nuevo entrenamiento".
  delete from public.notifications
  where type = 'new_workout'
    and metadata->>'workout_id' = new.workout_id::text;

  insert into public.notifications (user_id, type, title, body, metadata)
  select
    p.id,
    'training_scheduled',
    'Entrenamiento programado',
    v_body,
    jsonb_build_object(
      'daily_plan_id', new.id,
      'workout_id', new.workout_id,
      'plan_date', new.plan_date,
      'plan_time', new.plan_time,
      'url', v_url
    )
  from public.profiles p
  where p.role = 'user'
    and p.approval_status = 'approved';

  return new;
end;
$$;

revoke all on function public.notify_daily_plan_change() from public;

drop trigger if exists daily_plans_notify_change on public.daily_plans;
create trigger daily_plans_notify_change
  after insert or update on public.daily_plans
  for each row execute function public.notify_daily_plan_change();

drop trigger if exists daily_plans_notify_delete on public.daily_plans;
create trigger daily_plans_notify_delete
  after delete on public.daily_plans
  for each row execute function public.notify_daily_plan_change();

-- Acceso explícito a Data API; RLS mantiene la autorización por fila.
grant select, insert, update, delete on table public.workouts to authenticated;
grant select, insert, update, delete on table public.daily_plans to authenticated;

