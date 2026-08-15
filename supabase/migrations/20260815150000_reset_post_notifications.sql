-- Permite reintentar push/email si fallaron (p. ej. VAPID o Resend mal configurados).

create or replace function public.reset_post_notifications(p_post_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  update public.posts
  set notification_sent_at = null
  where id = p_post_id
    and published = true;

  return found;
end;
$$;

revoke all on function public.reset_post_notifications(uuid) from public;
grant execute on function public.reset_post_notifications(uuid) to authenticated;
