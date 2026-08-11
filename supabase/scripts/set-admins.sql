-- Asigna rol admin a Jesús y Merche (ejecutar en Supabase SQL Editor).
-- Los perfiles deben existir: se crean al registrarse vía trigger de signup.
--
-- Verificar después:
--   select p.id, u.email, p.role
--   from public.profiles p
--   join auth.users u on u.id = p.id
--   where u.email in (
--     'jrodriguezpomeda@gmail.com',
--     'merche.valverde@outlook.com'
--   );

update public.profiles
set role = 'admin'
where id in (
  select id
  from auth.users
  where email in (
    'jrodriguezpomeda@gmail.com',
    'merche.valverde@outlook.com'
  )
);
