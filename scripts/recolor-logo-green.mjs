/**
 * Convierte el logo dorado oficial a verde lima claramente visible.
 * Matiz 85° (no 68° de #aed419) para evitar percepción dorada en iconos PWA.
 * Preserva la luminancia original para el relieve 3D metálico.
 */
import { access, copyFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const backupPath = path.join(rootDir, 'public/assets/brand/logo-coach-merche-gold-backup.png')
const outputPath = path.join(rootDir, 'public/assets/brand/logo-coach-merche.png')
const legacyPath = path.join(rootDir, 'public/assets/brand/logo-coach-merche-green.png')

/** Lima verde visible en pantallas pequeñas (≈ #9ae619, G/R > 1.4) */
const ICON_GREEN_HUE = 85 / 360
const ICON_GREEN_SAT = 0.95

function hslToRgb(h, s, l) {
  if (s === 0) {
    const v = Math.round(l * 255)
    return { r: v, g: v, b: v }
  }
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  return {
    r: Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, h) * 255),
    b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  }
}

function recolorPixel(r, g, b) {
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
  if (luminance < 12) return { r, g, b }

  const t = Math.min(1, luminance / 220)
  const newL = 0.08 + t * 0.82
  return hslToRgb(ICON_GREEN_HUE, ICON_GREEN_SAT, newL)
}

await access(backupPath)
await mkdir(path.dirname(outputPath), { recursive: true })

const { data, info } = await sharp(backupPath)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true })

for (let i = 0; i < data.length; i += info.channels) {
  const r = data[i]
  const g = data[i + 1]
  const b = data[i + 2]
  const next = recolorPixel(r, g, b)
  data[i] = next.r
  data[i + 1] = next.g
  data[i + 2] = next.b
}

await sharp(data, {
  raw: { width: info.width, height: info.height, channels: info.channels },
})
  .png()
  .toFile(outputPath)

await copyFile(outputPath, legacyPath)

const sample = await sharp(outputPath).resize(100, 100).raw().toBuffer({ resolveWithObject: true })
let sr = 0
let sg = 0
let n = 0
for (let i = 0; i < sample.data.length; i += sample.info.channels) {
  const r = sample.data[i]
  const g = sample.data[i + 1]
  const b = sample.data[i + 2]
  if (r + g + b < 30) continue
  sr += r
  sg += g
  n++
}

const gr = sg / sr
console.log(`✓ Logo recoloreado → ${outputPath}`)
console.log(`  Muestra RGB media: ${Math.round(sr / n)}, ${Math.round(sg / n)} | G/R: ${gr.toFixed(2)}`)

if (gr < 1.35) {
  console.warn('⚠ G/R bajo — el verde puede seguir pareciendo dorado')
  process.exit(1)
}
