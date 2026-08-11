/**
 * Genera iconos PWA desde el logo oficial.
 * Uso: node scripts/generate-pwa-icons.mjs
 */
import { mkdir, access } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const logoPath = path.join(rootDir, 'public/assets/brand/logo-coach-merche.png')
const iconsDir = path.join(rootDir, 'public/assets/icons')

const sizes = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'icon-maskable-512.png', size: 512, maskable: true },
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
  const canvasSize = maskable ? size : size
  const logoSize = maskable ? Math.round(size * 0.8) : size

  const logo = await sharp(logoPath)
    .resize(logoSize, logoSize, { fit: 'contain', background: { r: 10, g: 10, b: 10, alpha: 1 } })
    .png()
    .toBuffer()

  await sharp({
    create: {
      width: canvasSize,
      height: canvasSize,
      channels: 4,
      background: { r: 10, g: 10, b: 10, alpha: 1 },
    },
  })
    .composite([
      {
        input: logo,
        gravity: 'centre',
      },
    ])
    .png()
    .toFile(outputPath)

  console.log(`✓ ${name}`)
}

await ensureLogo()
await mkdir(iconsDir, { recursive: true })

for (const spec of sizes) {
  await generateIcon(spec)
}

console.log('Iconos PWA generados en public/assets/icons/')
