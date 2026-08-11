-- ============================================================
-- Coach Merche App — Fase 11/13: push subscriptions, recordatorios
-- y funciones admin para entrega de recompensas
-- ============================================================

-- ------------------------------------------------------------
-- push_subscriptions — suscripciones Web Push por usuaria
-- ------------------------------------------------------------
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null check (char_length(trim(endpoint)) > 10),
  keys jsonb not null check (jsonb_typeof(keys) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint push_subscriptions_unique unique (user_id, endpoint)
);

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions (user_id);

create or replace trigger push_subscriptions_set_updated_at
  before update on public.push_subscriptions
  for each row execute function public.set_updated_at();

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subscriptions_select_own" on public.push_subscriptions;
create policy "push_subscriptions_select_own"
  on public.push_subscriptions for select
  to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

drop policy if exists "push_subscriptions_insert_own" on public.push_subscriptions;
create policy "push_subscriptions_insert_own"
  on public.push_subscriptions for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "push_subscriptions_update_own" on public.push_subscriptions;
create policy "push_subscriptions_update_own"
  on public.push_subscriptions for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "push_subscriptions_delete_own" on public.push_subscriptions;
create policy "push_subscriptions_delete_own"
  on public.push_subscriptions for delete
  to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

-- ------------------------------------------------------------
-- upsert_push_subscription — guarda o actualiza la suscripción push
-- ------------------------------------------------------------
create or replace function public.upsert_push_subscription(
  p_endpoint text,
  p_keys jsonb
)
returns public.push_subscriptions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_row public.push_subscriptions;
begin
  if v_user is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  if p_endpoint is null or char_length(trim(p_endpoint)) < 10 then
    raise exception 'INVALID_ENDPOINT' using errcode = '22023';
  end if;

  if p_keys is null or jsonb_typeof(p_keys) <> 'object' then
    raise exception 'INVALID_KEYS' using errcode = '22023';
  end if;

  insert into public.push_subscriptions (user_id, endpoint, keys)
  values (v_user, trim(p_endpoint), p_keys)
  on conflict (user_id, endpoint) do update
    set keys = excluded.keys,
        updated_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.upsert_push_subscription(text, jsonb) from public;
grant execute on function public.upsert_push_subscription(text, jsonb) to authenticated;

-- ------------------------------------------------------------
-- delete_push_subscription — elimina una suscripción al desactivar avisos
-- ------------------------------------------------------------
create or replace function public.delete_push_subscription(p_endpoint text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_deleted boolean := false;
begin
  if v_user is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  delete from public.push_subscriptions
  where user_id = v_user
    and endpoint = trim(p_endpoint);

  v_deleted := found;
  return v_deleted;
end;
$$;

revoke all on function public.delete_push_subscription(text) from public;
grant execute on function public.delete_push_subscription(text) to authenticated;

-- ------------------------------------------------------------
-- notify_class_reminders — recordatorios 24 h antes de clase reservada
--
-- Inserta avisos in-app (type = class_reminder) para alumnas con reserva
-- activa en clases que empiezan en ~24 horas. Idempotente por clase y usuaria
-- en una ventana de 48 h.
--
-- En producción invocar diariamente vía pg_cron o Edge Function
-- supabase/functions/class-reminders.
-- ------------------------------------------------------------
create or replace function public.notify_class_reminders()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer := 0;
begin
  with upcoming as (
    select
      c.id as class_id,
      c.date,
      c.start_time,
      c.location,
      w.title as workout_title
    from public.classes c
    join public.workouts w on w.id = c.workout_id
    where c.status = 'scheduled'
      and ((c.date + c.start_time) at time zone 'Europe/Madrid')
          between (now() at time zone 'Europe/Madrid') + interval '23 hours'
              and (now() at time zone 'Europe/Madrid') + interval '25 hours'
  ),
  bookings as (
    select
      cb.user_id,
      u.class_id,
      u.workout_title,
      u.date,
      u.start_time,
      u.location
    from public.class_bookings cb
    join upcoming u on u.class_id = cb.class_id
    where cb.status = 'active'
  ),
  inserted as (
    insert into public.notifications (user_id, type, title, body, metadata)
    select
      b.user_id,
      'class_reminder',
      'Tu clase es mañana',
      'Recuerda: ' || b.workout_title || ' el '
        || to_char(b.date, 'DD/MM') || ' a las '
        || to_char(b.start_time, 'HH24:MI') || ' en ' || b.location || '.',
      jsonb_build_object(
        'class_id', b.class_id,
        'push', true,
        'scheduled_at', (b.date + b.start_time)::text
      )
    from bookings b
    where not exists (
      select 1
      from public.notifications n
      where n.user_id = b.user_id
        and n.type = 'class_reminder'
        and n.metadata->>'class_id' = b.class_id::text
        and n.created_at > now() - interval '48 hours'
    )
    returning id
  )
  select count(*)::int into v_count from inserted;

  return v_count;
end;
$$;

revoke all on function public.notify_class_reminders() from public;
grant execute on function public.notify_class_reminders() to authenticated;

-- ------------------------------------------------------------
-- admin_list_pending_rewards — recompensas físicas pendientes de entrega
-- ------------------------------------------------------------
create or replace function public.admin_list_pending_rewards()
returns table (
  user_reward_id uuid,
  user_id uuid,
  user_name text,
  user_last_name text,
  reward_id uuid,
  reward_name text,
  reward_icon text,
  required_workouts integer,
  unlocked_at timestamptz
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
    ur.id as user_reward_id,
    ur.user_id,
    p.name as user_name,
    p.last_name as user_last_name,
    r.id as reward_id,
    r.name as reward_name,
    r.icon as reward_icon,
    r.required_workouts,
    ur.unlocked_at
  from public.user_rewards ur
  join public.rewards r on r.id = ur.reward_id
  join public.profiles p on p.id = ur.user_id
  where ur.status = 'pending_delivery'
  order by ur.unlocked_at asc, p.name;
end;
$$;

revoke all on function public.admin_list_pending_rewards() from public;
grant execute on function public.admin_list_pending_rewards() to authenticated;

-- ------------------------------------------------------------
-- admin_get_user_rewards — historial de recompensas de una alumna
-- ------------------------------------------------------------
create or replace function public.admin_get_user_rewards(p_user_id uuid)
returns table (
  user_reward_id uuid,
  reward_id uuid,
  reward_name text,
  reward_icon text,
  reward_type text,
  required_workouts integer,
  status text,
  unlocked_at timestamptz,
  delivered_at timestamptz
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
    ur.id as user_reward_id,
    r.id as reward_id,
    r.name as reward_name,
    r.icon as reward_icon,
    r.reward_type::text,
    r.required_workouts,
    ur.status::text,
    ur.unlocked_at,
    ur.delivered_at
  from public.user_rewards ur
  join public.rewards r on r.id = ur.reward_id
  where ur.user_id = p_user_id
  order by r.required_workouts asc;
end;
$$;

revoke all on function public.admin_get_user_rewards(uuid) from public;
grant execute on function public.admin_get_user_rewards(uuid) to authenticated;
