-- ============================================================
-- Coach Merche App — Auto-confirmación de asistencia
--
-- Regla: si la alumna tiene reserva activa y han pasado más de
-- 1 hora desde la hora de inicio de la clase (Europe/Madrid),
-- se marca attended = true y se sincronizan recompensas.
--
-- No sobrescribe decisiones manuales de admin (confirmed_by IS NOT NULL).
-- ============================================================

create or replace function public.process_auto_attendance(p_user_id uuid default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := coalesce(p_user_id, (select auth.uid()));
  v_now_madrid timestamp := (now() at time zone 'Europe/Madrid');
  v_confirmed_count integer := 0;
  v_row_count integer := 0;
  v_booking record;
begin
  if v_user is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  if v_user <> (select auth.uid()) and not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  for v_booking in
    select cb.class_id, cb.user_id
    from public.class_bookings cb
    join public.classes c on c.id = cb.class_id
    where cb.user_id = v_user
      and cb.status = 'active'
      and c.status <> 'cancelled'
      and (c.date + c.start_time + interval '1 hour') < v_now_madrid
      and not exists (
        select 1
        from public.attendance a
        where a.class_id = cb.class_id
          and a.user_id = cb.user_id
          and (a.confirmed_by is not null or a.attended)
      )
  loop
    insert into public.attendance (class_id, user_id, attended, confirmed_by, confirmed_at)
    values (v_booking.class_id, v_booking.user_id, true, null, now())
    on conflict (class_id, user_id) do update
      set attended = true,
          confirmed_at = now()
      where attendance.confirmed_by is null;

    get diagnostics v_row_count = row_count;
    if v_row_count > 0 then
      v_confirmed_count := v_confirmed_count + 1;
    end if;
  end loop;

  update public.classes c
  set status = 'completed',
      updated_at = now()
  where c.status = 'scheduled'
    and (c.date + c.start_time + interval '1 hour') < v_now_madrid;

  perform public.sync_user_rewards(v_user);

  return v_confirmed_count;
end;
$$;

revoke all on function public.process_auto_attendance(uuid) from public;
grant execute on function public.process_auto_attendance(uuid) to authenticated;
