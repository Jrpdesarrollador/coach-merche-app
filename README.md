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
  types/
  utils/

public/assets/
  brand/
  workouts/
  posts/
  icons/

supabase/migrations/
```

## Supabase

Las migraciones (tablas, RLS, funciones RPC, índices) se añadirán en **Fase 2**.

Buckets previstos: `avatars`, `workouts`, `posts`.

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

Ver plan de implementación en el prompt maestro del proyecto (Fases 0–15).

Fase actual de base: **0 — Setup y arquitectura**.
