revoke all on function public.admin_cancel_class(uuid) from public;
revoke all on function public.admin_cancel_class(uuid) from anon;
grant execute on function public.admin_cancel_class(uuid) to authenticated;
