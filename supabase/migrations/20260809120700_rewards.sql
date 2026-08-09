-- ============================================================
-- Coach Merche App — rewards + user_rewards
-- Los umbrales son configurables desde el panel de admin.
-- ============================================================

create table if not exists public.rewards (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 80),
  description text,
  icon text,
  required_workouts integer not null check (required_workouts > 0),
  reward_type text not null check (reward_type in ('digital', 'physical', 'experience')),
  prize_description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rewards_name_unique unique (name)
);

create index if not exists rewards_active_idx on public.rewards (active, required_workouts);

create or replace trigger rewards_set_updated_at
  before update on public.rewards
  for each row execute function public.set_updated_at();

alter table public.rewards enable row level security;

drop policy if exists "rewards_select" on public.rewards;
create policy "rewards_select"
  on public.rewards for select
  to authenticated
  using (active or public.is_admin());

drop policy if exists "rewards_admin_insert" on public.rewards;
create policy "rewards_admin_insert"
  on public.rewards for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "rewards_admin_update" on public.rewards;
create policy "rewards_admin_update"
  on public.rewards for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "rewards_admin_delete" on public.rewards;
create policy "rewards_admin_delete"
  on public.rewards for delete
  to authenticated
  using (public.is_admin());

-- ------------------------------------------------------------

create table if not exists public.user_rewards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  reward_id uuid not null references public.rewards (id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  status text not null default 'unlocked'
    check (status in ('unlocked', 'pending_delivery', 'delivered')),
  delivered_at timestamptz,
  constraint user_rewards_unique unique (user_id, reward_id)
);

create index if not exists user_rewards_user_id_idx on public.user_rewards (user_id);
create index if not exists user_rewards_pending_idx
  on public.user_rewards (status)
  where status = 'pending_delivery';

alter table public.user_rewards enable row level security;

-- La alumna solo consulta las suyas; nunca puede asignárselas.
drop policy if exists "user_rewards_select" on public.user_rewards;
create policy "user_rewards_select"
  on public.user_rewards for select
  to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

drop policy if exists "user_rewards_admin_insert" on public.user_rewards;
create policy "user_rewards_admin_insert"
  on public.user_rewards for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "user_rewards_admin_update" on public.user_rewards;
create policy "user_rewards_admin_update"
  on public.user_rewards for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "user_rewards_admin_delete" on public.user_rewards;
create policy "user_rewards_admin_delete"
  on public.user_rewards for delete
  to authenticated
  using (public.is_admin());
