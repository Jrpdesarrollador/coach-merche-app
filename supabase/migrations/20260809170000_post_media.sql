-- ============================================================
-- Coach Merche App — posts con imagen/vídeo + avisos
-- ============================================================

-- Campos de media en posts (mantiene published e image_url legacy)
alter table public.posts
  add column if not exists image_path text,
  add column if not exists video_path text,
  add column if not exists media_type text not null default 'none'
    check (media_type in ('none', 'image', 'video')),
  add column if not exists published_at timestamptz;

create index if not exists posts_published_at_idx
  on public.posts (published, published_at desc nulls last, created_at desc);

-- ------------------------------------------------------------
-- Storage — bucket privado post-media (vídeos de publicaciones)
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-media',
  'post-media',
  false,
  524288000, -- 500 MB
  array['video/mp4', 'video/webm', 'video/quicktime']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "storage_post_media_admin_insert" on storage.objects;
create policy "storage_post_media_admin_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'post-media' and public.is_admin());

drop policy if exists "storage_post_media_admin_update" on storage.objects;
create policy "storage_post_media_admin_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'post-media' and public.is_admin())
  with check (bucket_id = 'post-media' and public.is_admin());

drop policy if exists "storage_post_media_admin_delete" on storage.objects;
create policy "storage_post_media_admin_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'post-media' and public.is_admin());

drop policy if exists "storage_post_media_approved_read" on storage.objects;
create policy "storage_post_media_approved_read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'post-media'
    and (
      public.is_admin()
      or public.is_approved_member()
    )
  );

-- ------------------------------------------------------------
-- notifications — tipo new_post
-- ------------------------------------------------------------
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (
  type in (
    'class_reminder',
    'new_workout',
    'new_class',
    'custom',
    'booking_confirmed',
    'new_post'
  )
);

-- ------------------------------------------------------------
-- notify_new_post — avisa a alumnas aprobadas (Basic y Pro)
-- ------------------------------------------------------------
create or replace function public.notify_new_post()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.published and (tg_op = 'INSERT' or old.published is distinct from new.published) then
    insert into public.notifications (user_id, type, title, body, metadata)
    select
      p.id,
      'new_post',
      'Nueva publicación de Merche',
      coalesce(new.title, 'Hay novedades en la app'),
      jsonb_build_object('post_id', new.id)
    from public.profiles p
    where p.role = 'user'
      and p.approval_status = 'approved';
  end if;

  return new;
end;
$$;

drop trigger if exists posts_notify_new on public.posts;
create trigger posts_notify_new
  after insert or update of published on public.posts
  for each row execute function public.notify_new_post();
