// Phase 6, part 5: overlays (title, synced lyrics, text, logo).
import { open, shot, stageError, OUT, testWav, reveal, FIXTURES } from './lib.mjs'
import { join } from 'node:path'

const kind = process.argv[2] ?? 'firefox'
const { browser, page, errors } = await open(kind)
const log = (...a) => console.log(`[${kind}]`, ...a)
const ov = page.locator('.panel.overlays')
const vis = page.locator('.panel.visuals')

// Mean brightness of the stage in a 3 × 3 grid, read inside a frame.
const regions = () => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => {
  const src = document.querySelector('.stage canvas')
  const c = document.createElement('canvas'); c.width = 192; c.height = 108
  const x = c.getContext('2d'); x.drawImage(src, 0, 0, 192, 108)
  const d = x.getImageData(0, 0, 192, 108).data
  const out = []
  for (let r = 0; r < 3; r++) for (let q = 0; q < 3; q++) {
    let s = 0, n = 0
    for (let y = r * 36; y < r * 36 + 36; y++) for (let k = q * 64; k < q * 64 + 64; k++) { const i = (y * 192 + k) * 4; s += d[i] + d[i + 1] + d[i + 2]; n++ }
    out.push(+(s / n / 3).toFixed(1))
  }
  resolve(out)
})))
// Row signature of the bottom band, to tell lyric lines apart.
const bottomRow = () => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => {
  const src = document.querySelector('.stage canvas')
  const c = document.createElement('canvas'); c.width = 96; c.height = 54
  const x = c.getContext('2d'); x.drawImage(src, 0, 0, 96, 54)
  const d = x.getImageData(0, 40, 96, 14).data
  let lit = 0
  for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] > 300) lit++
  resolve(lit)
})))

await page.evaluate(() => new Promise((r) => { const q = indexedDB.open('keyval-store'); q.onsuccess = () => { const tx = q.result.transaction('keyval', 'readwrite'); const s = tx.objectStore('keyval'); for (const k of ['lyrics', 'overlayLogo', 'scene', 'session']) s.delete(k); tx.oncomplete = r } }))
await page.reload()
await page.waitForSelector('.stage canvas')
await reveal(page)
await page.waitForSelector('.panel.overlays')

const chooser = page.waitForEvent('filechooser')
await page.getByRole('button', { name: 'Añadir archivos' }).click()
await (await chooser).setFiles([testWav(), join(FIXTURES, 'test.lrc')])
await page.waitForTimeout(1500)
if (await page.getByRole('button', { name: 'Reproducir' }).count()) await page.getByRole('button', { name: 'Reproducir' }).click()
log('lyrics status:', await ov.locator('p.small.muted').first().textContent())

// Black background: the visualization at intensity 0.
await vis.getByLabel('Intensidad', { exact: true }).fill('0')
await page.waitForTimeout(300)
log('black, no overlays', JSON.stringify(await regions()))

await ov.getByLabel('Mostrar Título de la canción').check()
await ov.getByLabel('Mostrar Letra sincronizada').check()
await ov.getByLabel('Mostrar Texto').check()
await ov.getByRole('textbox', { name: 'Texto' }).fill('SpectraVisio en directo')
const logoChooser = page.waitForEvent('filechooser')
await ov.getByRole('button', { name: 'Elegir imagen' }).click()
await (await logoChooser).setFiles(join(FIXTURES, 'test-image.png'))
await ov.getByLabel('Mostrar Logo o imagen').check()
await page.waitForTimeout(600)
log('all four (TL logo, TR text, BL title, B lyrics)', JSON.stringify(await regions()), 'error:', await stageError(page))
await shot(page, `${kind}-overlays-all`)

const seen = new Set()
for (let i = 0; i < 6; i++) {
  seen.add(await bottomRow())
  await page.waitForTimeout(1000)
}
log('lyric band lit-pixel counts over 6 s:', [...seen].join(' '))
await shot(page, `${kind}-overlays-later`)

// Position and opacity.
await ov.getByLabel('Posición de Texto').selectOption({ label: 'Centro' })
await ov.getByLabel('Opacidad de Logo o imagen').fill('0')
await page.waitForTimeout(400)
log('text centred, logo opacity 0', JSON.stringify(await regions()))

// Title hold: shown 2 s after a track change, then gone.
await ov.getByLabel('Mostrar Letra sincronizada').uncheck()
await ov.getByLabel('Mostrar Texto').uncheck()
await ov.locator('fieldset').filter({ hasText: 'Título de la canción' }).getByRole('slider').last().fill('2')
const again = page.waitForEvent('filechooser')
await page.getByRole('button', { name: 'Añadir archivos' }).click()
await (await again).setFiles([testWav()])
await page.waitForTimeout(800)
await page.locator('.panel.player').getByRole('button', { name: 'Siguiente' }).click()
await page.waitForTimeout(800)
const early = await regions()
await page.waitForTimeout(2500)
log('title hold 2 s after a track change: bottom-left at ~0.8 s', early[6], '| at ~3.3 s', (await regions())[6])

await page.waitForTimeout(800)
await page.reload()
await page.waitForSelector('.stage canvas')
await reveal(page)
await page.waitForSelector('.panel.overlays')
await page.waitForTimeout(800)
log('after reload: title shown', await ov.getByLabel('Mostrar Título de la canción').isChecked(), '| text shown', await ov.getByLabel('Mostrar Texto').isChecked(), '| text', await ov.getByRole('textbox', { name: 'Texto' }).inputValue(), '| logo:', await ov.locator('fieldset').filter({ hasText: 'Logo o imagen' }).locator('p.small.muted').textContent())
log('errors:', errors.length ? '\n  ' + errors.join('\n  ') : 'none')
await browser.close()
