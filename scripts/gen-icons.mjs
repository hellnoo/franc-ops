import sharp from 'sharp'
import { readFileSync } from 'fs'

const svg = readFileSync(new URL('../public/icon.svg', import.meta.url))
const sizes = [
  { size: 180, name: 'apple-touch-icon.png' },
  { size: 192, name: 'icon-192.png' },
  { size: 512, name: 'icon-512.png' },
]

for (const { size, name } of sizes) {
  await sharp(svg, { density: 512 })
    .resize(size, size)
    .png()
    .toFile(new URL(`../public/${name}`, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))
  console.log(`generated ${name} (${size}x${size})`)
}
