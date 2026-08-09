-- ============================================================
-- Coach Merche App — posts
-- ============================================================

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 140),
  content text,
  image_url text,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists posts_published_idx on public.posts (published, created_at desc);

create or replace trigger posts_set_updated_at
  before update on public.posts
  for each row execute function public.set_updated_at();

alter table public.posts enable row level security;

drop policy if exists "posts_select" on public.posts;
create policy "posts_select"
  on public.posts for select
  to authenticated
  using (published or public.is_admin());

drop policy if exists "posts_admin_insert" on public.posts;
create policy "posts_admin_insert"
  on public.posts for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "posts_admin_update" on public.posts;
create policy "posts_admin_update"
  on public.posts for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "posts_admin_delete" on public.posts;
create policy "posts_admin_delete"
  on public.posts for delete
  to authenticated
  using (public.is_admin());
