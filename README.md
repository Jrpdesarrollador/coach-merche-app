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
| `npm run build`        | Build de producción + typecheck (falla en Vercel/CI si faltan env vars Supabase) |
| `npm run verify:production` | Comprueba si el bundle publicado tiene Supabase real (no placeholder)       |
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
  entorno local del CLI, no el proyecto de la nube. Copia las URLs exactas de la
  sección [Supabase Auth — Producción](#3-supabase-auth--producción) (más abajo,
  en Deploy Vercel).

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

La app incluye `vercel.json` con preset Vite, salida `dist`, rewrites SPA para React
Router y cabeceras para PWA (service worker, manifest e iconos).

### 1. Conectar el repositorio

1. Entra en [vercel.com/new](https://vercel.com/new) e inicia sesión con GitHub.
2. Importa el repositorio **`Jrpdesarrollador/coach-merche-app`**.
3. Vercel detecta **Vite** automáticamente. No cambies el directorio raíz salvo que
   el proyecto viva en un subfolder (no es el caso).
4. **Build Command:** `npm run build` (ya definido en `vercel.json`). En Vercel el build
   **falla** si faltan `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — revisa los Build Logs.
5. **Output Directory:** `dist` (ya definido en `vercel.json`).
6. Pulsa **Deploy**. Los pushes a `main` despliegan producción; cada PR genera una
   URL de preview (`*.vercel.app`).

### 2. Variables de entorno en Vercel

En el proyecto → **Settings → Environment Variables**, añade estas variables para
**Production**, **Preview** y **Development**:

| Variable                   | Obligatoria | Descripción                                      |
| -------------------------- | ----------- | ------------------------------------------------ |
| `VITE_SUPABASE_URL`        | Sí          | Project URL de Supabase                          |
| `VITE_SUPABASE_ANON_KEY`   | Sí          | Clave anon / publishable del cliente             |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | No     | Alias de `VITE_SUPABASE_ANON_KEY` (mismo valor)  |
| `VITE_APP_TIMEZONE`        | No          | Por defecto `Europe/Madrid` si no se define      |
| `VITE_VAPID_PUBLIC_KEY`    | No          | Clave pública VAPID para push PWA (Fase 13)      |

> **No subas** `.env.local` ni la `service_role` key. Todo lo que empieza por `VITE_`
> acaba en el bundle del navegador.

Tras cambiar variables, **redeploy obligatorio**: Vite embebe `VITE_*` en el bundle en
**tiempo de build**. Añadir o editar variables en el dashboard **no** afecta al deployment
ya publicado hasta que vuelvas a desplegar.

1. **Deployments** → el deployment activo → **…** → **Redeploy** — **desmarca** *Use existing
   Build Cache* para forzar un build limpio con las variables actuales.
2. O haz un push a `main` para disparar un deployment automático.

Comprobación desde tu máquina (tras el redeploy):

```bash
npm run verify:production
# o contra otra URL:
npm run verify:production -- https://tu-preview.vercel.app
```

Debe mostrar `✅ Supabase configurado` con la URL `https://<PROJECT_REF>.supabase.co`.
Si muestra `placeholder.supabase.co`, el build siguió sin variables.

### Solución de problemas — «Todavía no hemos conectado la app con el servidor»

**Síntomas:** en `/login` o `/registro` aparece el aviso amarillo *«Todavía no hemos
conectado la app con el servidor…»* y, al intentar entrar, el toast *«La app todavía no
está conectada con el servidor…»*.

**Causa más habitual:** el deployment se construyó **antes** de definir
`VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en Vercel. El bundle lleva valores
placeholder (`placeholder.supabase.co`) y la app detecta correctamente que no hay backend.

**Cómo comprobarlo (DevTools → Sources):** abre el JS principal (`/assets/index-*.js`) y
busca `placeholder.supabase.co`. Si aparece, falta redeploy con las variables ya
configuradas.

**Solución:**

1. En Vercel → **Settings → Environment Variables**, confirma que existen **exactamente**
   (respetando mayúsculas):

   | Variable                 | Valor esperado                                      |
   | ------------------------ | --------------------------------------------------- |
   | `VITE_SUPABASE_URL`      | `https://<PROJECT_REF>.supabase.co`                 |
   | `VITE_SUPABASE_ANON_KEY` | Clave **anon / publishable** (no la `service_role`) |

   Alias aceptado: `VITE_SUPABASE_PUBLISHABLE_KEY` (mismo valor que la anon key).

2. En Supabase → **Project Settings → Data API / API Keys**:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** o **publishable** (`eyJ…` o `sb_publishable_…`) →
     `VITE_SUPABASE_ANON_KEY`

3. **Redeploy** (ver arriba). Espera a que termine el build y recarga con caché limpia
   (Ctrl+Shift+R).

4. Tras el redeploy, el aviso debe desaparecer y el login debe conectar con Supabase.

**Otras causas posibles:**

- Variable mal escrita (`SUPABASE_URL` sin prefijo `VITE_` no llega al frontend).
- Valor placeholder sin sustituir (`YOUR_SUPABASE_ANON_KEY` o URL de `.env.example`).
- Clave truncada al copiar/pegar (menos de 20 caracteres).
- `service_role` key en lugar de la clave pública (nunca usar la secreta en `VITE_*`).

### 3. Supabase Auth — Producción

Configura esto **una vez** en el proyecto de Supabase en la nube. Sin estas URLs,
el enlace del correo de recuperación cae en la portada y la alumna no puede terminar
de cambiar la contraseña.

#### Flujo de recuperación (cómo encaja con el código)

| Paso | Ruta / acción | Qué pasa |
| ---- | ------------- | -------- |
| 1 | `/recuperar-acceso` (`ForgotPasswordPage`) | La alumna escribe su email. |
| 2 | `authService.resetPassword()` | Llama a `resetPasswordForEmail` con `redirectTo: ${window.location.origin}/nueva-contrasena`. En producción Vercel eso es `https://coach-merche-app.vercel.app/nueva-contrasena`. |
| 3 | Correo de Supabase | Enlace con token → redirige a la URL anterior **solo si está en Redirect URLs**. |
| 4 | `/nueva-contrasena` (`ResetPasswordPage`) | Supabase abre la app con sesión de recuperación; la alumna elige contraseña nueva. |

No hay URLs fijas en el código: `redirectTo` usa siempre el origen del navegador
(`window.location.origin`), así que en Vercel funciona sin variable de entorno extra.

#### Pasos en el dashboard de Supabase

1. Abre [supabase.com/dashboard](https://supabase.com/dashboard) → proyecto **Coach Merche**.
2. Menú lateral → **Authentication** → pestaña **URL Configuration**.
3. **Site URL** — pega y guarda:

```text
https://coach-merche-app.vercel.app
```

4. **Redirect URLs** — añade **una línea por URL** (botón *Add URL*). Copia y pega:

```text
https://coach-merche-app.vercel.app/nueva-contrasena
```

5. Pulsa **Save** al final de la página.

> **Importante:** Supabase compara las redirect URLs **carácter a carácter**. Debe
> coincidir exactamente con lo que envía la app (`origin` + `/nueva-contrasena`), sin
> barra final extra.

#### Bloque copy-paste (producción actual)

| Campo | Valor exacto |
| ----- | ------------ |
| **Site URL** | `https://coach-merche-app.vercel.app` |
| **Redirect URLs** | `https://coach-merche-app.vercel.app/nueva-contrasena` |

**Desarrollo local** (ya en `supabase/config.toml`, no hace falta tocar el dashboard):

```text
http://localhost:5173/nueva-contrasena
http://127.0.0.1:5173/nueva-contrasena
```

**Previews de Vercel** (opcional): cada PR tiene su propio `*.vercel.app`. Para probar
recuperación en preview, añade también `https://<preview-url>/nueva-contrasena`. Lo
habitual es probar solo en local y en producción.

**Dominio personalizado:** si cambias el dominio en Vercel, actualiza Site URL y
Redirect URLs con el dominio nuevo.

#### Plantillas de email (opcional)

En **Authentication → Email Templates → Reset password** el enlace usa
`{{ .ConfirmationURL }}`. No hace falta editar la plantilla si Site URL y Redirect
URLs están bien: Supabase incluye el `redirect_to` que manda la app. Solo revisa la
plantilla si quieres personalizar el texto del correo (asunto, cuerpo en español).

#### Cómo probar recuperación en producción

1. Abre `https://coach-merche-app.vercel.app/recuperar-acceso`.
2. Introduce el email de una cuenta **ya registrada** en Supabase.
3. Revisa la bandeja (y spam). El enlace debe abrir
   `https://coach-merche-app.vercel.app/nueva-contrasena#...` (hash con tokens).
4. Debe mostrarse *«Crea tu contraseña nueva»*. Tras guardar, redirige al inicio con
   sesión iniciada.
5. Si ves *«Este enlace ya no sirve»* o caes en la portada sin formulario:
   - Comprueba que **Redirect URLs** incluye exactamente
     `https://coach-merche-app.vercel.app/nueva-contrasena`.
   - Comprueba que **Site URL** es `https://coach-merche-app.vercel.app` (sin `/` final).
   - El enlace caduca (~1 h); pide uno nuevo desde `/recuperar-acceso`.

### 4. Deploy con CLI (opcional)

```bash
npm install
npx vercel login          # solo la primera vez
npx vercel --prod         # producción
```

Si no hay token de Vercel, usa el dashboard (pasos 1–3). El CLI no es obligatorio.

### 5. Checklist post-deploy

- [ ] La app carga en HTTPS sin errores en consola.
- [ ] Login y registro funcionan contra Supabase.
- [ ] Recuperación de contraseña: el enlace del correo abre `/nueva-contrasena`.
- [ ] Rutas profundas (`/clases`, `/gestion`, etc.) cargan al refrescar (SPA rewrite).
- [ ] PWA: «Añadir a pantalla de inicio» muestra icono y nombre «Coach Merche».
- [ ] Service worker registrado (DevTools → Application → Service Workers).
- [ ] Merche/Jesús pueden acceder a `/gestion` con rol admin en Supabase.

### 6. Dominio personalizado (opcional)

En Vercel → **Settings → Domains** añade tu dominio (p. ej. `app.coachmerche.com`).
Actualiza **Site URL** y **Redirect URLs** en Supabase con el dominio definitivo.

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
| 15 — Producción (Vercel)         | ✅ Completada — `vercel.json`, guía deploy y env vars        |
