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
2. Ve a **Perfil → Activar avisos push**.
3. Acepta el permiso del navegador.
4. La suscripción se guarda en `push_subscriptions` vía RPC `upsert_push_subscription`.

Variable de entorno cliente:

```env
VITE_VAPID_PUBLIC_KEY=tu_clave_publica_vapid
```

Generar par VAPID (ejemplo con `npx web-push generate-vapid-keys`).

## Recordatorios 24 h antes de clase

La función SQL `notify_class_reminders()`:

- Busca clases `scheduled` que empiezan en ~24 h (Europe/Madrid).
- Inserta notificaciones in-app (`class_reminder`) para reservas activas.
- Evita duplicados en 48 h por clase y usuaria.
- Marca `metadata.push = true` para la Edge Function de push.

### Cron en producción

**Opción A — Supabase Edge Function + Cron**

```bash
supabase functions deploy class-reminders
```

Programar en Supabase Dashboard → Edge Functions → Cron (diario 08:00 Europe/Madrid).

**Opción B — pg_cron** (si está habilitado en el proyecto)

```sql
select cron.schedule(
  'class-reminders-daily',
  '0 7 * * *',
  $$select public.notify_class_reminders()$$
);
```

**Opción C — Invocación manual (pruebas)**

```sql
select public.notify_class_reminders();
```

### Push real (pendiente producción)

1. Configura secrets en Supabase: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`.
2. Completa `supabase/functions/send-push` con librería `web-push`.
3. Tras `notify_class_reminders()`, invoca `send-push` para notificaciones con `metadata.push = true`.

Los avisos in-app ya funcionan con **NotificationBell** sin configurar push.

Para **email y push al publicar una novedad**, consulta [notifications.md](./notifications.md).

## Probar logros (Fase 11)

1. Como admin, confirma asistencia en una clase (`/gestion/clases/:id`).
2. Como alumna, abre **Logros** (`/recompensas`).
3. Verifica contador de entrenamientos confirmados y recompensas desbloqueadas.
4. Recompensas físicas quedan en «Pendiente de entrega».
5. Admin marca entrega en **Gestión → Recompensas** (`/gestion/recompensas`).
