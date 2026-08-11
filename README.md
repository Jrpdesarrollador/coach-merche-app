# Coach Merche App

Aplicación móvil/PWA para gestionar las clases colectivas de Coach Merche y ofrecer una experiencia digital premium a su comunidad de alumnas.

## Stack

- React + TypeScript + Vite
- Tailwind CSS
- Supabase (Auth, PostgreSQL, Storage)
- Hosting previsto: Vercel
- Formato: PWA (Fase 13)

## Instalación

```bash
npm install
cp .env.example .env.local
```

Completa en `.env.local`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Scripts

| Script                 | Descripción                                                             |
| ---------------------- | ----------------------------------------------------------------------- |
| `npm run dev`          | Servidor de desarrollo                                                  |
| `npm run build`        | Build de producción + typecheck                                         |
| `npm run preview`      | Vista previa del build                                                  |
| `npm run lint`         | Oxlint                                                                  |
| `npm run format`       | Prettier (escritura)                                                    |
| `npm run format:check` | Prettier (verificación)                                                 |
| `npm run db:validate`  | Migraciones + reglas de negocio en PostgreSQL en memoria (sin red)      |
| `npm run db:login`     | Autentica el CLI de Supabase en tu cuenta (abre el navegador)           |
| `npm run db:link`      | Enlaza esta carpeta con el proyecto de Supabase de Coach Merche         |
| `npm run db:status`    | Lista qué migraciones están aplicadas en el proyecto remoto y cuáles no |
| `npm run db:push:dry`  | Simula el push: muestra qué migraciones se aplicarían, sin aplicarlas   |
| `npm run db:push`      | Aplica las migraciones pendientes al proyecto remoto                    |
| `npm run db:push:seed` | Igual que `db:push` pero además carga `supabase/seed.sql` (ver aviso)   |
| `npm run db:types`     | Regenera `src/types/database.generated.ts` desde la BD remota           |

## Estructura

```text
src/
  app/
  components/
  features/     # auth, classes, bookings, workouts, posts, rewards, attendance, profiles, admin
  hooks/
  layouts/
  lib/          # cliente Supabase y utilidades de infraestructura
  pages/
  routes/
  services/     # acceso a datos centralizado
  styles/       # design tokens
  types/        # tipos de dominio y de la base de datos
  utils/

scripts/
  validate-migrations.mjs

public/assets/
  brand/
  workouts/
  posts/
  icons/

supabase/
  config.toml   # configuracion del CLI de Supabase
  migrations/   # migraciones SQL versionadas
  seed.sql      # datos iniciales
```

## Rutas de la aplicación

Las rutas están definidas en `src/routes/index.tsx`. Todas las direcciones están
en español porque son visibles para las alumnas.

| Ruta                | Pantalla                             | Acceso                            |
| ------------------- | ------------------------------------ | --------------------------------- |
| `/`                 | Inicio                               | Requiere sesión                   |
| `/clases`           | Clases y reservas                    | Requiere sesión                   |
| `/entrenamientos`   | Entrenamientos                       | Requiere sesión                   |
| `/recompensas`      | Recompensas                          | Requiere sesión                   |
| `/perfil`           | Perfil de la alumna                  | Requiere sesión                   |
| `/gestion`          | Panel admin — resumen                | Requiere sesión **y** rol `admin` |
| `/gestion/usuarios` | Alumnas, aprobaciones y stats expandibles | Admin                             |
| `/gestion/historial`| Timeline pagos, cuotas, asistencias y reservas | Admin                        |
| `/gestion/clases`   | Clases con contador de apuntadas     | Admin                             |
| `/gestion/clases/:id` | Detalle: participantes y asistencia | Admin                             |
| `/gestion/pagos`    | Control manual de cuotas             | Admin                             |
| `/gestion/notificaciones` | Enviar avisos + historial      | Admin                             |
| `/design`           | Validación interna del design system | Requiere sesión                   |
| `/login`            | Iniciar sesión                       | Pública (solo sin sesión)         |
| `/registro`         | Crear cuenta                         | Pública (solo sin sesión)         |
| `/recuperar-acceso` | Pedir el correo de recuperación      | Pública (solo sin sesión)         |
| `/nueva-contrasena` | Definir la contraseña nueva          | Pública                           |

- **Pública (solo sin sesión):** si ya has iniciado sesión, la app te redirige a
  la aplicación en lugar de mostrarte el formulario.
- `/nueva-contrasena` es la única pantalla de acceso que **no** se bloquea con
  sesión activa: el enlace del correo de recuperación abre la app ya con una
  sesión temporal, así que la pantalla tiene que ser accesible en ese estado.
- `/gestion/*` está protegida además por rol (`effectiveIsAdmin`): una alumna que
  escriba la URL a mano no entra. El panel usa un layout propio sin la navegación
  inferior de alumna.
- `/design` es una pantalla interna de trabajo, no forma parte del producto que
  ve la alumna.
- Cualquier otra dirección dentro de la app muestra la pantalla de "no
  encontrado".

## Modo aviso sin configuración

Si `.env.local` no tiene `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`, la app
**arranca igualmente**: puedes navegar y ver la interfaz, pero las pantallas de
acceso muestran un aviso claro de que todavía no hay conexión con el servidor y
no se puede iniciar sesión ni registrarse.

Esto es **intencionado**, no un fallo. Permite trabajar en el diseño y en las
pantallas sin depender del backend. En cuanto rellenas las dos variables y
reinicias `npm run dev`, el aviso desaparece y el acceso funciona con normalidad.

## Supabase

### Setup de Supabase con el CLI

El CLI de Supabase está instalado como dependencia de desarrollo del proyecto
(no hace falta instalarlo en el sistema). Se invoca siempre con `npx supabase`
o a través de los scripts `npm run db:*`.

```bash
npx supabase --version
```

#### Paso 0 — Datos que necesitas del dashboard

Entra en [supabase.com/dashboard](https://supabase.com/dashboard) y abre tu
proyecto. Necesitas tres datos:

| Dato                       | Dónde encontrarlo                                                                                                                                                                                   |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Project URL**            | _Project Settings → Data API_. Tiene la forma `https://xxxxxxxxxxxxxxxxxxxx.supabase.co`                                                                                                            |
| **anon / publishable key** | _Project Settings → API Keys_. Es la clave pública del cliente                                                                                                                                      |
| **Project ref**            | Es el identificador corto del proyecto: el `xxxxxxxxxxxxxxxxxxxx` de la Project URL. También aparece en la URL del dashboard (`/dashboard/project/<PROJECT_REF>`) y en _Project Settings → General_ |

Además necesitarás la **contraseña de la base de datos** (la que definiste al
crear el proyecto). Si no la recuerdas, puedes regenerarla en
_Project Settings → Database → Database password → Reset database password_.

#### Paso 1 — Variables de entorno

La URL y la anon key van en `.env.local`, que **no se sube a git**:

```bash
cp .env.example .env.local
```

Rellena en `.env.local`:

```text
VITE_SUPABASE_URL=https://<PROJECT_REF>.supabase.co
VITE_SUPABASE_ANON_KEY=<TU_ANON_KEY>
VITE_APP_TIMEZONE=Europe/Madrid
```

#### Paso 2 — Autenticar el CLI

Abre el navegador para vincular el CLI con tu cuenta de Supabase:

```bash
npx supabase login
```

#### Paso 3 — Enlazar el proyecto remoto

El script ya apunta al proyecto de Coach Merche. El CLI pedirá la contraseña de
la base de datos:

```bash
npm run db:link
```

Si alguna vez necesitas enlazar otro proyecto (por ejemplo uno de pruebas),
pásale su ref directamente al CLI:

```bash
npx supabase link --project-ref <OTRO_PROJECT_REF>
```

Esto guarda el enlace en `supabase/.temp/` (ignorado por git). A partir de aquí,
los scripts con `--linked` ya saben a qué proyecto apuntan.

#### Paso 4 — Aplicar las migraciones

Primero comprueba qué se aplicaría, sin tocar nada:

```bash
npm run db:push:dry
```

Si la lista es la esperada (las 11 migraciones de `supabase/migrations/`),
aplícalas:

```bash
npm run db:push
```

Para ver en cualquier momento el estado local frente al remoto:

```bash
npm run db:status
```

#### Paso 5 — Datos iniciales (seed)

`supabase/seed.sql` crea los niveles de recompensa iniciales. En una base de
datos **nueva y vacía**:

```bash
npm run db:push:seed
```

> **Aviso:** no ejecutes el seed a ciegas contra una base de datos con datos
> reales. El seed está pensado para poblar una BD recién creada; ejecutarlo sobre
> datos de producción puede duplicar o sobrescribir filas. Si la BD ya está en
> uso, revisa antes el contenido de `supabase/seed.sql` y aplica solo lo que
> necesites desde el SQL Editor.

#### Paso 6 — Regenerar los tipos de TypeScript

```bash
npm run db:types
```

Esto escribe `src/types/database.generated.ts` a partir del esquema real del
proyecto remoto.

> **Importante:** el generador **no** sobrescribe `src/types/database.ts`. Ese
> fichero contiene los tipos escritos a mano que el código importa hoy. Los
> tipos generados se dejan aparte, en `database.generated.ts`, para poder
> comparar ambos y migrar el código de forma controlada más adelante en lugar de
> romper los imports de golpe.

#### Paso 7 — URLs de redirección de autenticación

Cuando una alumna pide recuperar su contraseña, Supabase le manda un correo con
un enlace que debe devolverla a la pantalla `/nueva-contrasena`. La app pide esa
redirección con la dirección desde la que se está usando (por ejemplo
`http://localhost:5173/nueva-contrasena` en desarrollo).

Supabase **solo acepta direcciones que estén autorizadas de antemano, y las
compara exactas**. Si `/nueva-contrasena` no está en la lista, el enlace del
correo deja a la usuaria en la portada y la recuperación no se puede terminar.

- **En local** ya está resuelto: `supabase/config.toml` incluye esas direcciones
  en `auth.additional_redirect_urls`. Hay un comentario en el fichero explicando
  por qué están; no las borres.
- **En producción hay que darlas de alta a mano.** `config.toml` solo gobierna el
  entorno local del CLI, no el proyecto de la nube. En el dashboard, ve a
  **Authentication → URL Configuration** y configura:
  - **Site URL:** el dominio público de la app, por ejemplo
    `https://coach-merche.vercel.app`.
  - **Redirect URLs:** añade `https://coach-merche.vercel.app/nueva-contrasena`.

Si además usas las URLs de vista previa de Vercel, cada dominio de preview
necesitaría su propia entrada; lo habitual es probar la recuperación solo en
local y en el dominio definitivo.

#### Paso 8 — Convertir a Merche en admin

Toda cuenta nueva se crea con `role = 'user'`. El primer administrador hay que
crearlo desde el **SQL Editor** del dashboard de Supabase, y no desde la app.

El motivo: la tabla `profiles` tiene un trigger de protección
(`profiles_protect_role`) que rechaza cualquier cambio de `role` hecho desde una
sesión de cliente si quien lo intenta no es ya admin. Como todavía no hay ningún
admin, desde la app es imposible. En el SQL Editor no hay sesión de cliente, así
que el trigger deja pasar el cambio: es la puerta prevista a propósito para este
caso.

1. Registra la cuenta de Merche desde la app, con su correo real.
2. Abre el dashboard de Supabase → **SQL Editor** y ejecuta, sustituyendo el
   correo:

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'EMAIL_DE_MERCHE');
```

3. Comprueba que ha funcionado:

```sql
select p.id, p.name, p.role, u.email
from public.profiles p
join auth.users u on u.id = p.id
where p.role = 'admin';
```

4. Merche debe cerrar sesión y volver a entrar en la app para que se recargue su
   perfil y aparezca el área de gestión.

Alternativa: el script `supabase/scripts/set-admins.sql` asigna admin a Jesús y
Merche en un solo `UPDATE`. Para Merche concreta:

```sql
update public.profiles
set role = 'admin', name = 'Merche'
where id = (select id from auth.users where email = 'merche.valverde@outlook.com');
```

Si la cuenta aún no existe, créala en **Authentication → Users → Add user** con
**Auto Confirm User** (útil si el registro público está bloqueado por rate limit).

#### Vista dual admin/alumna (Merche y Jesús)

Merche (`merche.valverde@outlook.com`) y Jesús (`jrodriguezpomeda@gmail.com`) usan
**un solo login** para las dos experiencias. No hace falta crear un segundo
usuario alumna.

Requisitos:

- `profiles.role = 'admin'` en Supabase (Paso 8 o `set-admins.sql`).
- Email en la allowlist de `src/features/auth/viewMode.ts`.

En la app: **Perfil** → tarjeta **Vista de la app** → alternar **Ver como admin**
/ **Ver como alumna**. La preferencia se guarda en el dispositivo. El rol en BD
sigue siendo `admin`; en vista alumna se oculta gestión y se muestra la
experiencia de una alumna.

> A partir de aquí, un admin sí puede cambiar el rol de otras cuentas. Una alumna
> nunca puede ascenderse a sí misma: el trigger lanza el error
> `ROLE_CHANGE_NOT_ALLOWED`.

#### Solución de problemas — «Solo veo perfil de alumna»

**Síntomas:** la cuenta entra bien, se ve el nombre y el correo en **Perfil**, aparece
«Tu actividad», pero **no** hay tarjeta «Vista de la app», badge «Entrenadora» ni
acceso a **Gestión**.

**Causa habitual:** el perfil existe con `role = 'user'`. Toda cuenta nueva se crea
así por defecto (trigger `handle_new_user`); el `UPDATE` de admin del Paso 8 o de
`supabase/scripts/set-admins.sql` **aún no se ha ejecutado** en el proyecto de
Supabase en la nube.

**Diagnóstico** (SQL Editor del dashboard):

```sql
select p.id, p.name, p.role, u.email
from public.profiles p
join auth.users u on u.id = p.id
where u.email = 'merche.valverde@outlook.com';
```

Si `role` es `user`, ese es el problema. No es un bug de la app: el toggle, el badge
y el panel de gestión solo aparecen cuando `profiles.role = 'admin'` **y** (para el
toggle) el email está en la allowlist de `src/features/auth/viewMode.ts` — Merche ya
está en esa lista.

**Solución:**

```sql
update public.profiles
set role = 'admin', name = 'Merche'
where id = (
  select id from auth.users where email = 'merche.valverde@outlook.com'
);
```

O ejecuta el script completo `supabase/scripts/set-admins.sql`.

**Después:** Merche debe **cerrar sesión y volver a entrar** para recargar el perfil.
En **Perfil** debería verse la tarjeta «Vista de la app», el badge «Entrenadora» y
el botón «Ir al panel de gestión».

**Si el `SELECT` no devuelve filas:** la cuenta existe en Auth pero no tiene perfil
(raro: el trigger debería haberlo creado al registrarse). Comprueba en
**Authentication → Users** que el email coincide exactamente. Si hace falta, crea
el perfil a mano desde el SQL Editor (solo en ese caso excepcional).

**Si `role` ya es `admin` y sigue sin verse:** comprueba que el email de sesión
coincide con el de la allowlist (no importan mayúsculas/minúsculas). Borra la
preferencia local `coach-merche-view-mode` en las herramientas de desarrollo del
navegador y recarga; si estaba en `user`, la UI oculta gestión hasta volver a
«Ver como admin».

#### Cómo se crea el perfil al registrarse

El frontend **no inserta perfiles**, y de hecho no podría: la tabla `profiles` no
tiene ninguna política de `INSERT` para el cliente. Lo hace la propia base de
datos con el trigger `on_auth_user_created`, que se dispara al crearse el usuario
en `auth.users` y crea la fila de `profiles` tomando el nombre de los metadatos
que la app envía en el registro (si no llega ninguno, usa la parte del correo
anterior a la `@`).

Consecuencia práctica: si alguna vez creas una cuenta a mano desde el dashboard,
su perfil se crea igualmente; y si ves una cuenta sin perfil, el problema está en
el trigger, no en la app.

#### Desarrollo local con Docker (opcional)

`npx supabase start` levanta una pila completa de Supabase en tu máquina, pero
**requiere Docker Desktop**. En la máquina de desarrollo actual Docker **no está
instalado** (`docker --version` no se reconoce como comando), así que esa vía no
está disponible por ahora. No es un problema: todo el flujo descrito arriba
trabaja directamente contra el proyecto de la nube y no necesita Docker.

Sin Docker tampoco está disponible `supabase db diff`, que necesita una base de
datos "sombra" local. Para validar cambios de esquema sin red ni Docker usa
`npm run db:validate`, que levanta PostgreSQL en memoria con PGlite.

#### Qué es secreto y qué no

| Valor                                   | ¿Se puede commitear?                                                              |
| --------------------------------------- | --------------------------------------------------------------------------------- |
| `VITE_SUPABASE_URL`                     | No es secreta, pero vive en `.env.local` (no en git)                              |
| `VITE_SUPABASE_ANON_KEY`                | **Pública por diseño**: viaja en el bundle del frontend. Aun así, en `.env.local` |
| Contraseña de la base de datos          | **SECRETA.** Nunca en git, nunca en el código                                     |
| `service_role` key                      | **SECRETA Y CRÍTICA.** Ver aviso abajo                                            |
| Access token del CLI (`supabase login`) | **SECRETO.** Lo guarda el CLI fuera del repositorio                               |

- La **anon key es pública por diseño**: está pensada para ir en el frontend y
  toda la seguridad real la imponen las políticas RLS de la base de datos. Que
  sea pública no significa que haya que subirla al repositorio: se configura por
  entorno (`.env.local` en local, variables de entorno en Vercel).
- La **`service_role` key salta todas las políticas RLS**. **Nunca** debe
  aparecer en este proyecto, ni en el frontend, ni en un `.env` versionado, ni en
  una variable `VITE_*` (todo lo que empieza por `VITE_` acaba en el bundle que
  se descarga el navegador). Úsala solo desde el SQL Editor o desde un backend de
  confianza.
- `.gitignore` ya excluye `.env`, `.env.local`, `supabase/.temp/` y
  `supabase/.branches/`. Sí se versionan `supabase/config.toml`,
  `supabase/migrations/` y `supabase/seed.sql`.

### Esquema

| Tabla            | Función                                                 |
| ---------------- | ------------------------------------------------------- |
| `profiles`       | Perfil vinculado a `auth.users`, con `role`             |
| `workouts`       | Entrenamientos y sus carteles                           |
| `classes`        | Clases programadas                                      |
| `class_bookings` | Reservas, `UNIQUE(class_id, user_id)`                   |
| `attendance`     | Asistencia confirmada, `UNIQUE(class_id, user_id)`      |
| `posts`          | Publicaciones                                           |
| `rewards`        | Niveles de recompensa configurables                     |
| `user_rewards`   | Recompensas desbloqueadas, `UNIQUE(user_id, reward_id)` |

Vista `class_availability`: plazas ocupadas y libres por clase, sin exponer
quién está apuntada.

### Operaciones críticas (RPC)

Las operaciones sensibles no se resuelven en el frontend:

| Función                                                | Qué garantiza                                                                                                                                                                        |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `book_class(p_class_id)`                               | Bloquea la fila de la clase (`FOR UPDATE`), de modo que dos alumnas no puedan ocupar a la vez la última plaza. Rechaza doble reserva, aforo completo, clase cancelada y clase pasada |
| `cancel_booking(p_class_id)`                           | Cancela solo la reserva propia                                                                                                                                                       |
| `confirm_class_attendance(p_class_id, p_attendee_ids)` | Registra la asistencia de toda la clase, la cierra y desbloquea recompensas                                                                                                          |
| `sync_user_rewards(p_user_id)`                         | Desbloquea recompensas alcanzadas sin duplicar                                                                                                                                       |
| `mark_reward_delivered(p_user_reward_id)`              | Marca un premio físico como entregado                                                                                                                                                |
| `admin_list_profiles()`                              | Directorio de alumnas con email (solo admin)                                                                                                                                         |
| `admin_get_class_participants(p_class_id)`             | Inscritas de una clase con email y asistencia (solo admin)                                                                                                                           |
| `notify_class_reminders()`                           | **Stub** — recordatorios automáticos 24 h antes (Fase 13 + cron)                                                                                                                     |

### Tablas admin y notificaciones

| Tabla            | Propósito                                                                 |
| ---------------- | ------------------------------------------------------------------------- |
| `payments`       | Cuotas mensuales por alumna (`pending` / `paid` / `overdue`)              |
| `notifications`  | Avisos in-app (`booking_confirmed`, `new_workout`, `class_reminder`, …)   |

- Al reservar (`book_class`) se inserta aviso **Reserva confirmada** para la alumna
  y un aviso interno para Merche.
- Al publicar un entrenamiento activo se avisa a todas las alumnas.
- **No incluido aún (Fase 13):** push PWA / service worker, cron de recordatorios,
  pasarela Stripe (solo control manual de pagos).

El contador de entrenamientos **solo** se deriva de `attendance.attended = true`.

### Storage

Buckets: `avatars` (cada alumna escribe en su carpeta `{user_id}/`), `workouts` y
`posts` (escritura solo admin). Lectura pública, límite de tamaño y MIME types
restringidos a imágenes.

### Validación local

`npm run db:validate` levanta un PostgreSQL en memoria (PGlite), aplica todas las
migraciones y el seed, y comprueba las reglas críticas: aforo, doble reserva,
clase pasada o cancelada, aislamiento entre alumnas, permisos de admin, contador
de entrenamientos y desbloqueo de recompensas sin duplicados.

## Desarrollo local

1. `npm install`
2. Configurar `.env.local`
3. `npm run dev`
4. Abrir la URL local (móvil-first: ~390×844)

## Build

```bash
npm run build
```

## Deploy (Vercel)

1. Conectar el repositorio GitHub `coach-merche-app`
2. Framework preset: Vite
3. Definir variables de entorno `VITE_SUPABASE_*`
4. Deploy automático desde `main`

## Assets de marca

Colocar los archivos oficiales en `public/assets/brand/` cuando estén disponibles.

**No inventar** logo ni superheroína. Usar placeholders neutros hasta tener assets oficiales.

## Fases

| Fase                             | Estado                                                       |
| -------------------------------- | ------------------------------------------------------------ |
| 0 — Setup y arquitectura         | Completada                                                   |
| 1 — Design System                | Completada                                                   |
| 2 — Supabase (esquema, RLS, RPC) | ✅ Completada — migraciones aplicadas en remoto (`78e5d44`) |
| 3 — Auth                         | Completada                                                   |
| 4 — Home usuaria                 | ✅ Completada (`0aa2cc6`)                                    |
| 5 — Clases y calendario          | ✅ Completada (`ae1fcbd`)                                    |
| 6 — Reservas y cancelación       | ✅ Completada (`34b1e40`)                                    |
| 7 — Workouts                     | Pendiente                                                    |
| 8 — Posts                        | Pendiente                                                    |
| 9 — Admin móvil                  | 🟡 Parcial — panel `/gestion/*`, registrar manual, historial timeline |
| 10 — Asistencia                  | Pendiente                                                    |
| 11 — Recompensas                 | Pendiente                                                    |
| 12 — Storage                     | Pendiente                                                    |
| 13 — PWA                         | Pendiente — push notifications + cron recordatorios          |
| 14 — QA global                   | Pendiente                                                    |
| 15 — Producción (Vercel)         | Pendiente                                                    |
