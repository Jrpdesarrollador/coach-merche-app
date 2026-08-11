-- ============================================================
-- Coach Merche App — Gestión manual complementaria (preview v6)
-- Reservas manuales, pagos 7 €/clase, asistencia y reset admin
-- ============================================================

-- Precio fijo por clase (7 €) usado en cálculos de saldo manual
create or replace function public.class_price_cents()
returns integer
language sql
immutable
as $$
  select 700;
$$;

-- ------------------------------------------------------------
-- class_bookings — origen app | manual
-- ------------------------------------------------------------
alter table public.class_bookings
  add column if not exists source text not null default 'app'
    check (source in ('app', 'manual'));

create index if not exists class_bookings_source_idx
  on public.class_bookings (source)
  where status = 'active';

-- ------------------------------------------------------------
-- profiles — alumnas creadas manualmente + notas admin
-- ------------------------------------------------------------
alter table public.profiles
  add column if not exists is_manual boolean not null default false,
  add column if not exists admin_notes text;

create index if not exists profiles_is_manual_idx
  on public.profiles (is_manual)
  where is_manual = true;

-- ------------------------------------------------------------
-- manual_payments — efectivo / transferencia (7 € por clase)
-- ------------------------------------------------------------
create table if not exists public.manual_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  classes_credited integer not null check (classes_credited > 0),
  paid_at date not null default (now() at time zone 'Europe/Madrid')::date,
  notes text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists manual_payments_user_id_idx
  on public.manual_payments (user_id, paid_at desc);

create or replace trigger manual_payments_set_updated_at
  before update on public.manual_payments
  for each row execute function public.set_updated_at();

alter table public.manual_payments enable row level security;

drop policy if exists "manual_payments_admin_all" on public.manual_payments;
create policy "manual_payments_admin_all"
  on public.manual_payments for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ------------------------------------------------------------
-- manual_attendance_records — asistencia por fecha (preview)
-- ------------------------------------------------------------
create table if not exists public.manual_attendance_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  attendance_date date not null,
  notes text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint manual_attendance_unique_user_date unique (user_id, attendance_date)
);

create index if not exists manual_attendance_date_idx
  on public.manual_attendance_records (attendance_date desc);

create or replace trigger manual_attendance_set_updated_at
  before update on public.manual_attendance_records
  for each row execute function public.set_updated_at();

alter table public.manual_attendance_records enable row level security;

drop policy if exists "manual_attendance_admin_all" on public.manual_attendance_records;
create policy "manual_attendance_admin_all"
  on public.manual_attendance_records for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ------------------------------------------------------------
-- admin_assign_to_class — reserva manual idempotente
-- ------------------------------------------------------------
create or replace function public.admin_assign_to_class(
  p_user_id uuid,
  p_class_id uuid
)
returns public.class_bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_class public.classes;
  v_existing_status text;
  v_active_count integer;
  v_booking public.class_bookings;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id = p_user_id and p.role = 'user'
  ) then
    raise exception 'USER_NOT_FOUND' using errcode = 'P0002';
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

  select status into v_existing_status
  from public.class_bookings
  where class_id = p_class_id
    and user_id = p_user_id;

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

  insert into public.class_bookings as cb (class_id, user_id, status, source)
  values (p_class_id, p_user_id, 'active', 'manual')
  on conflict (class_id, user_id) do update
    set status = 'active',
        source = 'manual',
        updated_at = now()
    where cb.status = 'cancelled'
  returning cb.* into v_booking;

  if not found then
    raise exception 'ALREADY_BOOKED' using errcode = '23505';
  end if;

  return v_booking;
end;
$$;

revoke all on function public.admin_assign_to_class(uuid, uuid) from public;
grant execute on function public.admin_assign_to_class(uuid, uuid) to authenticated;

-- ------------------------------------------------------------
-- admin_remove_from_class — quitar alumna (app o manual)
-- ------------------------------------------------------------
create or replace function public.admin_remove_from_class(p_booking_id uuid)
returns public.class_bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.class_bookings;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  update public.class_bookings
  set status = 'cancelled',
      updated_at = now()
  where id = p_booking_id
    and status = 'active'
  returning * into v_booking;

  if not found then
    raise exception 'BOOKING_NOT_FOUND' using errcode = 'P0002';
  end if;

  return v_booking;
end;
$$;

revoke all on function public.admin_remove_from_class(uuid) from public;
grant execute on function public.admin_remove_from_class(uuid) to authenticated;

-- ------------------------------------------------------------
-- admin_create_student — perfil manual sin app (auth placeholder)
-- ------------------------------------------------------------
create or replace function public.admin_create_student(
  p_name text,
  p_last_name text default null,
  p_email text default null,
  p_notes text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := (select auth.uid());
  v_id uuid := gen_random_uuid();
  v_email text;
  v_profile public.profiles;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if char_length(trim(coalesce(p_name, ''))) < 1 then
    raise exception 'VALIDATION_FAILED' using errcode = '22023';
  end if;

  v_email := nullif(lower(trim(coalesce(p_email, ''))), '');
  if v_email is null then
    v_email := 'manual-' || replace(v_id::text, '-', '') || '@coach-merche.local';
  end if;

  if exists (select 1 from auth.users u where lower(u.email) = v_email) then
    raise exception 'EMAIL_EXISTS' using errcode = '23505';
  end if;

  insert into auth.users (id, email, raw_user_meta_data)
  values (
    v_id,
    v_email,
    jsonb_build_object(
      'name', trim(p_name),
      'is_manual', true
    )
  );

  update public.profiles
  set
    name = trim(p_name),
    last_name = nullif(trim(coalesce(p_last_name, '')), ''),
    is_manual = true,
    approval_status = 'approved',
    approved_at = now(),
    approved_by = v_admin,
    admin_notes = nullif(trim(coalesce(p_notes, '')), '')
  where id = v_id
  returning * into v_profile;

  return v_profile;
end;
$$;

revoke all on function public.admin_create_student(text, text, text, text) from public;
grant execute on function public.admin_create_student(text, text, text, text) to authenticated;

-- ------------------------------------------------------------
-- admin_update_student — corregir datos de alumna
-- ------------------------------------------------------------
create or replace function public.admin_update_student(
  p_user_id uuid,
  p_name text default null,
  p_last_name text default null,
  p_email text default null,
  p_notes text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles;
  v_email text;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  v_email := nullif(lower(trim(coalesce(p_email, ''))), '');
  if v_email is not null and exists (
    select 1 from auth.users u
    where lower(u.email) = v_email and u.id <> p_user_id
  ) then
    raise exception 'EMAIL_EXISTS' using errcode = '23505';
  end if;

  if v_email is not null then
    update auth.users set email = v_email where id = p_user_id;
  end if;

  update public.profiles
  set
    name = coalesce(nullif(trim(p_name), ''), name),
    last_name = case when p_last_name is null then last_name else nullif(trim(p_last_name), '') end,
    admin_notes = case when p_notes is null then admin_notes else nullif(trim(p_notes), '') end,
    updated_at = now()
  where id = p_user_id
    and role = 'user'
  returning * into v_profile;

  if not found then
    raise exception 'USER_NOT_FOUND' using errcode = 'P0002';
  end if;

  return v_profile;
end;
$$;

revoke all on function public.admin_update_student(uuid, text, text, text, text) from public;
grant execute on function public.admin_update_student(uuid, text, text, text, text) to authenticated;

-- ------------------------------------------------------------
-- Pagos manuales — CRUD
-- ------------------------------------------------------------
create or replace function public.admin_register_manual_payment(
  p_user_id uuid,
  p_amount_cents integer,
  p_paid_at date default null,
  p_notes text default null
)
returns public.manual_payments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.manual_payments;
  v_price integer := public.class_price_cents();
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'VALIDATION_FAILED' using errcode = '22023';
  end if;

  insert into public.manual_payments (
    user_id,
    amount_cents,
    classes_credited,
    paid_at,
    notes,
    created_by
  )
  values (
    p_user_id,
    p_amount_cents,
    greatest(1, p_amount_cents / v_price),
    coalesce(p_paid_at, (now() at time zone 'Europe/Madrid')::date),
    coalesce(
      nullif(trim(coalesce(p_notes, '')), ''),
      (p_amount_cents / v_price)::text || ' clase(s) abonada(s)'
    ),
    (select auth.uid())
  )
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.admin_register_manual_payment(uuid, integer, date, text) from public;
grant execute on function public.admin_register_manual_payment(uuid, integer, date, text) to authenticated;

create or replace function public.admin_update_manual_payment(
  p_id uuid,
  p_amount_cents integer,
  p_paid_at date,
  p_notes text default null
)
returns public.manual_payments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.manual_payments;
  v_price integer := public.class_price_cents();
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'VALIDATION_FAILED' using errcode = '22023';
  end if;

  update public.manual_payments
  set
    amount_cents = p_amount_cents,
    classes_credited = greatest(1, p_amount_cents / v_price),
    paid_at = p_paid_at,
    notes = nullif(trim(coalesce(p_notes, '')), ''),
    updated_at = now()
  where id = p_id
  returning * into v_row;

  if not found then
    raise exception 'PAYMENT_NOT_FOUND' using errcode = 'P0002';
  end if;

  return v_row;
end;
$$;

revoke all on function public.admin_update_manual_payment(uuid, integer, date, text) from public;
grant execute on function public.admin_update_manual_payment(uuid, integer, date, text) to authenticated;

create or replace function public.admin_delete_manual_payment(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  delete from public.manual_payments where id = p_id;

  if not found then
    raise exception 'PAYMENT_NOT_FOUND' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.admin_delete_manual_payment(uuid) from public;
grant execute on function public.admin_delete_manual_payment(uuid) to authenticated;

-- ------------------------------------------------------------
-- Asistencia manual — guardar por fecha (reemplaza lista del día)
-- ------------------------------------------------------------
create or replace function public.admin_save_manual_attendance(
  p_date date,
  p_user_ids uuid[]
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer := 0;
  v_uid uuid;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if p_date is null then
    raise exception 'VALIDATION_FAILED' using errcode = '22023';
  end if;

  delete from public.manual_attendance_records
  where attendance_date = p_date;

  if p_user_ids is not null then
    foreach v_uid in array p_user_ids loop
      insert into public.manual_attendance_records (user_id, attendance_date, created_by)
      values (v_uid, p_date, (select auth.uid()))
      on conflict (user_id, attendance_date) do nothing;
      v_count := v_count + 1;
    end loop;
  end if;

  return v_count;
end;
$$;

revoke all on function public.admin_save_manual_attendance(date, uuid[]) from public;
grant execute on function public.admin_save_manual_attendance(date, uuid[]) to authenticated;

create or replace function public.admin_delete_manual_attendance_date(p_date date)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted integer;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  delete from public.manual_attendance_records
  where attendance_date = p_date;

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function public.admin_delete_manual_attendance_date(date) from public;
grant execute on function public.admin_delete_manual_attendance_date(date) to authenticated;

-- ------------------------------------------------------------
-- admin_reset_manual_data — solo datos manuales (no borra auth)
-- scope: payments | attendance | bookings | all
-- ------------------------------------------------------------
create or replace function public.admin_reset_manual_data(p_scope text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payments integer := 0;
  v_attendance integer := 0;
  v_bookings integer := 0;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if p_scope not in ('payments', 'attendance', 'bookings', 'all') then
    raise exception 'VALIDATION_FAILED' using errcode = '22023';
  end if;

  if p_scope in ('payments', 'all') then
    delete from public.manual_payments;
    get diagnostics v_payments = row_count;
  end if;

  if p_scope in ('attendance', 'all') then
    delete from public.manual_attendance_records;
    get diagnostics v_attendance = row_count;
  end if;

  if p_scope in ('bookings', 'all') then
    update public.class_bookings
    set status = 'cancelled', updated_at = now()
    where source = 'manual' and status = 'active';
    get diagnostics v_bookings = row_count;
  end if;

  return jsonb_build_object(
    'payments_deleted', v_payments,
    'attendance_deleted', v_attendance,
    'bookings_cancelled', v_bookings
  );
end;
$$;

revoke all on function public.admin_reset_manual_data(text) from public;
grant execute on function public.admin_reset_manual_data(text) to authenticated;

-- ------------------------------------------------------------
-- admin_get_class_participants — incluye origen de reserva
-- ------------------------------------------------------------
drop function if exists public.admin_get_class_participants(uuid);

create or replace function public.admin_get_class_participants(p_class_id uuid)
returns table (
  booking_id uuid,
  user_id uuid,
  name text,
  last_name text,
  email text,
  booking_status text,
  booking_source text,
  is_manual boolean,
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
    cb.source::text as booking_source,
    p.is_manual,
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

-- ------------------------------------------------------------
-- admin_list_manual_balance_summary — vista unificada 7 €/clase
-- ------------------------------------------------------------
create or replace function public.admin_list_manual_balance_summary()
returns table (
  user_id uuid,
  name text,
  last_name text,
  email text,
  is_manual boolean,
  paid_cents bigint,
  manual_attendance_count bigint,
  app_attendance_count bigint,
  total_attended bigint,
  balance_cents bigint,
  available_classes integer,
  debt_classes integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_price integer := public.class_price_cents();
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  return query
  with paid as (
    select mp.user_id, coalesce(sum(mp.amount_cents), 0)::bigint as paid_cents
    from public.manual_payments mp
    group by mp.user_id
  ),
  manual_att as (
    select mar.user_id, count(*)::bigint as cnt
    from public.manual_attendance_records mar
    group by mar.user_id
  ),
  app_att as (
    select a.user_id, count(*) filter (where a.attended)::bigint as cnt
    from public.attendance a
    group by a.user_id
  )
  select
    p.id as user_id,
    p.name,
    p.last_name,
    u.email::text,
    p.is_manual,
    coalesce(paid.paid_cents, 0) as paid_cents,
    coalesce(manual_att.cnt, 0) as manual_attendance_count,
    coalesce(app_att.cnt, 0) as app_attendance_count,
    coalesce(manual_att.cnt, 0) + coalesce(app_att.cnt, 0) as total_attended,
    coalesce(paid.paid_cents, 0)
      - (coalesce(manual_att.cnt, 0) + coalesce(app_att.cnt, 0)) * v_price as balance_cents,
    floor(
      greatest(
        coalesce(paid.paid_cents, 0)
          - (coalesce(manual_att.cnt, 0) + coalesce(app_att.cnt, 0)) * v_price,
        0
      )::numeric / v_price
    )::integer as available_classes,
    ceil(
      greatest(
        (coalesce(manual_att.cnt, 0) + coalesce(app_att.cnt, 0)) * v_price
          - coalesce(paid.paid_cents, 0),
        0
      )::numeric / v_price
    )::integer as debt_classes
  from public.profiles p
  join auth.users u on u.id = p.id
  left join paid on paid.user_id = p.id
  left join manual_att on manual_att.user_id = p.id
  left join app_att on app_att.user_id = p.id
  where p.role = 'user'
    and p.approval_status = 'approved'
  order by p.name, p.last_name;
end;
$$;

revoke all on function public.admin_list_manual_balance_summary() from public;
grant execute on function public.admin_list_manual_balance_summary() to authenticated;

-- ------------------------------------------------------------
-- Listados para historial / edición
-- ------------------------------------------------------------
create or replace function public.admin_list_manual_payments()
returns table (
  id uuid,
  user_id uuid,
  user_name text,
  amount_cents integer,
  classes_credited integer,
  paid_at date,
  notes text,
  created_at timestamptz
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
    mp.id,
    mp.user_id,
    p.name as user_name,
    mp.amount_cents,
    mp.classes_credited,
    mp.paid_at,
    mp.notes,
    mp.created_at
  from public.manual_payments mp
  join public.profiles p on p.id = mp.user_id
  order by mp.paid_at desc, mp.created_at desc;
end;
$$;

revoke all on function public.admin_list_manual_payments() from public;
grant execute on function public.admin_list_manual_payments() to authenticated;

create or replace function public.admin_list_manual_attendance()
returns table (
  id uuid,
  user_id uuid,
  user_name text,
  attendance_date date,
  notes text,
  created_at timestamptz
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
    mar.id,
    mar.user_id,
    p.name as user_name,
    mar.attendance_date,
    mar.notes,
    mar.created_at
  from public.manual_attendance_records mar
  join public.profiles p on p.id = mar.user_id
  order by mar.attendance_date desc, p.name;
end;
$$;

revoke all on function public.admin_list_manual_attendance() from public;
grant execute on function public.admin_list_manual_attendance() to authenticated;

create or replace function public.admin_get_manual_attendance_for_date(p_date date)
returns uuid[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ids uuid[];
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select coalesce(array_agg(mar.user_id order by mar.user_id), '{}')
  into v_ids
  from public.manual_attendance_records mar
  where mar.attendance_date = p_date;

  return v_ids;
end;
$$;

revoke all on function public.admin_get_manual_attendance_for_date(date) from public;
grant execute on function public.admin_get_manual_attendance_for_date(date) to authenticated;
