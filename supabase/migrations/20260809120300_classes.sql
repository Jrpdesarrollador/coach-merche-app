-- ============================================================
-- Coach Merche App — classes
-- ============================================================

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts (id) on delete restrict,
  date date not null,
  start_time time not null,
  location text not null check (char_length(trim(location)) between 1 and 120),
  capacity integer not null check (capacity > 0 and capacity <= 200),
  status text not null default 'scheduled'
    check (status in ('scheduled', 'completed', 'cancelled')),
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists classes_date_idx on public.classes (date);
create index if not exists classes_date_time_idx on public.classes (date, start_time);
create index if not exists classes_status_idx on public.classes (status);
create index if not exists classes_workout_id_idx on public.classes (workout_id);

create or replace trigger classes_set_updated_at
  before update on public.classes
  for each row execute function public.set_updated_at();

alter table public.classes enable row level security;

-- Las alumnas ven todas las clases (incluidas canceladas, para entender
-- los cambios de agenda). La escritura queda reservada a admin.
drop policy if exists "classes_select" on public.classes;
create policy "classes_select"
  on public.classes for select
  to authenticated
  using (true);

drop policy if exists "classes_admin_insert" on public.classes;
create policy "classes_admin_insert"
  on public.classes for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "classes_admin_update" on public.classes;
create policy "classes_admin_update"
  on public.classes for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "classes_admin_delete" on public.classes;
create policy "classes_admin_delete"
  on public.classes for delete
  to authenticated
  using (public.is_admin());
