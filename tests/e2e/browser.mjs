// Phase 5, part 4: visualization browser.
import { open, shot, OUT, pickLayer, reveal } from './lib.mjs'
import { join } from 'node:path'

const kind = process.argv[2] ?? 'firefox'
const { browser, page, errors } = await open(kind)
const log = (...a) => console.log(`[${kind}]`, ...a)
const br = page.locator('.panel.browser')
const names = () => br.locator('.visual-card-name').allTextContents()
const filter = (label) => br.getByRole('button', { name: label, exact: true }).click()

// Fresh visit: no cached thumbnails.
await page.evaluate(() => new Promise((r) => { const q = indexedDB.open('keyval-store'); q.onsuccess = () => { const tx = q.result.transaction('keyval', 'readwrite'); tx.objectStore('keyval').delete('thumbnails'); tx.objectStore('keyval').delete('favorites'); tx.oncomplete = r } }))
await page.reload()
await page.waitForSelector('.stage canvas')
await reveal(page)
await page.waitForSelector('.panel.browser')
const t0 = Date.now()
await page.waitForFunction(() => document.querySelectorAll('.panel.browser img').length >= 8, null, { timeout: 30000 })
log('8 thumbnails drawn in', Date.now() - t0, 'ms')
// Each thumbnail is a real image, not black.
const lit = await br.locator('img').evaluateAll((imgs) => imgs.map((img) => {
  const c = document.createElement('canvas'); c.width = 48; c.height = 27
  const x = c.getContext('2d'); x.drawImage(img, 0, 0, 48, 27)
  const d = x.getImageData(0, 0, 48, 27).data
  let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i] + d[i + 1] + d[i + 2]
  return Math.round(s / (d.length / 4) / 3)
}))
log('thumbnail mean brightness', lit.join(' '))
await page.locator('.panel.browser').screenshot({ path: join(OUT, `${kind}-browser.png`) })

await page.reload()
await page.waitForSelector('.stage canvas')
await reveal(page)
await page.waitForSelector('.panel.browser')
const t1 = Date.now()
await page.waitForFunction(() => document.querySelectorAll('.panel.browser img').length >= 8, null, { timeout: 30000 })
log('from cache in', Date.now() - t1, 'ms')

for (const f of ['Geométricas', 'Espectro y onda', 'Partículas', 'Shader']) {
  await filter(f)
  log(f, await names())
}
await filter('Todas')
await br.getByLabel('Buscar').fill('tunel')
log('search "tunel"', await names())
await br.getByLabel('Buscar').fill('ribbons')
log('search "ribbons" (English id)', await names())
await br.getByLabel('Buscar').fill('zzz')
log('search "zzz"', await br.locator('.empty').textContent())
await br.getByLabel('Buscar').fill('')

await filter('Favoritas')
log('favorites empty:', await br.locator('.empty').textContent())
await filter('Todas')
await br.getByRole('button', { name: 'Añadir Plasma a favoritas' }).click()
await br.getByRole('button', { name: 'Añadir Osciloscopio a favoritas' }).click()
await filter('Favoritas')
log('favorites', await names())

// Pick on layer B.
await pickLayer(page, 2)
await br.getByRole('button', { name: 'Poner Osciloscopio en la capa 2' }).click()
log('layer B now', await page.locator('.panel.visuals .field select').inputValue(), '| highlighted', await br.locator('.visual-card.current .visual-card-name').textContent())

await page.reload()
await page.waitForSelector('.stage canvas')
await reveal(page)
await page.waitForSelector('.panel.browser')
await filter('Favoritas')
log('favorites after reload', await names())
// Leave it clean.
for (const n of await names()) await br.getByRole('button', { name: `Quitar ${n} de favoritas` }).click()
log('errors:', errors.length ? '\n  ' + errors.join('\n  ') : 'none')
await browser.close()
