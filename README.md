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

| Script                 | Descripción                     |
| ---------------------- | ------------------------------- |
| `npm run dev`          | Servidor de desarrollo          |
| `npm run build`        | Build de producción + typecheck |
| `npm run preview`      | Vista previa del build          |
| `npm run lint`         | Oxlint                          |
| `npm run format`       | Prettier (escritura)            |
| `npm run format:check` | Prettier (verificación)         |
| `npm run db:validate`  | Migraciones + reglas de negocio |

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

supabase/migrations/
```

## Supabase

### Puesta en marcha

1. Crear un proyecto en [supabase.com](https://supabase.com) (región Europa).
2. Copiar `Project URL` y `anon public key` a `.env.local`.
3. Abrir el **SQL Editor** del proyecto y ejecutar, **en orden**, los ficheros de
   `supabase/migrations/`.
4. Ejecutar `supabase/seed.sql` para crear los niveles de recompensa iniciales.
5. Registrar la cuenta de Merche desde la app y, después, convertirla en admin
   desde el SQL Editor:

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'EMAIL_DE_MERCHE');
```

> El cambio de rol solo se permite sin sesión de cliente (SQL Editor o
> `service_role`) o si quien lo hace ya es admin. Una alumna nunca puede
> ascenderse a sí misma.

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
