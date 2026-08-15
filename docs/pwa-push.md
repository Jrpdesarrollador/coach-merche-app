# PWA y notificaciones push — Coach Merche

## Instalar la app (PWA)

1. Despliega la app en HTTPS (Vercel, Netlify, etc.).
2. Abre la app en Chrome/Safari móvil.
3. **Android (Chrome):** menú → «Instalar app» o banner «Añadir a pantalla de inicio».
4. **iOS (Safari):** botón compartir → «Añadir a pantalla de inicio».

Iconos generados desde `public/assets/brand/logo-coach-merche.png`:

```bash
npm run icons:generate
```

## Activar avisos push (alumna)

1. Inicia sesión como alumna aprobada (Basic o Pro).
2. En **Home** verás un banner para activar avisos (solo la primera vez).
3. O ve a **Perfil → Activar avisos push**.
4. Acepta el permiso del navegador.
5. La suscripción se guarda en `push_subscriptions` vía RPC `upsert_push_subscription`.

### Qué recibirás

| Evento | Push | Email |
|--------|------|-------|
| Nueva publicación de Merche | ✨ Merche ha publicado algo nuevo | ✨ Merche ha publicado: {título} |
| Clase en 24 h (si tienes reserva) | 💪 Tu clase es mañana | (futuro) |

### Variables de entorno

**Vercel** (frontend):

```env
VITE_VAPID_PUBLIC_KEY=tu_clave_publica_vapid
```

**Supabase** (edge functions):

```bash
supabase secrets set VAPID_PUBLIC_KEY=tu_clave_publica
supabase secrets set VAPID_PRIVATE_KEY=tu_clave_privada
supabase secrets set VAPID_SUBJECT=mailto:merche@tudominio.com
```

Generar par VAPID:

```bash
npx web-push generate-vapid-keys
```

## Service Worker

El archivo `src/sw.ts` gestiona:

- Precaching PWA (Workbox)
- Evento `push` → muestra notificación con icono, badge y vibración
- Evento `notificationclick` → abre la URL de la novedad o clases

## Recordatorios 24 h antes de clase

La función SQL `notify_class_reminders()`:

- Busca clases `scheduled` que empiezan en ~24 h (Europe/Madrid).
- Inserta notificaciones in-app (`class_reminder`) para reservas activas.
- Evita duplicados en 48 h por clase y usuaria.
- Marca `metadata.push = true` para la Edge Function de push.

### Cron en producción

**Opción A — Supabase Edge Function + Cron (recomendado)**

```bash
supabase functions deploy class-reminders
```

Programar en Supabase Dashboard → Edge Functions → Cron (diario 08:00 Europe/Madrid).

La función `class-reminders` ya envía push premium a alumnas suscritas tras crear los avisos in-app.

**Opción B — pg_cron** (si está habilitado en el proyecto)

```sql
select cron.schedule(
  'class-reminders-daily',
  '0 7 * * *',
  $$select public.notify_class_reminders()$$
);
```

Con pg_cron solo se crean avisos in-app; para push hay que invocar también `class-reminders` edge function.

**Opción C — Invocación manual (pruebas)**

```sql
select public.notify_class_reminders();
```

Luego invocar la edge function `class-reminders` para el push.

Los avisos in-app ya funcionan con **NotificationBell** sin configurar push.

Para **email y push al publicar una novedad**, consulta [notifications.md](./notifications.md).

## Probar logros (Fase 11)

1. Como admin, confirma asistencia en una clase (`/gestion/clases/:id`).
2. Como alumna, abre **Logros** (`/recompensas`).
3. Verifica contador de entrenamientos confirmados y recompensas desbloqueadas.
4. Recompensas físicas quedan en «Pendiente de entrega».
5. Admin marca entrega en **Gestión → Recompensas** (`/gestion/recompensas`).
