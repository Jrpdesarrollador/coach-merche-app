-- ============================================================
-- Coach Merche App — Asistencia y desbloqueo de recompensas
--
-- Regla clave: el contador de entrenamientos SOLO crece con
-- asistencia confirmada por admin (attendance.attended = true).
-- ============================================================

-- ------------------------------------------------------------
-- Entrenamientos realizados por una alumna.
-- ------------------------------------------------------------
create or replace function public.workout_count(p_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::int
  from public.attendance a
  where a.user_id = p_user_id
    and a.attended;
$$;

revoke all on function public.workout_count(uuid) from public;
grant execute on function public.workout_count(uuid) to authenticated;

-- ------------------------------------------------------------
-- Desbloquea las recompensas activas cuyo umbral ya se ha alcanzado.
-- Idempotente: la restricción UNIQUE(user_id, reward_id) impide duplicados.
-- Devuelve únicamente las recompensas NUEVAS.
-- ------------------------------------------------------------
create or replace function public.sync_user_rewards(p_user_id uuid)
returns table (
  user_id uuid,
  reward_id uuid,
  reward_name text,
  reward_icon text,
  reward_type text,
  status text
)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_total integer := public.workout_count(p_user_id);
begin
  return query
  with inserted as (
    insert into public.user_rewards (user_id, reward_id, status)
    select
      p_user_id,
      r.id,
      case when r.reward_type = 'physical' then 'pending_delivery' else 'unlocked' end
    from public.rewards r
    where r.active
      and r.required_workouts <= v_total
      and not exists (
        select 1
        from public.user_rewards ur
        where ur.user_id = p_user_id
          and ur.reward_id = r.id
      )
    on conflict (user_id, reward_id) do nothing
    returning user_rewards.user_id, user_rewards.reward_id, user_rewards.status
  )
  select i.user_id, i.reward_id, r.name, r.icon, r.reward_type, i.status
  from inserted i
  join public.rewards r on r.id = i.reward_id
  order by r.required_workouts;
end;
$$;

revoke all on function public.sync_user_rewards(uuid) from public;
grant execute on function public.sync_user_rewards(uuid) to authenticated;

-- ------------------------------------------------------------
-- confirm_class_attendance
--
-- Registra la asistencia de toda la clase en una sola operación:
--   · marca attended = true para las alumnas indicadas
--   · marca attended = false para el resto de inscritas
--   · cierra la clase (status = completed)
--   · desbloquea las recompensas alcanzadas
--
-- Devuelve las recompensas nuevas para poder celebrarlas en la app.
-- ------------------------------------------------------------
create or replace function public.confirm_class_attendance(
  p_class_id uuid,
  p_attendee_ids uuid[]
)
returns table (
  user_id uuid,
  reward_id uuid,
  reward_name text,
  reward_icon text,
  reward_type text,
  status text
)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_admin uuid := (select auth.uid());
  v_attendees uuid[] := coalesce(p_attendee_ids, '{}'::uuid[]);
  v_booking record;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if not exists (select 1 from public.classes where id = p_class_id) then
    raise exception 'CLASS_NOT_FOUND' using errcode = 'P0002';
  end if;

  for v_booking in
    select cb.user_id
    from public.class_bookings cb
    where cb.class_id = p_class_id
      and cb.status = 'active'
  loop
    insert into public.attendance (class_id, user_id, attended, confirmed_by, confirmed_at)
    values (
      p_class_id,
      v_booking.user_id,
      v_booking.user_id = any (v_attendees),
      v_admin,
      now()
    )
    on conflict (class_id, user_id) do update
      set attended = excluded.attended,
          confirmed_by = excluded.confirmed_by,
          confirmed_at = excluded.confirmed_at;
  end loop;

  update public.classes
  set status = 'completed',
      updated_at = now()
  where id = p_class_id
    and status = 'scheduled';

  return query
  select s.*
  from unnest(v_attendees) as attendee(id)
  cross join lateral public.sync_user_rewards(attendee.id) as s;
end;
$$;

revoke all on function public.confirm_class_attendance(uuid, uuid[]) from public;
grant execute on function public.confirm_class_attendance(uuid, uuid[]) to authenticated;

-- ------------------------------------------------------------
-- Entrega de recompensas físicas.
-- ------------------------------------------------------------
create or replace function public.mark_reward_delivered(p_user_reward_id uuid)
returns public.user_rewards
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.user_rewards;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  update public.user_rewards
  set status = 'delivered',
      delivered_at = now()
  where id = p_user_reward_id
    and status <> 'delivered'
  returning * into v_row;

  if not found then
    raise exception 'REWARD_NOT_PENDING' using errcode = 'P0002';
  end if;

  return v_row;
end;
$$;

revoke all on function public.mark_reward_delivered(uuid) from public;
grant execute on function public.mark_reward_delivered(uuid) to authenticated;
