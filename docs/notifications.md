# Notificaciones automáticas al publicar — Coach Merche

Cuando Merche publica una novedad desde **Gestión → Publicaciones**, la app envía tres tipos de aviso a cada alumna **aprobada**:

| Canal | Dónde vive | Requiere config extra |
|-------|------------|------------------------|
| In-app | Trigger SQL `notify_new_post` | No |
| Push móvil | Edge Function `notify-new-post` | VAPID keys |
| Email | Edge Function `notify-new-post` (Resend) | `RESEND_API_KEY` |

## Flujo

1. Admin guarda el post con `published = true`.
2. El trigger `notify_new_post` inserta filas en `notifications` (tipo `new_post`).
3. El cliente invoca la RPC `publish_post_notifications(post_id)` para validar y contar destinatarias.
4. Se llama a la Edge Function `notify-new-post`, que envía push + email y marca `posts.notification_sent_at`.

Si `notification_sent_at` ya tiene valor, no se reenvía (evita duplicados). Al **despublicar**, ese campo se limpia para permitir un nuevo envío.

**Fallbacks:** si una alumna no tiene push activado, recibe email e in-app. Si no tiene email, recibe push e in-app. Cada canal es independiente.

## Diseño premium

### Email (Resend)

- Asunto: `✨ Merche ha publicado: {título}`
- Plantilla HTML responsive: fondo oscuro (#0a0a0a), acentos lime (#aed419), logo verde, botón «Ver en la app»
- Enlace directo: `https://coach-merche-app.vercel.app/novedades/:id`

### Push (Web Push / PWA)

- Título: `✨ Merche ha publicado algo nuevo`
- Cuerpo: título de la publicación
- Icono y badge: logo PWA verde
- Acción: abre `/novedades/:id`
- Recordatorios de clase: `💪 Tu clase es mañana` con detalle del entrenamiento

## Despliegue de Edge Functions

```bash
supabase functions deploy notify-new-post
supabase functions deploy send-push
supabase functions deploy send-post-email
supabase functions deploy class-reminders
```

`notify-new-post` es la función principal invocada por la app. Las otras pueden usarse por separado para pruebas o cron.

## Secrets en Supabase

En **Project Settings → Edge Functions → Secrets** (proyecto `olcqupciiqaifgybfidf`):

### Push (Web Push / VAPID)

```bash
supabase login
supabase link --project-ref olcqupciiqaifgybfidf

# Generar par VAPID (copia ambas claves):
npx web-push generate-vapid-keys

supabase secrets set VAPID_PUBLIC_KEY=tu_clave_publica
supabase secrets set VAPID_PRIVATE_KEY=tu_clave_privada
supabase secrets set VAPID_SUBJECT=mailto:merche@tudominio.com
```

La clave pública también va en **Vercel** (Environment Variables):

```env
VITE_VAPID_PUBLIC_KEY=tu_clave_publica
```

Redeploy de Vercel tras añadir la variable.

Ver también [pwa-push.md](./pwa-push.md).

### Email (Resend)

1. Crea cuenta en [Resend](https://resend.com).
2. Verifica tu dominio (o usa el sandbox `onboarding@resend.dev` para pruebas).
3. Crea API key con permiso de envío.
4. Configura secrets:

```bash
supabase secrets set RESEND_API_KEY=re_xxxxxxxx
supabase secrets set FROM_EMAIL="Coach Merche <noreply@tudominio.com>"
```

Sin `RESEND_API_KEY`, la función responde OK pero no envía correos (modo stub).

**Sandbox Resend:** solo envía a emails verificados en tu cuenta Resend. Para producción, verifica el dominio.

## Activación push (alumna)

1. Inicia sesión como alumna aprobada.
2. En **Home** aparece un banner «¿Quieres avisos de Merche?» (una vez).
3. O ve a **Perfil → Activar avisos push**.
4. Acepta el permiso del navegador.
5. La suscripción se guarda en `push_subscriptions`.

## Cómo probar

### In-app (sin API keys)

1. `npm run db:validate` — incluye pruebas del trigger y la RPC.
2. Como admin, publica una novedad.
3. Como alumna aprobada, abre la campana de notificaciones.

### Push

1. Configura VAPID (secrets Supabase + `VITE_VAPID_PUBLIC_KEY` en Vercel).
2. Redeploy edge functions y frontend.
3. Como alumna, activa avisos en Perfil o Home.
4. Publica una novedad como admin.
5. Comprueba la notificación en el dispositivo (PWA instalada o navegador con permiso).

### Email

1. Configura `RESEND_API_KEY` y `FROM_EMAIL`.
2. Publica una novedad con alumnas aprobadas que tengan email en `auth.users`.
3. Revisa la bandeja (o el dashboard de Resend → Logs).

### Invocación manual de la Edge Function

Con token de admin:

```bash
curl -X POST "$SUPABASE_URL/functions/v1/notify-new-post" \
  -H "Authorization: Bearer $ADMIN_ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"post_id":"UUID-DEL-POST"}'
```

## Migración

La columna `posts.notification_sent_at` y las funciones SQL están en:

`supabase/migrations/20260813180000_post_publish_notifications.sql`

Aplicar en remoto:

```bash
npm run db:push
```
