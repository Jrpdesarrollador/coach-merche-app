-- Índices de apoyo para las claves foráneas de la planificación diaria.
-- Evitan recorridos completos al borrar o actualizar recursos relacionados.

create index if not exists daily_plans_workout_id_idx
  on public.daily_plans (workout_id)
  where workout_id is not null;

create index if not exists daily_plans_post_id_idx
  on public.daily_plans (post_id)
  where post_id is not null;

create index if not exists daily_plans_created_by_idx
  on public.daily_plans (created_by)
  where created_by is not null;

drop policy if exists "daily_plans_admin_insert" on public.daily_plans;
create policy "daily_plans_admin_insert"
  on public.daily_plans for insert
  to authenticated
  with check (public.is_admin() and created_by = (select auth.uid()));
