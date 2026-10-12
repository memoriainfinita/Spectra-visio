// Phase 10: manifest, offline use (Milkdrop and the OBS source included) and the prompt
// for a new version.
import { open, reveal, APP, ROOT } from './lib.mjs'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const kind = process.argv[2] ?? 'chrome'
const log = (...a) => console.log(`[${kind}]`, ...a)
const SW = join(ROOT, 'dist', 'sw.js')
const { browser, page, errors } = await open(kind)
const context = page.context()

const manifest = await page.evaluate(async () => {
  const href = document.querySelector('link[rel=manifest]')?.getAttribute('href')
  if (!href) return null
  const m = await (await fetch(href)).json()
  return { href, name: m.name, display: m.display, icons: m.icons.map((i) => `${i.sizes}${i.purpose ? ' ' + i.purpose : ''}`) }
})
log('manifest:', JSON.stringify(manifest))
await page.evaluate(() => navigator.serviceWorker.ready)
await page.waitForTimeout(1500)
log('offline banner:', await page.locator('.banner').textContent().catch(() => null))
await page.reload()
await page.waitForSelector('.stage canvas')
await reveal(page)
log('controlled:', await page.evaluate(() => !!navigator.serviceWorker.controller))

// Offline: the app, Milkdrop's code and presets, and the OBS source.
await context.setOffline(true)
await page.reload()
await page.waitForSelector('.stage canvas')
await reveal(page)
log('offline reload: stage', await page.locator('.stage canvas').count(), '| panels', await page.locator('section.panel').count())
await page.locator('.panel.browser').getByRole('button', { name: /^Poner Milkdrop en la capa/ }).first().click()
await page.waitForTimeout(3000)
log('Milkdrop offline: stage error', await page.locator('.stage-error').count(), '| layer', await page.locator('.layer.selected .layer-pick').textContent())
const src = await context.newPage()
await src.goto(APP + '?source')
await src.waitForTimeout(5000)
log('source offline: waiting line', await src.locator('.lost').isVisible())
await src.close()
await context.setOffline(false)

// A new version: the worker changes on the server; the app asks before reloading.
const original = readFileSync(SW, 'utf8')
try {
  writeFileSync(SW, original + '\n// test change\n')
  await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.update())
  await page.waitForSelector('.banner .btn.primary', { timeout: 15000 })
  log('new version banner:', await page.locator('.banner').textContent())
  await Promise.all([page.waitForEvent('load', { timeout: 15000 }), page.locator('.banner').getByRole('button', { name: 'Recargar' }).click()])
  await page.waitForSelector('.stage canvas')
  await reveal(page)
  await page.waitForTimeout(1000)
  log('after reload: banner', await page.locator('.banner .btn.primary').count())
} finally {
  writeFileSync(SW, original)
}
log('errors:', errors.filter((e) => !e.includes('WebGL context was lost')).join('\n  ') || 'none')
await browser.close()
