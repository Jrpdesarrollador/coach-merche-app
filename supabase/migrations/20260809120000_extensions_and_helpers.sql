-- ============================================================
-- Coach Merche App — Base: helpers compartidos
--
-- gen_random_uuid() forma parte del núcleo de PostgreSQL desde la
-- versión 13, así que no se requiere ninguna extensión adicional.
-- ============================================================

-- ------------------------------------------------------------
-- Mantiene updated_at al día en cualquier tabla que lo use.
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
