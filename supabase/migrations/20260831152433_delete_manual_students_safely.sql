-- Las alumnas creadas desde el panel usan un registro auxiliar en auth.users
-- para mantener las relaciones existentes. GoTrue no reconoce esos registros
-- como identidades completas, así que su API administrativa devuelve 404.
-- Esta función permite a la Edge Function eliminarlos de forma controlada.

create or replace function public.admin_delete_manual_student(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted_id uuid;
begin
  if p_user_id is null then
    return false;
  end if;

  delete from auth.users u
  using public.profiles p
  where u.id = p_user_id
    and p.id = u.id
    and p.role = 'user'
    and p.is_manual = true
    and coalesce(u.raw_user_meta_data ->> 'is_manual', 'false') = 'true'
  returning u.id into v_deleted_id;

  return v_deleted_id is not null;
end;
$$;

revoke all on function public.admin_delete_manual_student(uuid) from public;
revoke all on function public.admin_delete_manual_student(uuid) from anon;
revoke all on function public.admin_delete_manual_student(uuid) from authenticated;
grant execute on function public.admin_delete_manual_student(uuid) to service_role;
