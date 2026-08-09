-- ============================================================
-- Coach Merche App — class_bookings
-- ============================================================

create table if not exists public.class_bookings (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint class_bookings_unique_user_per_class unique (class_id, user_id)
);

create index if not exists class_bookings_class_id_idx on public.class_bookings (class_id);
create index if not exists class_bookings_user_id_idx on public.class_bookings (user_id);
create index if not exists class_bookings_active_idx
  on public.class_bookings (class_id)
  where status = 'active';

create or replace trigger class_bookings_set_updated_at
  before update on public.class_bookings
  for each row execute function public.set_updated_at();

alter table public.class_bookings enable row level security;

-- Lectura: la alumna ve sus reservas; admin ve todas.
-- El recuento de plazas ocupadas se expone mediante la vista class_availability.
drop policy if exists "class_bookings_select" on public.class_bookings;
create policy "class_bookings_select"
  on public.class_bookings for select
  to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

-- La creación de reservas pasa siempre por la RPC book_class (control de aforo
-- y concurrencia). No se concede INSERT directo a las alumnas.
drop policy if exists "class_bookings_admin_insert" on public.class_bookings;
create policy "class_bookings_admin_insert"
  on public.class_bookings for insert
  to authenticated
  with check (public.is_admin());

-- La alumna solo puede cancelar su propia reserva.
drop policy if exists "class_bookings_update_own" on public.class_bookings;
create policy "class_bookings_update_own"
  on public.class_bookings for update
  to authenticated
  using (user_id = (select auth.uid()) or public.is_admin())
  with check (user_id = (select auth.uid()) or public.is_admin());

drop policy if exists "class_bookings_admin_delete" on public.class_bookings;
create policy "class_bookings_admin_delete"
  on public.class_bookings for delete
  to authenticated
  using (public.is_admin());

-- ------------------------------------------------------------
-- Disponibilidad por clase: plazas ocupadas y libres.
--
-- La vista se define con security_invoker = false a propósito. Con
-- security_invoker = true se aplicaría la RLS de class_bookings y cada
-- alumna solo contaría SUS reservas, devolviendo un aforo incorrecto.
-- La vista expone únicamente agregados (nunca la identidad de las
-- inscritas), por lo que no filtra información personal.
-- ------------------------------------------------------------
create or replace view public.class_availability
with (security_invoker = false)
as
select
  c.id as class_id,
  c.capacity,
  count(b.id) filter (where b.status = 'active')::int as booked_count,
  greatest(c.capacity - count(b.id) filter (where b.status = 'active'), 0)::int as available_count
from public.classes c
left join public.class_bookings b on b.class_id = c.id
group by c.id, c.capacity;

grant select on public.class_availability to authenticated;
