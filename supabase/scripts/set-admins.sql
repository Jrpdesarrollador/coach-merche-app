-- Asigna rol admin a Jesús y Merche (ejecutar en Supabase SQL Editor).
-- Los perfiles deben existir: se crean al registrarse vía trigger de signup.
--
-- MERCHE (merche.valverde@outlook.com):
-- Una sola cuenta; no hace falta un segundo usuario alumna. Con role = 'admin'
-- y su email en la allowlist de src/features/auth/viewMode.ts, en Perfil puede
-- alternar "Ver como admin" / "Ver como alumna" sin cambiar el rol en BD.
--
-- Si Merche aún no existe en auth.users, créala en Dashboard → Authentication
-- → Users → Add user (marca Auto Confirm User si el registro falla por rate limit).
-- Luego ejecuta el bloque individual de abajo o el UPDATE conjunto.
--
-- Script individual para Merche (cuando ya exista en auth.users):
--   update public.profiles
--   set role = 'admin', name = 'Merche'
--   where id = (select id from auth.users where email = 'merche.valverde@outlook.com');
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
