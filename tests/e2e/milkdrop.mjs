// Phase 6, part 2: Milkdrop through Butterchurn.
import { open, loadTrack, grab, stats, shot, stageError } from './lib.mjs'

const kind = process.argv[2] ?? 'firefox'
const { browser, page, errors } = await open(kind)
const log = (...a) => console.log(`[${kind}]`, ...a)
const br = page.locator('.panel.browser')
const vis = page.locator('.panel.visuals, .panel.inspector')
const motion = async () => {
  const a = await grab(page)
  await page.waitForTimeout(300)
  const b = await grab(page)
  let m = 0
  for (let k = 0; k < a.length; k += 4) m += Math.abs(a[k] - b[k]) + Math.abs(a[k + 1] - b[k + 1]) + Math.abs(a[k + 2] - b[k + 2])
  return { ...stats(b), motion: +(m / (a.length / 4) / 3).toFixed(1) }
}
const fps = () => page.locator('.stage').getByText(/fps/).textContent({ timeout: 300 }).catch(() => '?')
const requests = []
page.on('request', (r) => { if (/butterchurn/i.test(r.url())) requests.push(r.url().split('/').pop()) })

log('playing:', await loadTrack(page))
log('butterchurn requested before choosing it (thumbnails):', requests.length)
await page.waitForFunction(() => document.querySelectorAll('.panel.browser img').length >= 22, null, { timeout: 90000 })
log('thumbnails', await br.locator('img').count())
const thumb = await br.getByRole('button', { name: 'Poner Milkdrop en la capa 1' }).locator('img').evaluate((img) => {
  const c = document.createElement('canvas'); c.width = 48; c.height = 27
  const x = c.getContext('2d'); x.drawImage(img, 0, 0, 48, 27)
  const d = x.getImageData(0, 0, 48, 27).data
  let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i] + d[i + 1] + d[i + 2]
  return Math.round(s / (d.length / 4) / 3)
})
log('milkdrop thumbnail brightness', thumb)

await br.getByRole('button', { name: 'Poner Milkdrop en la capa 1' }).click()
await page.waitForTimeout(3000)
log('milkdrop default', JSON.stringify(await motion()), await fps(), 'error:', await stageError(page))
log('preset shown:', await vis.getByLabel('Preset', { exact: true }).evaluate((s) => s.selectedOptions[0].textContent))
await shot(page, `${kind}-mk-0-default`)

for (const name of ['martin - glass corridor', 'Geiss - Reaction Diffusion 2', 'Zylot - True Visionary (Final Mix)']) {
  await vis.getByLabel('Preset', { exact: true }).selectOption({ label: name })
  await page.waitForTimeout(3500)
  log(name.padEnd(36), JSON.stringify(await motion()), await fps(), 'error:', await stageError(page))
  await shot(page, `${kind}-mk-${name.replace(/[^a-z0-9]+/gi, '_')}`)
}

// Common parameters reach it: intensity 0 is black.
await vis.getByLabel('Intensidad', { exact: true }).fill('0')
await page.waitForTimeout(500)
log('intensity 0', JSON.stringify(stats(await grab(page))))
await vis.getByLabel('Intensidad', { exact: true }).fill('0.75')

// Leave it and come back: the context is released and recreated.
await br.getByRole('button', { name: 'Poner Plasma en la capa 1' }).click()
await page.waitForTimeout(2500)
await br.getByRole('button', { name: 'Poner Milkdrop en la capa 1' }).click()
await page.waitForTimeout(2500)
log('milkdrop again', JSON.stringify(await motion()), 'error:', await stageError(page))
log('butterchurn files', [...new Set(requests)].join(', '))
log('errors:', errors.length ? '\n  ' + errors.join('\n  ') : 'none')
await browser.close()
