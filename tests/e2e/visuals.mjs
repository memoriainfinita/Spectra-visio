// Phase 6, part 1: new visualization families.
import { open, loadTrack, grab, stats, shot, stageError } from './lib.mjs'

const kind = process.argv[2] ?? 'firefox'
const { browser, page, errors } = await open(kind)
const log = (...a) => console.log(`[${kind}]`, ...a)
const br = page.locator('.panel.browser')

log('playing:', await loadTrack(page))
await page.waitForFunction(() => document.querySelectorAll('.panel.browser img').length >= 21, null, { timeout: 60000 })
log('thumbnails', await br.locator('img').count())

const names = ['Barras de espectro', 'Barras circulares', 'Espectrograma en cascada', 'Goniómetro estéreo', 'Onda circular', 'Campo de estrellas', 'Fuegos artificiales', 'Terreno', 'Túnel de velocidad', 'Polígonos', 'Celdas', 'Conjunto de Julia', 'Fractal caleidoscópico']
for (const [i, name] of names.entries()) {
  await br.getByRole('button', { name: `Poner ${name} en la capa 1` }).click()
  await page.waitForTimeout(2200)
  const a = await grab(page)
  await page.waitForTimeout(300)
  const b = await grab(page)
  let motion = 0
  for (let k = 0; k < a.length; k += 4) motion += Math.abs(a[k] - b[k]) + Math.abs(a[k + 1] - b[k + 1]) + Math.abs(a[k + 2] - b[k + 2])
  const fps = await page.locator('.stage').getByText(/fps/).textContent({ timeout: 300 }).catch(() => '?')
  log(name.padEnd(26), JSON.stringify(stats(b)), 'motion', (motion / (a.length / 4) / 3).toFixed(1), fps, 'error:', await stageError(page))
  await shot(page, `${kind}-v6-${String(i).padStart(2, '0')}-${name.replace(/ /g, '_')}`)
}

// Option parameter: mirrored bars must be symmetric top to bottom.
await br.getByRole('button', { name: 'Poner Barras de espectro en la capa 1' }).click()
await page.locator('.panel.visuals').getByLabel('Disposición', { exact: true }).selectOption({ label: 'En espejo' })
await page.waitForTimeout(600)
log('bars mirrored', JSON.stringify(stats(await grab(page))))
await shot(page, `${kind}-v6-bars-mirror`)

for (const f of ['3D', 'Fractales']) {
  await br.getByRole('button', { name: f, exact: true }).click()
  log(f, await br.locator('.visual-card-name').allTextContents())
}
log('errors:', errors.length ? '\n  ' + errors.join('\n  ') : 'none')
await browser.close()
