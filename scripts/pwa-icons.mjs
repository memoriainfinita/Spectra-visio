// Renders the PWA icons from public/favicon.svg with Chrome: any-purpose 192 and 512 with
// transparent corners, a maskable 512 (full background, mark inside the safe zone) and a
// 180 apple-touch-icon.
import { chromium } from 'playwright'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const PUB = fileURLToPath(new URL('../public/', import.meta.url))
const svg = readFileSync(PUB + 'favicon.svg', 'utf8')
// Maskable: square background, the mark scaled to 70 % around the centre.
const inner = svg.replace(/<svg[^>]*>/, '').replace('</svg>', '').replace(/<rect[^>]*\/>/, '')
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#06070f"/><g transform="translate(16 16) scale(0.7) translate(-16 -16)">${inner}</g></svg>`
const apple = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#06070f"/><g transform="translate(16 16) scale(0.85) translate(-16 -16)">${inner}</g></svg>`

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage()
for (const [name, source, size] of [['pwa-192.png', svg, 192], ['pwa-512.png', svg, 512], ['pwa-maskable-512.png', maskable, 512], ['apple-touch-icon.png', apple, 180]]) {
  await page.setViewportSize({ width: size, height: size })
  await page.setContent(`<html><body style="margin:0;background:transparent"><img style="display:block;width:${size}px;height:${size}px" src="data:image/svg+xml;base64,${Buffer.from(source).toString('base64')}"></body></html>`)
  await page.waitForTimeout(100)
  writeFileSync(PUB + name, await page.screenshot({ omitBackground: true }))
  console.log(name, size)
}
await browser.close()
