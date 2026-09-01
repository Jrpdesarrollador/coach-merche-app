-- ============================================================
-- Coach Merche App — gestión segura de clases recurrentes
-- ============================================================

create or replace function public.admin_cancel_class(p_class_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_class public.classes;
  v_workout_title text;
  v_cancelled_bookings integer := 0;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select *
  into v_class
  from public.classes
  where id = p_class_id
  for update;

  if not found then
    raise exception 'CLASS_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_class.status = 'cancelled' then
    return 0;
  end if;

  if v_class.status = 'completed' then
    raise exception 'CLASS_ALREADY_COMPLETED' using errcode = 'P0001';
  end if;

  select w.title
  into v_workout_title
  from public.workouts w
  where w.id = v_class.workout_id;

  delete from public.notifications
  where type = 'class_reminder'
    and metadata->>'class_id' = p_class_id::text;

  with cancelled as (
    update public.class_bookings
    set status = 'cancelled'
    where class_id = p_class_id
      and status = 'active'
    returning user_id
  )
  insert into public.notifications (user_id, type, title, body, metadata)
  select
    c.user_id,
    'custom',
    'Clase cancelada',
    coalesce(v_workout_title, 'Entrenamiento')
      || ' · ' || to_char(v_class.date, 'DD/MM/YYYY')
      || ' a las ' || to_char(v_class.start_time, 'HH24:MI') || '.',
    jsonb_build_object(
      'class_id', p_class_id,
      'class_date', v_class.date,
      'url', '/clases'
    )
  from cancelled c;

  get diagnostics v_cancelled_bookings = row_count;

  update public.classes
  set status = 'cancelled'
  where id = p_class_id;

  return v_cancelled_bookings;
end;
$$;

revoke all on function public.admin_cancel_class(uuid) from public;
grant execute on function public.admin_cancel_class(uuid) to authenticated;

comment on function public.admin_cancel_class(uuid) is
  'Cancela una clase concreta, sus reservas activas y sus recordatorios. Solo admin.';

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1
       from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'classes'
     ) then
    alter publication supabase_realtime add table public.classes;
  end if;
end;
$$;
