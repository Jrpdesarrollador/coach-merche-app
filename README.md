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
| `npm run db:link`      | Enlaza esta carpeta con tu proyecto de Supabase en la nube              |
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

Sustituye `<PROJECT_REF>` por el tuyo. El CLI pedirá la contraseña de la base de
datos:

```bash
npx supabase link --project-ref <PROJECT_REF>
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

#### Paso 7 — Convertir a Merche en admin

Registra la cuenta de Merche desde la app y después, desde el **SQL Editor** del
dashboard:

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'EMAIL_DE_MERCHE');
```

> El cambio de rol solo se permite sin sesión de cliente (SQL Editor o
> `service_role`) o si quien lo hace ya es admin. Una alumna nunca puede
> ascenderse a sí misma.

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
| 2 — Supabase (esquema, RLS, RPC) | Migraciones listas, pendiente de aplicar en el proyecto real |
| 3 — Auth                         | Siguiente                                                    |
| 4–15                             | Pendientes                                                   |
