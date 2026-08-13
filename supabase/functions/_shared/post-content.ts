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

export function buildPostEmailHtml(input: {
  title: string
  excerpt: string
  postId: string
}): string {
  const url = postDetailUrl(input.postId)
  const safeTitle = escapeHtml(input.title)
  const safeExcerpt = escapeHtml(input.excerpt)

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${safeTitle}</title>
</head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:Georgia,'Times New Roman',serif;color:#f5f0e8;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0f0f0f;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#171717;border:1px solid #2a2a2a;border-radius:20px;overflow:hidden;">
          <tr>
            <td style="padding:28px 28px 12px;text-align:center;">
              <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#c9a227;">Coach Merche</p>
              <h1 style="margin:0;font-size:28px;line-height:1.25;color:#f5f0e8;">${safeTitle}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 24px;">
              <p style="margin:0;font-size:16px;line-height:1.7;color:#d8d0c4;">${safeExcerpt}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 32px;text-align:center;">
              <a href="${url}" style="display:inline-block;background:#c9a227;color:#111111;text-decoration:none;font-size:15px;font-weight:700;padding:14px 28px;border-radius:999px;">
                Ver en la app
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 24px;text-align:center;">
              <p style="margin:0;font-size:12px;line-height:1.6;color:#8a8278;">
                Si el botón no funciona, abre este enlace:<br />
                <a href="${url}" style="color:#d4e157;">${url}</a>
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
