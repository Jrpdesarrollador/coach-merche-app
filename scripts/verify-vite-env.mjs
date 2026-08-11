/**
 * Comprueba que Vite recibirá las variables de Supabase en tiempo de build.
 *
 * En Vercel/CI el build falla si faltan: evita publicar un bundle con
 * placeholder.supabase.co. En local se omite salvo FORCE_VITE_ENV_CHECK=1.
 *
 * Uso: se ejecuta automáticamente en `npm run build`.
 */
const URL_PLACEHOLDER = 'https://YOUR_PROJECT.supabase.co'
const ANON_KEY_PLACEHOLDER = 'YOUR_SUPABASE_ANON_KEY'
const MIN_ANON_KEY_LENGTH = 20

const isCi = process.env.CI === 'true' || process.env.CI === '1'
const isVercel = process.env.VERCEL === '1'
const forceCheck = process.env.FORCE_VITE_ENV_CHECK === '1'

if (!isCi && !isVercel && !forceCheck) {
  process.exit(0)
}

const url = (process.env.VITE_SUPABASE_URL ?? '').trim()
const anonKey = (
  process.env.VITE_SUPABASE_ANON_KEY ??
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  ''
).trim()

const problems = []

if (!url) {
  problems.push('VITE_SUPABASE_URL está vacía o no definida.')
} else if (url.toLowerCase() === URL_PLACEHOLDER.toLowerCase()) {
  problems.push('VITE_SUPABASE_URL sigue con el valor de ejemplo de .env.example.')
} else {
  try {
    if (new URL(url).protocol !== 'https:') {
      problems.push(`VITE_SUPABASE_URL no es https (valor: "${url}").`)
    }
  } catch {
    problems.push(`VITE_SUPABASE_URL no es una URL válida (valor: "${url}").`)
  }
}

if (!anonKey) {
  problems.push(
    'VITE_SUPABASE_ANON_KEY (o VITE_SUPABASE_PUBLISHABLE_KEY) está vacía o no definida.',
  )
} else if (anonKey.toLowerCase() === ANON_KEY_PLACEHOLDER.toLowerCase()) {
  problems.push('VITE_SUPABASE_ANON_KEY sigue con el valor de ejemplo de .env.example.')
} else if (anonKey.length < MIN_ANON_KEY_LENGTH) {
  problems.push(
    `VITE_SUPABASE_ANON_KEY parece truncada (${anonKey.length} caracteres, empieza por "${anonKey.slice(0, 8)}").`,
  )
}

if (problems.length === 0) {
  const host = url ? new URL(url).hostname : '?'
  console.log(`[verify-vite-env] OK — Supabase URL: ${host}, anon key: ${anonKey.length} chars`)
  process.exit(0)
}

const envLabel = isVercel ? 'Vercel' : isCi ? 'CI' : 'entorno forzado'

console.error('')
console.error(`[verify-vite-env] Build abortado: faltan variables de Supabase en ${envLabel}.`)
console.error('')
for (const problem of problems) {
  console.error(`  • ${problem}`)
}
console.error('')
console.error('Pasos en Vercel:')
console.error('  1. Project → Settings → Environment Variables')
console.error('  2. Añade VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY para Production y Preview')
console.error('  3. Nombres exactos (VITE_ al inicio). Valor anon/publishable, no service_role.')
console.error('  4. Redeploy del último deployment (Clear build cache si persiste).')
console.error('')
console.error('Ver README.md → Deploy (Vercel) → Solución de problemas.')
console.error('')

process.exit(1)
