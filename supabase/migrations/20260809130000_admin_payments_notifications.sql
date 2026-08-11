-- ============================================================
-- Coach Merche App — Pagos, notificaciones in-app y funciones admin
-- ============================================================

-- ------------------------------------------------------------
-- payments — control manual de cuotas mensuales
-- ------------------------------------------------------------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  month text not null check (month ~ '^\d{4}-\d{2}$'),
  amount_cents integer not null check (amount_cents >= 0),
  status text not null default 'pending' check (status in ('pending', 'paid', 'overdue')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payments_unique_user_month unique (user_id, month)
);

create index if not exists payments_user_id_idx on public.payments (user_id);
create index if not exists payments_status_idx on public.payments (status);
create index if not exists payments_month_idx on public.payments (month);

create or replace trigger payments_set_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

alter table public.payments enable row level security;

drop policy if exists "payments_select" on public.payments;
create policy "payments_select"
  on public.payments for select
  to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

drop policy if exists "payments_admin_write" on public.payments;
create policy "payments_admin_write"
  on public.payments for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "payments_admin_update" on public.payments;
create policy "payments_admin_update"
  on public.payments for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "payments_admin_delete" on public.payments;
create policy "payments_admin_delete"
  on public.payments for delete
  to authenticated
  using (public.is_admin());

-- ------------------------------------------------------------
-- notifications — avisos in-app para alumnas
-- ------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  type text not null check (
    type in ('class_reminder', 'new_workout', 'new_class', 'custom', 'booking_confirmed')
  ),
  title text not null check (char_length(trim(title)) between 1 and 120),
  body text not null check (char_length(trim(body)) between 1 and 500),
  read_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_id_idx on public.notifications (user_id);
create index if not exists notifications_unread_idx
  on public.notifications (user_id, created_at desc)
  where read_at is null;

alter table public.notifications enable row level security;

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
  on public.notifications for select
  to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
  on public.notifications for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "notifications_admin_insert" on public.notifications;
create policy "notifications_admin_insert"
  on public.notifications for insert
  to authenticated
  with check (public.is_admin());

-- ------------------------------------------------------------
-- book_class — añade notificación al confirmar reserva
-- ------------------------------------------------------------
create or replace function public.book_class(p_class_id uuid)
returns public.class_bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_class public.classes;
  v_existing_status text;
  v_active_count integer;
  v_booking public.class_bookings;
begin
  if v_user is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  select * into v_class
  from public.classes
  where id = p_class_id
  for update;

  if not found then
    raise exception 'CLASS_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_class.status <> 'scheduled' then
    raise exception 'CLASS_CANCELLED' using errcode = 'P0001';
  end if;

  if (v_class.date + v_class.start_time) < (now() at time zone 'Europe/Madrid') then
    raise exception 'CLASS_IN_PAST' using errcode = 'P0001';
  end if;

  select status into v_existing_status
  from public.class_bookings
  where class_id = p_class_id
    and user_id = v_user;

  if v_existing_status = 'active' then
    raise exception 'ALREADY_BOOKED' using errcode = '23505';
  end if;

  select count(*) into v_active_count
  from public.class_bookings
  where class_id = p_class_id
    and status = 'active';

  if v_active_count >= v_class.capacity then
    raise exception 'CLASS_FULL' using errcode = 'P0001';
  end if;

  insert into public.class_bookings as cb (class_id, user_id, status)
  values (p_class_id, v_user, 'active')
  on conflict (class_id, user_id) do update
    set status = 'active',
        updated_at = now()
    where cb.status = 'cancelled'
  returning cb.* into v_booking;

  if not found then
    raise exception 'ALREADY_BOOKED' using errcode = '23505';
  end if;

  insert into public.notifications (user_id, type, title, body, metadata)
  values (
    v_user,
    'booking_confirmed',
    'Reserva confirmada',
    'Tu plaza está asegurada. ¡Nos vemos en clase!',
    jsonb_build_object('class_id', p_class_id)
  );

  insert into public.notifications (user_id, type, title, body, metadata)
  select
    p.id,
    'custom',
    'Nueva reserva',
    'Una alumna se ha apuntado a una clase.',
    jsonb_build_object('class_id', p_class_id, 'booked_by', v_user)
  from public.profiles p
  where p.role = 'admin';

  return v_booking;
end;
$$;

revoke all on function public.book_class(uuid) from public;
grant execute on function public.book_class(uuid) to authenticated;

-- ------------------------------------------------------------
-- notify_new_workout — avisa a las alumnas al publicar entrenamiento
-- ------------------------------------------------------------
create or replace function public.notify_new_workout()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.active and (tg_op = 'INSERT' or old.active is distinct from new.active) then
    insert into public.notifications (user_id, type, title, body, metadata)
    select
      p.id,
      'new_workout',
      'Nuevo entrenamiento',
      'Ya tienes un entrenamiento nuevo disponible: ' || new.title,
      jsonb_build_object('workout_id', new.id)
    from public.profiles p
    where p.role = 'user';
  end if;

  return new;
end;
$$;

drop trigger if exists workouts_notify_new on public.workouts;
create trigger workouts_notify_new
  after insert or update of active on public.workouts
  for each row execute function public.notify_new_workout();

-- ------------------------------------------------------------
-- notify_class_reminders — STUB para cron futuro (Fase 13)
--
-- En producción se invocará diariamente (pg_cron o Edge Function) para
-- insertar recordatorios 24 h antes de cada clase reservada.
-- ------------------------------------------------------------
create or replace function public.notify_class_reminders()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- STUB: implementar en Fase 13 con pg_cron o tarea programada.
  return 0;
end;
$$;

revoke all on function public.notify_class_reminders() from public;
grant execute on function public.notify_class_reminders() to authenticated;

-- ------------------------------------------------------------
-- admin_list_profiles — directorio de alumnas con email (solo admin)
-- ------------------------------------------------------------
create or replace function public.admin_list_profiles()
returns table (
  id uuid,
  name text,
  last_name text,
  email text,
  phone text,
  avatar_url text,
  role text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  return query
  select
    p.id,
    p.name,
    p.last_name,
    u.email::text,
    p.phone,
    p.avatar_url,
    p.role::text
  from public.profiles p
  join auth.users u on u.id = p.id
  order by p.name, p.last_name nulls last;
end;
$$;

revoke all on function public.admin_list_profiles() from public;
grant execute on function public.admin_list_profiles() to authenticated;

-- ------------------------------------------------------------
-- admin_get_class_participants — inscritas con asistencia (solo admin)
-- ------------------------------------------------------------
create or replace function public.admin_get_class_participants(p_class_id uuid)
returns table (
  booking_id uuid,
  user_id uuid,
  name text,
  last_name text,
  email text,
  booking_status text,
  booked_at timestamptz,
  attended boolean,
  attendance_confirmed_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  return query
  select
    cb.id as booking_id,
    p.id as user_id,
    p.name,
    p.last_name,
    u.email::text,
    cb.status::text as booking_status,
    cb.created_at as booked_at,
    coalesce(a.attended, false) as attended,
    a.confirmed_at as attendance_confirmed_at
  from public.class_bookings cb
  join public.profiles p on p.id = cb.user_id
  join auth.users u on u.id = p.id
  left join public.attendance a
    on a.class_id = cb.class_id
   and a.user_id = cb.user_id
  where cb.class_id = p_class_id
    and cb.status = 'active'
  order by cb.created_at;
end;
$$;

revoke all on function public.admin_get_class_participants(uuid) from public;
grant execute on function public.admin_get_class_participants(uuid) to authenticated;
