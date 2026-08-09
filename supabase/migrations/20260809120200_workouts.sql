-- ============================================================
-- Coach Merche App — workouts
-- Solo title y poster_url son imprescindibles para publicar.
-- ============================================================

create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 120),
  description text,
  poster_url text not null,
  video_url text,
  difficulty text check (difficulty in ('facil', 'media', 'alta')),
  duration_minutes integer check (duration_minutes > 0 and duration_minutes <= 300),
  category text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workouts_active_idx on public.workouts (active);

create or replace trigger workouts_set_updated_at
  before update on public.workouts
  for each row execute function public.set_updated_at();

alter table public.workouts enable row level security;

drop policy if exists "workouts_select" on public.workouts;
create policy "workouts_select"
  on public.workouts for select
  to authenticated
  using (active or public.is_admin());

drop policy if exists "workouts_admin_insert" on public.workouts;
create policy "workouts_admin_insert"
  on public.workouts for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "workouts_admin_update" on public.workouts;
create policy "workouts_admin_update"
  on public.workouts for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "workouts_admin_delete" on public.workouts;
create policy "workouts_admin_delete"
  on public.workouts for delete
  to authenticated
  using (public.is_admin());
