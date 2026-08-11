-- ============================================================
-- Coach Merche App — Roles Basic/Pro, vídeos, chat e informes
-- ============================================================

-- ------------------------------------------------------------
-- profiles — membresía, aprobación y suscripción Pro (manual)
-- ------------------------------------------------------------
alter table public.profiles
  add column if not exists membership_tier text not null default 'basic'
    check (membership_tier in ('basic', 'pro')),
  add column if not exists approval_status text not null default 'pending'
    check (approval_status in ('pending', 'approved', 'rejected')),
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid references public.profiles (id),
  add column if not exists subscription_plan text
    check (subscription_plan is null or subscription_plan in ('monthly', 'yearly')),
  add column if not exists subscription_status text
    check (subscription_status is null or subscription_status in ('active', 'expired', 'cancelled')),
  add column if not exists subscription_ends_at timestamptz;

create index if not exists profiles_approval_status_idx
  on public.profiles (approval_status);

create index if not exists profiles_membership_tier_idx
  on public.profiles (membership_tier);

-- Usuarias existentes quedan aprobadas; las nuevas entran en pending.
update public.profiles
set
  approval_status = 'approved',
  approved_at = coalesce(approved_at, now())
where approval_status = 'pending'
  and created_at < now() - interval '1 second';

-- ------------------------------------------------------------
-- workouts — vídeo en Storage privado (solo Pro)
-- ------------------------------------------------------------
alter table public.workouts
  add column if not exists video_path text,
  add column if not exists requires_pro boolean not null default true;

-- ------------------------------------------------------------
-- chat_messages — alumna ↔ admin
-- ------------------------------------------------------------
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  sender_role text not null check (sender_role in ('user', 'admin')),
  body text not null check (char_length(trim(body)) between 1 and 2000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_user_id_idx
  on public.chat_messages (user_id, created_at desc);

create index if not exists chat_messages_unread_admin_idx
  on public.chat_messages (user_id, created_at desc)
  where sender_role = 'user' and read_at is null;

alter table public.chat_messages enable row level security;

drop policy if exists "chat_messages_select" on public.chat_messages;
create policy "chat_messages_select"
  on public.chat_messages for select
  to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

drop policy if exists "chat_messages_insert_user" on public.chat_messages;
create policy "chat_messages_insert_user"
  on public.chat_messages for insert
  to authenticated
  with check (
    sender_role = 'user'
    and user_id = (select auth.uid())
  );

drop policy if exists "chat_messages_insert_admin" on public.chat_messages;
create policy "chat_messages_insert_admin"
  on public.chat_messages for insert
  to authenticated
  with check (
    public.is_admin()
    and sender_role = 'admin'
  );

drop policy if exists "chat_messages_update" on public.chat_messages;
create policy "chat_messages_update"
  on public.chat_messages for update
  to authenticated
  using (user_id = (select auth.uid()) or public.is_admin())
  with check (user_id = (select auth.uid()) or public.is_admin());

-- ------------------------------------------------------------
-- Helpers de membresía (antes de policies de Storage que los usan)
-- ------------------------------------------------------------
create or replace function public.is_pro_member(p_user_id uuid default null)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = coalesce(p_user_id, (select auth.uid()))
      and p.role = 'user'
      and p.approval_status = 'approved'
      and p.membership_tier = 'pro'
      and coalesce(p.subscription_status, 'active') = 'active'
      and (p.subscription_ends_at is null or p.subscription_ends_at > now())
  );
$$;

revoke all on function public.is_pro_member(uuid) from public;
grant execute on function public.is_pro_member(uuid) to authenticated;

create or replace function public.is_approved_member(p_user_id uuid default null)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = coalesce(p_user_id, (select auth.uid()))
      and (
        p.role = 'admin'
        or p.approval_status = 'approved'
      )
  );
$$;

revoke all on function public.is_approved_member(uuid) from public;
grant execute on function public.is_approved_member(uuid) to authenticated;

-- ------------------------------------------------------------
-- Storage — bucket privado workout-videos
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'workout-videos',
  'workout-videos',
  false,
  524288000, -- 500 MB
  array['video/mp4', 'video/webm', 'video/quicktime']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "storage_workout_videos_admin_insert" on storage.objects;
create policy "storage_workout_videos_admin_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'workout-videos' and public.is_admin());

drop policy if exists "storage_workout_videos_admin_update" on storage.objects;
create policy "storage_workout_videos_admin_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'workout-videos' and public.is_admin())
  with check (bucket_id = 'workout-videos' and public.is_admin());

drop policy if exists "storage_workout_videos_admin_delete" on storage.objects;
create policy "storage_workout_videos_admin_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'workout-videos' and public.is_admin());

drop policy if exists "storage_workout_videos_pro_read" on storage.objects;
create policy "storage_workout_videos_pro_read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'workout-videos'
    and (
      public.is_admin()
      or public.is_pro_member()
    )
  );

-- ------------------------------------------------------------
-- Alta de perfil — pending + aviso a admin
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name, approval_status, membership_tier)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
      split_part(new.email, '@', 1)
    ),
    'pending',
    'basic'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create or replace function public.notify_admin_pending_registration()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.approval_status = 'pending' and new.role = 'user' then
    insert into public.notifications (user_id, type, title, body, metadata)
    select
      p.id,
      'custom',
      'Nueva solicitud de acceso',
      coalesce(new.name, 'Una alumna') || ' quiere unirse. Revisa y aprueba su cuenta.',
      jsonb_build_object('user_id', new.id, 'kind', 'registration_pending')
    from public.profiles p
    where p.role = 'admin';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_notify_pending on public.profiles;
create trigger profiles_notify_pending
  after insert on public.profiles
  for each row execute function public.notify_admin_pending_registration();

-- ------------------------------------------------------------
-- notify_new_workout — solo usuarias Pro aprobadas
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
      'Nuevo entrenamiento en vídeo',
      'Ya tienes un entrenamiento nuevo disponible: ' || new.title,
      jsonb_build_object('workout_id', new.id)
    from public.profiles p
    where p.role = 'user'
      and p.approval_status = 'approved'
      and p.membership_tier = 'pro';
  end if;

  return new;
end;
$$;

-- ------------------------------------------------------------
-- admin_approve_user — validar y asignar Basic/Pro
-- ------------------------------------------------------------
create or replace function public.admin_approve_user(
  p_user_id uuid,
  p_tier text,
  p_subscription_plan text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if p_tier not in ('basic', 'pro') then
    raise exception 'INVALID_TIER' using errcode = 'P0001';
  end if;

  if p_tier = 'pro' and p_subscription_plan not in ('monthly', 'yearly') then
    raise exception 'SUBSCRIPTION_PLAN_REQUIRED' using errcode = 'P0001';
  end if;

  update public.profiles
  set
    approval_status = 'approved',
    approved_at = now(),
    approved_by = (select auth.uid()),
    membership_tier = p_tier,
    subscription_plan = case when p_tier = 'pro' then p_subscription_plan else null end,
    subscription_status = case when p_tier = 'pro' then 'active' else null end,
    subscription_ends_at = case
      when p_tier = 'pro' and p_subscription_plan = 'monthly' then now() + interval '1 month'
      when p_tier = 'pro' and p_subscription_plan = 'yearly' then now() + interval '1 year'
      else null
    end
  where id = p_user_id
    and role = 'user'
  returning * into v_profile;

  if not found then
    raise exception 'USER_NOT_FOUND' using errcode = 'P0002';
  end if;

  insert into public.notifications (user_id, type, title, body, metadata)
  values (
    p_user_id,
    'custom',
    '¡Acceso aprobado!',
    case
      when p_tier = 'pro' then 'Merche ha activado tu plan Pro. Ya puedes ver los entrenamientos en vídeo.'
      else 'Merche ha validado tu cuenta. ¡Bienvenida al equipo!'
    end,
    jsonb_build_object('membership_tier', p_tier)
  );

  return v_profile;
end;
$$;

revoke all on function public.admin_approve_user(uuid, text, text) from public;
grant execute on function public.admin_approve_user(uuid, text, text) to authenticated;

-- ------------------------------------------------------------
-- admin_set_membership_tier — cambiar Basic/Pro sin re-aprobar
-- ------------------------------------------------------------
create or replace function public.admin_set_membership_tier(
  p_user_id uuid,
  p_tier text,
  p_subscription_plan text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if p_tier not in ('basic', 'pro') then
    raise exception 'INVALID_TIER' using errcode = 'P0001';
  end if;

  if p_tier = 'pro' and p_subscription_plan not in ('monthly', 'yearly') then
    raise exception 'SUBSCRIPTION_PLAN_REQUIRED' using errcode = 'P0001';
  end if;

  update public.profiles
  set
    membership_tier = p_tier,
    subscription_plan = case when p_tier = 'pro' then p_subscription_plan else null end,
    subscription_status = case when p_tier = 'pro' then 'active' else null end,
    subscription_ends_at = case
      when p_tier = 'pro' and p_subscription_plan = 'monthly' then now() + interval '1 month'
      when p_tier = 'pro' and p_subscription_plan = 'yearly' then now() + interval '1 year'
      else null
    end
  where id = p_user_id
    and role = 'user'
    and approval_status = 'approved'
  returning * into v_profile;

  if not found then
    raise exception 'USER_NOT_FOUND' using errcode = 'P0002';
  end if;

  insert into public.notifications (user_id, type, title, body, metadata)
  values (
    p_user_id,
    'custom',
    case
      when p_tier = 'pro' then '¡Ya tienes acceso Pro!'
      else 'Plan actualizado'
    end,
    case
      when p_tier = 'pro'
        then 'Merche ha activado tu plan Pro. Ya puedes ver los entrenamientos en vídeo.'
      else 'Tu plan ha vuelto a Basic. Sigues teniendo acceso a las clases presenciales.'
    end,
    jsonb_build_object('membership_tier', p_tier)
  );

  return v_profile;
end;
$$;

revoke all on function public.admin_set_membership_tier(uuid, text, text) from public;
grant execute on function public.admin_set_membership_tier(uuid, text, text) to authenticated;

-- ------------------------------------------------------------
-- admin_reject_user
-- ------------------------------------------------------------
create or replace function public.admin_reject_user(p_user_id uuid)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  update public.profiles
  set approval_status = 'rejected'
  where id = p_user_id
    and role = 'user'
  returning * into v_profile;

  if not found then
    raise exception 'USER_NOT_FOUND' using errcode = 'P0002';
  end if;

  insert into public.notifications (user_id, type, title, body)
  values (
    p_user_id,
    'custom',
    'Solicitud no aprobada',
    'Tu solicitud de acceso no ha sido aprobada. Contacta con Merche si crees que es un error.'
  );

  return v_profile;
end;
$$;

revoke all on function public.admin_reject_user(uuid) from public;
grant execute on function public.admin_reject_user(uuid) to authenticated;

-- ------------------------------------------------------------
-- admin_list_users_with_stats
-- ------------------------------------------------------------
create or replace function public.admin_list_users_with_stats()
returns table (
  id uuid,
  name text,
  last_name text,
  email text,
  phone text,
  avatar_url text,
  role text,
  membership_tier text,
  approval_status text,
  approved_at timestamptz,
  subscription_plan text,
  subscription_status text,
  subscription_ends_at timestamptz,
  created_at timestamptz,
  bookings_count bigint,
  attendance_count bigint,
  last_activity_at timestamptz
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
    p.role::text,
    p.membership_tier::text,
    p.approval_status::text,
    p.approved_at,
    p.subscription_plan::text,
    p.subscription_status::text,
    p.subscription_ends_at,
    p.created_at,
    coalesce(b.cnt, 0) as bookings_count,
    coalesce(a.cnt, 0) as attendance_count,
    greatest(
      p.updated_at,
      coalesce(b.last_at, p.created_at),
      coalesce(a.last_at, p.created_at)
    ) as last_activity_at
  from public.profiles p
  join auth.users u on u.id = p.id
  left join lateral (
    select count(*)::bigint as cnt, max(cb.created_at) as last_at
    from public.class_bookings cb
    where cb.user_id = p.id and cb.status = 'active'
  ) b on true
  left join lateral (
    select count(*)::bigint as cnt, max(at.confirmed_at) as last_at
    from public.attendance at
    where at.user_id = p.id and at.attended = true
  ) a on true
  order by
    case p.approval_status when 'pending' then 0 else 1 end,
    p.created_at desc;
end;
$$;

revoke all on function public.admin_list_users_with_stats() from public;
grant execute on function public.admin_list_users_with_stats() to authenticated;

-- ------------------------------------------------------------
-- admin_export_report — datos agregados para CSV
-- ------------------------------------------------------------
create or replace function public.admin_export_report(
  p_period text,
  p_start_date date default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_start date;
  v_end date := current_date;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  v_start := coalesce(
    p_start_date,
    case p_period
      when 'week' then current_date - 6
      when 'month' then (date_trunc('month', current_date))::date
      when 'quarter' then (date_trunc('quarter', current_date))::date
      when 'semester' then
        case when extract(month from current_date) <= 6
          then make_date(extract(year from current_date)::int, 1, 1)
          else make_date(extract(year from current_date)::int, 7, 1)
        end
      when 'year' then make_date(extract(year from current_date)::int, 1, 1)
      else current_date - 29
    end
  );

  return jsonb_build_object(
    'period', p_period,
    'start_date', v_start,
    'end_date', v_end,
    'users', coalesce((
      select jsonb_agg(row_to_json(t))
      from (
        select
          p.id,
          p.name,
          p.last_name,
          u.email,
          p.membership_tier,
          p.approval_status,
          p.created_at
        from public.profiles p
        join auth.users u on u.id = p.id
        where p.role = 'user'
          and p.created_at::date between v_start and v_end
        order by p.created_at
      ) t
    ), '[]'::jsonb),
    'bookings', coalesce((
      select jsonb_agg(row_to_json(t))
      from (
        select
          cb.id,
          cb.user_id,
          cb.class_id,
          cb.status,
          cb.created_at,
          c.date as class_date,
          w.title as workout_title
        from public.class_bookings cb
        join public.classes c on c.id = cb.class_id
        join public.workouts w on w.id = c.workout_id
        where cb.created_at::date between v_start and v_end
        order by cb.created_at
      ) t
    ), '[]'::jsonb),
    'payments', coalesce((
      select jsonb_agg(row_to_json(t))
      from (
        select
          pay.id,
          pay.user_id,
          pay.month,
          pay.amount_cents,
          pay.status,
          pay.created_at
        from public.payments pay
        where pay.created_at::date between v_start and v_end
        order by pay.created_at
      ) t
    ), '[]'::jsonb),
    'attendance', coalesce((
      select jsonb_agg(row_to_json(t))
      from (
        select
          at.id,
          at.user_id,
          at.class_id,
          at.attended,
          at.confirmed_at,
          c.date as class_date
        from public.attendance at
        join public.classes c on c.id = at.class_id
        where coalesce(at.confirmed_at, at.created_at)::date between v_start and v_end
        order by at.confirmed_at nulls last
      ) t
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.admin_export_report(text, date) from public;
grant execute on function public.admin_export_report(text, date) to authenticated;

-- ------------------------------------------------------------
-- admin_list_chat_threads — resumen para inbox admin
-- ------------------------------------------------------------
create or replace function public.admin_list_chat_threads()
returns table (
  user_id uuid,
  name text,
  last_name text,
  email text,
  last_message text,
  last_message_at timestamptz,
  unread_count bigint
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
    p.id as user_id,
    p.name,
    p.last_name,
    u.email::text,
    lm.body as last_message,
    lm.created_at as last_message_at,
    coalesce(unread.cnt, 0) as unread_count
  from public.profiles p
  join auth.users u on u.id = p.id
  join lateral (
    select cm.body, cm.created_at
    from public.chat_messages cm
    where cm.user_id = p.id
    order by cm.created_at desc
    limit 1
  ) lm on true
  left join lateral (
    select count(*)::bigint as cnt
    from public.chat_messages cm
    where cm.user_id = p.id
      and cm.sender_role = 'user'
      and cm.read_at is null
  ) unread on true
  where p.role = 'user'
  order by lm.created_at desc nulls last;
end;
$$;

revoke all on function public.admin_list_chat_threads() from public;
grant execute on function public.admin_list_chat_threads() to authenticated;

-- Actualizar admin_list_profiles con campos de membresía
drop function if exists public.admin_list_profiles();

create or replace function public.admin_list_profiles()
returns table (
  id uuid,
  name text,
  last_name text,
  email text,
  phone text,
  avatar_url text,
  role text,
  membership_tier text,
  approval_status text,
  subscription_plan text,
  subscription_status text,
  subscription_ends_at timestamptz
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
    p.role::text,
    p.membership_tier::text,
    p.approval_status::text,
    p.subscription_plan::text,
    p.subscription_status::text,
    p.subscription_ends_at
  from public.profiles p
  join auth.users u on u.id = p.id
  order by p.name, p.last_name nulls last;
end;
$$;
