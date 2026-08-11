/**
 * Comprueba si el bundle JS publicado incluye la URL real de Supabase
 * o el placeholder de desarrollo (significa que el build no tuvo env vars).
 *
 * Uso:
 *   npm run verify:production
 *   npm run verify:production -- https://coach-merche-app.vercel.app
 */
const DEFAULT_URL = 'https://coach-merche-app.vercel.app'

const siteUrl = (process.argv[2] ?? DEFAULT_URL).replace(/\/$/, '')

async function main() {
  console.log(`[verify-production] Comprobando ${siteUrl} …`)

  const htmlRes = await fetch(`${siteUrl}/`)
  if (!htmlRes.ok) {
    console.error(`Error HTTP ${htmlRes.status} al cargar ${siteUrl}/`)
    process.exit(1)
  }

  const html = await htmlRes.text()
  const scriptMatch = html.match(/src="(\/assets\/index-[^"]+\.js)"/)
  if (!scriptMatch) {
    console.error('No se encontró el bundle principal (/assets/index-*.js) en el HTML.')
    process.exit(1)
  }

  const bundlePath = scriptMatch[1]
  const bundleRes = await fetch(`${siteUrl}${bundlePath}`)
  if (!bundleRes.ok) {
    console.error(`Error HTTP ${bundleRes.status} al cargar ${bundlePath}`)
    process.exit(1)
  }

  const js = await bundleRes.text()
  console.log(`[verify-production] Bundle: ${bundlePath} (${js.length} bytes)`)

  const hasPlaceholder = js.includes('placeholder.supabase.co')
  const hasExampleUrl = js.includes('YOUR_PROJECT.supabase.co')
  const supabaseUrls = [...js.matchAll(/https:\/\/[a-z0-9]+\.supabase\.co/g)].map((m) => m[0])
  const realUrls = supabaseUrls.filter((u) => !u.includes('placeholder'))

  if (hasPlaceholder || hasExampleUrl) {
    console.error('')
    console.error('❌ Supabase NO configurado en el bundle publicado.')
    if (hasPlaceholder) console.error('   • Encontrado: placeholder.supabase.co')
    if (hasExampleUrl) console.error('   • Encontrado: YOUR_PROJECT.supabase.co')
    console.error('')
    console.error('El deployment se construyó sin VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.')
    console.error('Solución: define las variables en Vercel y haz Redeploy (Clear build cache).')
    console.error('')
    process.exit(1)
  }

  if (realUrls.length === 0) {
    console.error('')
    console.error('⚠️  No se encontró ninguna URL *.supabase.co en el bundle.')
    console.error('   Revisa manualmente en DevTools → Sources.')
    process.exit(1)
  }

  const unique = [...new Set(realUrls)]
  console.log('')
  console.log('✅ Supabase configurado en producción.')
  for (const u of unique) {
    console.log(`   • ${u}`)
  }
  console.log('')
}

main().catch((err) => {
  console.error('[verify-production] Error:', err.message)
  process.exit(1)
})
