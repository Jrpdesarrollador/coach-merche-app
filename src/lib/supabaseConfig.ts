/**
 * Validación de las variables de entorno de Supabase.
 *
 * Lógica pura y sin dependencias para poder comprobarla de forma aislada.
 */

/** Valores de ejemplo de `.env.example` que hay que sustituir por los reales. */
const URL_PLACEHOLDER = 'https://YOUR_PROJECT.supabase.co'
const ANON_KEY_PLACEHOLDER = 'YOUR_SUPABASE_ANON_KEY'

/**
 * Longitud mínima plausible de una clave publicable. Deliberadamente baja:
 * conviven el formato nuevo (`sb_publishable_...`) y el clásico (JWT `eyJ...`),
 * y rechazar una clave válida es peor que aceptar una inválida.
 */
const MIN_ANON_KEY_LENGTH = 20

export interface SupabaseConfigProblem {
  variable: 'VITE_SUPABASE_URL' | 'VITE_SUPABASE_ANON_KEY'
  message: string
}

function isPlaceholder(value: string, placeholder: string): boolean {
  return value.toLowerCase() === placeholder.toLowerCase()
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Devuelve los problemas detectados en la configuración. Una lista vacía
 * significa que las variables tienen un formato utilizable.
 */
export function findSupabaseConfigProblems(
  url: string | undefined,
  anonKey: string | undefined,
): SupabaseConfigProblem[] {
  const problems: SupabaseConfigProblem[] = []
  const cleanUrl = url?.trim() ?? ''
  const cleanKey = anonKey?.trim() ?? ''

  if (!cleanUrl) {
    problems.push({
      variable: 'VITE_SUPABASE_URL',
      message:
        'falta o está vacía. Copia .env.example a .env.local y pon la URL del proyecto (https://<PROJECT_REF>.supabase.co).',
    })
  } else if (isPlaceholder(cleanUrl, URL_PLACEHOLDER)) {
    problems.push({
      variable: 'VITE_SUPABASE_URL',
      message:
        'sigue con el valor de ejemplo de .env.example. Sustitúyelo por la URL real del proyecto.',
    })
  } else if (!isHttpsUrl(cleanUrl)) {
    problems.push({
      variable: 'VITE_SUPABASE_URL',
      message: `no es una URL https válida (valor recibido: "${cleanUrl}").`,
    })
  }

  if (!cleanKey) {
    problems.push({
      variable: 'VITE_SUPABASE_ANON_KEY',
      message:
        'falta o está vacía. Cópiala desde Project Settings → API Keys en el panel de Supabase.',
    })
  } else if (isPlaceholder(cleanKey, ANON_KEY_PLACEHOLDER)) {
    problems.push({
      variable: 'VITE_SUPABASE_ANON_KEY',
      message:
        'sigue con el valor de ejemplo de .env.example. Sustitúyelo por la clave real del proyecto.',
    })
  } else if (cleanKey.length < MIN_ANON_KEY_LENGTH) {
    problems.push({
      variable: 'VITE_SUPABASE_ANON_KEY',
      message: `parece truncada: solo tiene ${cleanKey.length} caracteres y empieza por "${cleanKey.slice(0, 8)}".`,
    })
  }

  return problems
}

/** Mensaje de diagnóstico para consola. Nunca incluye la clave completa. */
export function formatSupabaseConfigWarning(problems: SupabaseConfigProblem[]): string {
  const lines = problems.map((problem) => `- ${problem.variable}: ${problem.message}`)

  return [
    'Configuración de Supabase incompleta o inválida; la app funcionará sin conexión a la base de datos.',
    ...lines,
    'Revisa .env.local y reinicia el servidor de desarrollo.',
  ].join('\n')
}
