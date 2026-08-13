/**
 * Convierte el logo dorado oficial a la paleta lima (#aed419).
 * Preserva negro, sombras y brillo metálico; solo desplaza el matiz dorado.
 */
import { access, copyFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sourcePath = path.join(rootDir, 'public/assets/brand/logo-coach-merche.png')
const backupPath = path.join(rootDir, 'public/assets/brand/logo-coach-merche-gold-backup.png')
const outputPath = path.join(rootDir, 'public/assets/brand/logo-coach-merche-green-tmp.png')

const TARGET = { r: 174, g: 212, b: 25 }

function rgbToHsl(r, g, b) {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h
  switch (max) {
    case r:
      h = ((g - b) / d + (g < b ? 6 : 0)) / 6
      break
    case g:
      h = ((b - r) / d + 2) / 6
      break
    default:
      h = ((r - g) / d + 4) / 6
  }
  return { h, s, l }
}

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
  if (luminance < 18) return { r, g, b }

  const { h, s, l } = rgbToHsl(r, g, b)
  if (s < 0.08) return { r, g, b }

  const hueDeg = h * 360
  const isGold =
    hueDeg >= 25 &&
    hueDeg <= 75 &&
    s >= 0.12 &&
    l >= 0.08 &&
    luminance < 245

  if (!isGold) return { r, g, b }

  const targetHue = rgbToHsl(TARGET.r, TARGET.g, TARGET.b).h
  const next = hslToRgb(targetHue, Math.min(1, s * 1.05), l)
  return next
}

await access(sourcePath)
await mkdir(path.dirname(backupPath), { recursive: true })

try {
  await access(backupPath)
} catch {
  await copyFile(sourcePath, backupPath)
  console.log('✓ Backup dorado guardado en logo-coach-merche-gold-backup.png')
}

const { data, info } = await sharp(sourcePath)
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

await copyFile(outputPath, sourcePath)

const sample = await sharp(outputPath).resize(100, 100).raw().toBuffer({ resolveWithObject: true })
let sr = 0
let sg = 0
let sb = 0
let n = 0
for (let i = 0; i < sample.data.length; i += sample.info.channels) {
  const r = sample.data[i]
  const g = sample.data[i + 1]
  const b = sample.data[i + 2]
  if (r + g + b < 30) continue
  sr += r
  sg += g
  sb += b
  n++
}

console.log(`✓ Logo recoloreado → ${outputPath}`)
console.log(`  Muestra RGB media: ${Math.round(sr / n)}, ${Math.round(sg / n)}, ${Math.round(sb / n)}`)
