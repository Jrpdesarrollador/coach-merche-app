-- Los entrenamientos activos y sus vídeos privados quedan disponibles para
-- cualquier alumna aprobada y para administradores. Solo los administradores
-- conservan permisos de subida, edición, ocultación y borrado.

alter table public.workouts
  alter column requires_pro set default false;

update public.workouts
set requires_pro = false
where requires_pro = true;

drop policy if exists "workouts_select" on public.workouts;
create policy "workouts_select"
  on public.workouts for select
  to authenticated
  using (
    public.is_admin()
    or (active and public.is_approved_member())
  );

drop policy if exists "storage_workout_videos_pro_read" on storage.objects;
drop policy if exists "storage_workout_videos_member_read" on storage.objects;
create policy "storage_workout_videos_member_read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'workout-videos'
    and public.is_approved_member()
  );

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
      and p.approval_status = 'approved';
  end if;

  return new;
end;
$$;
