-- ============================================================
-- Coach Merche App — planificación diaria de contenido
-- Merche asigna a cada fecha un entrenamiento y/o publicación.
-- Las alumnas solo pueden consultar los planes que ya han llegado
-- según el calendario de Europe/Madrid.
-- ============================================================

create table if not exists public.daily_plans (
  id uuid primary key default gen_random_uuid(),
  plan_date date not null unique,
  workout_id uuid references public.workouts (id) on delete set null,
  post_id uuid references public.posts (id) on delete set null,
  note text check (note is null or char_length(note) <= 500),
  active boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_plans_has_content check (
    workout_id is not null
    or post_id is not null
    or nullif(trim(note), '') is not null
  )
);

create index if not exists daily_plans_date_active_idx
  on public.daily_plans (plan_date desc, active);

create or replace trigger daily_plans_set_updated_at
  before update on public.daily_plans
  for each row execute function public.set_updated_at();

alter table public.daily_plans enable row level security;

drop policy if exists "daily_plans_select" on public.daily_plans;
create policy "daily_plans_select"
  on public.daily_plans for select
  to authenticated
  using (
    public.is_admin()
    or (
      active
      and plan_date <= (now() at time zone 'Europe/Madrid')::date
      and public.is_approved_member()
    )
  );

drop policy if exists "daily_plans_admin_insert" on public.daily_plans;
create policy "daily_plans_admin_insert"
  on public.daily_plans for insert
  to authenticated
  with check (public.is_admin() and created_by = auth.uid());

drop policy if exists "daily_plans_admin_update" on public.daily_plans;
create policy "daily_plans_admin_update"
  on public.daily_plans for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "daily_plans_admin_delete" on public.daily_plans;
create policy "daily_plans_admin_delete"
  on public.daily_plans for delete
  to authenticated
  using (public.is_admin());

revoke all on table public.daily_plans from anon;
grant select, insert, update, delete on table public.daily_plans to authenticated;

-- Mantiene abiertas las pantallas de Inicio sincronizadas cuando Merche
-- cambia el plan, el vídeo o la publicación seleccionada.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'daily_plans'
    ) then
      alter publication supabase_realtime add table public.daily_plans;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'workouts'
    ) then
      alter publication supabase_realtime add table public.workouts;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'posts'
    ) then
      alter publication supabase_realtime add table public.posts;
    end if;
  end if;
end;
$$;
