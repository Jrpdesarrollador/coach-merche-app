-- ============================================================
-- Coach Merche App — Reservas: operación segura frente a concurrencia
-- ============================================================

-- ------------------------------------------------------------
-- book_class
--
-- El bloqueo FOR UPDATE sobre la fila de la clase serializa todos los
-- intentos de reserva de esa clase, de modo que dos alumnas no pueden
-- ocupar simultáneamente la última plaza.
--
-- Errores (traducidos a mensajes cercanos en el frontend):
--   AUTH_REQUIRED · CLASS_NOT_FOUND · CLASS_CANCELLED
--   CLASS_IN_PAST · CLASS_FULL · ALREADY_BOOKED
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

  -- Comprobar la reserva previa ANTES del aforo: si la alumna ya está
  -- apuntada debe leer "ya estás apuntada", nunca "clase completa".
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

  -- Si existía una reserva cancelada se reactiva; si ya estaba activa el
  -- WHERE impide la actualización y no se devuelve ninguna fila.
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

  return v_booking;
end;
$$;

revoke all on function public.book_class(uuid) from public;
grant execute on function public.book_class(uuid) to authenticated;

-- ------------------------------------------------------------
-- cancel_booking
-- ------------------------------------------------------------
create or replace function public.cancel_booking(p_class_id uuid)
returns public.class_bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_booking public.class_bookings;
begin
  if v_user is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  update public.class_bookings
  set status = 'cancelled',
      updated_at = now()
  where class_id = p_class_id
    and user_id = v_user
    and status = 'active'
  returning * into v_booking;

  if not found then
    raise exception 'BOOKING_NOT_FOUND' using errcode = 'P0002';
  end if;

  return v_booking;
end;
$$;

revoke all on function public.cancel_booking(uuid) from public;
grant execute on function public.cancel_booking(uuid) to authenticated;
