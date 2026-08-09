-- ============================================================
-- Coach Merche App — Storage
--
-- Buckets públicos en lectura (los carteles se muestran en la app)
-- y escritura restringida.
--   avatars  → cada alumna gestiona su carpeta {user_id}/…
--   workouts → solo admin
--   posts    → solo admin
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'avatars',
    'avatars',
    true,
    2097152, -- 2 MB
    array['image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'workouts',
    'workouts',
    true,
    5242880, -- 5 MB
    array['image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'posts',
    'posts',
    true,
    5242880, -- 5 MB
    array['image/jpeg', 'image/png', 'image/webp']
  )
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ------------------------------------------------------------
-- Lectura pública de los tres buckets.
-- ------------------------------------------------------------
drop policy if exists "storage_public_read" on storage.objects;
create policy "storage_public_read"
  on storage.objects for select
  to public
  using (bucket_id in ('avatars', 'workouts', 'posts'));

-- ------------------------------------------------------------
-- avatars: cada usuaria solo escribe dentro de su propia carpeta.
-- Ruta esperada: {user_id}/avatar.webp
-- ------------------------------------------------------------
drop policy if exists "storage_avatars_insert_own" on storage.objects;
create policy "storage_avatars_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "storage_avatars_update_own" on storage.objects;
create policy "storage_avatars_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "storage_avatars_delete_own" on storage.objects;
create policy "storage_avatars_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- ------------------------------------------------------------
-- workouts y posts: escritura reservada a admin.
-- ------------------------------------------------------------
drop policy if exists "storage_admin_insert" on storage.objects;
create policy "storage_admin_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id in ('workouts', 'posts') and public.is_admin());

drop policy if exists "storage_admin_update" on storage.objects;
create policy "storage_admin_update"
  on storage.objects for update
  to authenticated
  using (bucket_id in ('workouts', 'posts') and public.is_admin())
  with check (bucket_id in ('workouts', 'posts') and public.is_admin());

drop policy if exists "storage_admin_delete" on storage.objects;
create policy "storage_admin_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id in ('workouts', 'posts') and public.is_admin());
