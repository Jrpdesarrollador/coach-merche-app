-- ============================================================
-- Coach Merche App — Horario fijo de clases
--
-- Solo se programan clases los martes y jueves a las 19:00
-- (Europe/Madrid). Elimina clases futuras fuera de ese horario
-- y bloquea nuevas inserciones/actualizaciones que no cumplan.
--
-- Las clases pasadas se conservan para historial (asistencia,
-- pagos, recompensas). class_bookings y attendance se eliminan
-- en cascada al borrar clases futuras.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Eliminar clases futuras programadas fuera de horario
-- ------------------------------------------------------------
delete from public.classes c
where c.status = 'scheduled'
  and (c.date + c.start_time) >= (now() at time zone 'Europe/Madrid')
  and not (
    extract(dow from c.date) in (2, 4)
    and c.start_time = '19:00'::time
  );

-- ------------------------------------------------------------
-- 2. Validar horario en inserciones/actualizaciones futuras
-- ------------------------------------------------------------
create or replace function public.enforce_class_schedule()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_now_madrid timestamp;
begin
  if new.status <> 'scheduled' then
    return new;
  end if;

  v_now_madrid := now() at time zone 'Europe/Madrid';

  -- Clases ya celebradas o en curso: no restringir (historial).
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

drop trigger if exists classes_enforce_schedule on public.classes;

create trigger classes_enforce_schedule
  before insert or update on public.classes
  for each row execute function public.enforce_class_schedule();

comment on function public.enforce_class_schedule() is
  'Impide programar clases futuras fuera de martes/jueves 19:00 (Europe/Madrid).';

-- ------------------------------------------------------------
-- 3. Regenerar ventana recurrente tras la limpieza
-- ------------------------------------------------------------
select public.ensure_recurring_classes(12);
