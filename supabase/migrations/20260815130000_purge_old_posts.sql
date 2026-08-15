-- ============================================================
-- Coach Merche App — Purga automática de publicaciones antiguas
--
-- Elimina posts con más de 30 días (desde published_at o created_at)
-- y sus archivos en storage (posts + post-media).
-- No toca la tabla notifications: el historial in-app se conserva.
--
-- Invocar diariamente con Supabase Cron vía edge function purge-old-posts:
--   Cron: 0 3 * * * (03:00 UTC)
--   select public.purge_old_posts();
-- ============================================================

create or replace function public.purge_old_posts()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_post record;
  v_count integer := 0;
begin
  for v_post in
    select id, image_path, video_path
    from public.posts
    where coalesce(published_at, created_at) < now() - interval '30 days'
  loop
    if v_post.image_path is not null then
      delete from storage.objects
      where bucket_id = 'posts'
        and name = v_post.image_path;
    end if;

    if v_post.video_path is not null then
      delete from storage.objects
      where bucket_id = 'post-media'
        and name = v_post.video_path;
    end if;

    delete from public.posts
    where id = v_post.id;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.purge_old_posts() from public;
grant execute on function public.purge_old_posts() to service_role;
