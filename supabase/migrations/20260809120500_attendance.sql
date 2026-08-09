-- ============================================================
-- Coach Merche App — attendance
-- Fuente de verdad del contador de entrenamientos realizados.
-- ============================================================

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  attended boolean not null default false,
  confirmed_by uuid references public.profiles (id) on delete set null,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint attendance_unique_user_per_class unique (class_id, user_id)
);

create index if not exists attendance_class_id_idx on public.attendance (class_id);
create index if not exists attendance_user_id_idx on public.attendance (user_id);
create index if not exists attendance_attended_idx
  on public.attendance (user_id)
  where attended;

alter table public.attendance enable row level security;

-- La alumna consulta su histórico; nunca puede escribirlo.
drop policy if exists "attendance_select" on public.attendance;
create policy "attendance_select"
  on public.attendance for select
  to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

drop policy if exists "attendance_admin_insert" on public.attendance;
create policy "attendance_admin_insert"
  on public.attendance for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "attendance_admin_update" on public.attendance;
create policy "attendance_admin_update"
  on public.attendance for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "attendance_admin_delete" on public.attendance;
create policy "attendance_admin_delete"
  on public.attendance for delete
  to authenticated
  using (public.is_admin());
