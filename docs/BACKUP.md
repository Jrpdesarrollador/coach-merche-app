# Backup y restauración

Punto de recuperación en Git para el estado estable del proyecto **Coach Merche App** (11-08-2026).

## Tag de backup

| Tag | Descripción |
|-----|-------------|
| `backup-2026-08-11` | App desplegada en Vercel, panel de administración completo, migraciones y funciones Supabase en repo |

## Restaurar desde el tag

```bash
git fetch origin --tags
git checkout backup-2026-08-11
```

Para volver a la rama principal:

```bash
git checkout main
git pull origin main
```

Tras restaurar código, instala dependencias y configura variables locales (no van en Git):

```bash
npm ci
cp .env.example .env.local
# Edita .env.local con valores de Vercel / Supabase Dashboard
npm run build
```

## Referencias (sin secretos)

| Recurso | URL / ubicación |
|---------|-----------------|
| **Repositorio GitHub** | https://github.com/Jrpdesarrollador/coach-merche-app |
| **Producción (Vercel)** | https://coach-merche-app.vercel.app |
| **Supabase — Project ref** | Dashboard → [Project Settings → General](https://supabase.com/dashboard/project/_/settings/general) (identificador de 20 caracteres; no se guarda en el repo) |
| **Variables de entorno** | Vercel → Project → Settings → Environment Variables; localmente `.env.local` (ver `.env.example`) |

## Qué incluye este backup

- Código fuente (React/Vite), tests, documentación y migraciones SQL en `supabase/migrations/`.
- Configuración de despliegue (`vercel.json`, scripts de verificación).

**No incluye:** archivos `.env`, `.env.local`, claves API, contraseñas ni datos de usuarios en Supabase. Esos deben restaurarse desde Vercel/Supabase y copias de seguridad propias del proveedor.

## Comando rápido

```bash
git checkout backup-2026-08-11
```
