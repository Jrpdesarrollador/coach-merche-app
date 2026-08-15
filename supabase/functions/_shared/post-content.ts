import { BRAND, BRAND_LOGO_URL } from './notification-assets.ts'

export const APP_BASE_URL = 'https://coach-merche-app.vercel.app'

export function postExcerpt(content: string | null | undefined, maxLen = 160): string {
  const text = content?.trim()
  if (!text) return 'Hay novedades en la app. Entra para ver más.'
  if (text.length <= maxLen) return text
  return `${text.slice(0, maxLen - 1)}…`
}

export function postDetailUrl(postId: string): string {
  return `${APP_BASE_URL}/novedades/${postId}`
}

export function newPostEmailSubject(title: string): string {
  const safeTitle = title.trim() || 'Nueva novedad'
  return `✨ Merche ha publicado: ${safeTitle}`
}

export function buildPostEmailHtml(input: {
  title: string
  excerpt: string
  postId: string
}): string {
  const url = postDetailUrl(input.postId)
  const safeTitle = escapeHtml(input.title.trim() || 'Nueva novedad')
  const safeExcerpt = escapeHtml(input.excerpt)
  const year = new Date().getFullYear()

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="dark" />
  <meta name="supported-color-schemes" content="dark" />
  <title>${safeTitle}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    @media only screen and (max-width: 620px) {
      .email-shell { padding: 20px 12px !important; }
      .email-card { border-radius: 16px !important; }
      .email-pad { padding-left: 20px !important; padding-right: 20px !important; }
      .email-title { font-size: 24px !important; }
      .email-btn { display: block !important; width: 100% !important; box-sizing: border-box !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:${BRAND.dark};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${BRAND.ink};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
    ${safeExcerpt} — Abre la app de Coach Merche para leer la novedad completa.
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" class="email-shell" style="background:${BRAND.dark};padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" class="email-card" style="max-width:560px;background:${BRAND.surface};border:1px solid rgba(174,212,25,0.22);border-radius:24px;overflow:hidden;box-shadow:0 24px 64px rgba(0,0,0,0.45);">
          <tr>
            <td class="email-pad" style="padding:32px 32px 16px;text-align:center;background:linear-gradient(180deg, rgba(174,212,25,0.08) 0%, transparent 100%);">
              <img src="${BRAND_LOGO_URL}" alt="Coach Merche" width="72" height="72" style="display:block;margin:0 auto 16px;border-radius:18px;" />
              <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:${BRAND.lime};font-weight:700;">
                Coach Merche
              </p>
              <p style="margin:0;font-size:13px;color:${BRAND.inkMuted};">
                Una novedad para ti
              </p>
            </td>
          </tr>
          <tr>
            <td class="email-pad" style="padding:8px 32px 0;">
              <h1 class="email-title" style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.3;color:${BRAND.ink};font-weight:700;">
                ${safeTitle}
              </h1>
            </td>
          </tr>
          <tr>
            <td class="email-pad" style="padding:16px 32px 8px;">
              <p style="margin:0;font-size:16px;line-height:1.75;color:${BRAND.inkMuted};">
                ${safeExcerpt}
              </p>
            </td>
          </tr>
          <tr>
            <td class="email-pad" style="padding:24px 32px 12px;text-align:center;">
              <a href="${url}" class="email-btn" style="display:inline-block;background:${BRAND.lime};color:#111111;text-decoration:none;font-size:15px;font-weight:700;padding:15px 32px;border-radius:999px;box-shadow:0 8px 24px rgba(174,212,25,0.25);">
                Ver en la app
              </a>
            </td>
          </tr>
          <tr>
            <td class="email-pad" style="padding:8px 32px 28px;text-align:center;">
              <p style="margin:0;font-size:12px;line-height:1.7;color:${BRAND.inkMuted};">
                Si el botón no funciona, copia este enlace en tu navegador:<br />
                <a href="${url}" style="color:${BRAND.lime};word-break:break-all;">${url}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
              <p style="margin:0;font-size:11px;line-height:1.6;color:${BRAND.inkMuted};">
                Entrena tu mejor versión · Coach Merche © ${year}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}
