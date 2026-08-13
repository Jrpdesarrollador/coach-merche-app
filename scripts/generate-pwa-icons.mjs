/**
 * Genera iconos PWA desde el logo oficial verde.
 * Uso: node scripts/generate-pwa-icons.mjs
 */
import { mkdir, access, unlink } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const logoPath = path.join(rootDir, 'public/assets/brand/logo-coach-merche.png')
const iconsDir = path.join(rootDir, 'public/assets/icons')

const sizes = [
  { name: 'pwa-icon-192-green.png', size: 192 },
  { name: 'pwa-icon-512-green.png', size: 512 },
  { name: 'pwa-apple-touch-green.png', size: 180 },
  { name: 'pwa-icon-maskable-512-green.png', size: 512, maskable: true },
]

const legacyIcons = [
  'icon-192.png',
  'icon-512.png',
  'apple-touch-icon.png',
  'icon-maskable-512.png',
]

async function ensureLogo() {
  try {
    await access(logoPath)
  } catch {
    throw new Error(`No se encontró el logo en ${logoPath}`)
  }
}

async function generateIcon({ name, size, maskable = false }) {
  const outputPath = path.join(iconsDir, name)
  const logoSize = maskable ? Math.round(size * 0.8) : size

  const logo = await sharp(logoPath)
    .resize(logoSize, logoSize, { fit: 'contain', background: { r: 10, g: 10, b: 10, alpha: 1 } })
    .png()
    .toBuffer()

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 10, g: 10, b: 10, alpha: 1 },
    },
  })
    .composite([{ input: logo, gravity: 'centre' }])
    .png()
    .toFile(outputPath)

  console.log(`✓ ${name}`)
}

await ensureLogo()
await mkdir(iconsDir, { recursive: true })

for (const spec of sizes) {
  await generateIcon(spec)
}

for (const legacy of legacyIcons) {
  try {
    await unlink(path.join(iconsDir, legacy))
    console.log(`✗ Eliminado icono legacy: ${legacy}`)
  } catch {
    // ya no existe
  }
}

console.log('Iconos PWA verdes generados en public/assets/icons/')
