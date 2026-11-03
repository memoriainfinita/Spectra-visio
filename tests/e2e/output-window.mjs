// Phase 8 part 4: the output window.
import { open, loadTrack, stats, OUT, reveal, pickLayer, expandSource, useSource, FIXTURES } from './lib.mjs'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const kind = process.argv[2] ?? 'firefox'
const { browser, page, errors } = await open(kind)
const log = (...a) => console.log(`[${kind}]`, ...a)
const live = page.locator('.panel.output')
const vis = page.locator('.panel.visuals, .panel.inspector')
const grabOf = (p) => p.evaluate(() => new Promise((resolve) => {
  requestAnimationFrame(() => {
    const src = document.querySelector('canvas')
    const c = document.createElement('canvas')
    c.width = 32; c.height = 18
    const ctx = c.getContext('2d')
    ctx.drawImage(src, 0, 0, 32, 18)
    resolve([...ctx.getImageData(0, 0, 32, 18).data])
  })
}))
const st = async (p) => stats(await grabOf(p))

log('playing:', await loadTrack(page))
const popupP = page.waitForEvent('popup')
await live.getByRole('button', { name: 'Abrir ventana de salida' }).click()
const out = await popupP
out.on('pageerror', (e) => errors.push('output pageerror ' + e.message))
out.on('console', (m) => { if (m.type() === 'error') errors.push('output ' + m.text()) })
await out.waitForLoadState()
await out.waitForTimeout(1500)
log('output title:', await out.title(), '| main button:', await live.getByRole('button', { name: /ventana de salida/ }).textContent())
log('output image:', JSON.stringify(await st(out)), '| main:', JSON.stringify(await st(page)))

// A change in the main window shows in the output: solo a new plasma layer.
await vis.getByRole('button', { name: 'Añadir capa' }).click()
await page.locator('.panel.browser').getByRole('button', { name: 'Poner Plasma en la capa 3' }).click()
await vis.getByRole('button', { name: 'Solo la capa 3' }).click()
await out.waitForTimeout(600)
log('output after solo plasma:', JSON.stringify(await st(out)))

// Blackout from the main window; then the B key pressed in the output window.
await page.locator('.perform-bar').getByRole('button', { name: 'Apagón', exact: true }).click()
await out.waitForTimeout(500)
log('output in blackout mean:', (await st(out)).mean)
await out.locator('canvas').click()
await out.keyboard.press('b')
await page.waitForTimeout(300)
log('B in the output turns it off in main:', await page.locator('.perform-bar').getByRole('button', { name: 'Apagón', exact: true }).getAttribute('aria-pressed'))

// Preview off: main stops drawing, the output goes on.
await live.getByLabel('Vista previa aquí también').uncheck()
await page.waitForTimeout(1500)
const a = await grabOf(out)
await out.waitForTimeout(400)
const b = await grabOf(out)
const motion = a.reduce((s, v, i) => s + Math.abs(v - b[i]), 0) / a.length
log('preview off: main says', await page.locator('.stage-error').textContent(), '| main fps', await page.locator('.stage-bar .mono').textContent(), '| output motion', motion.toFixed(1))
await live.getByLabel('Vista previa aquí también').check()

// The visual input image reaches the output (the element is the main window's).
const img = join(FIXTURES, 'test-image.png')
if (existsSync(img)) {
  await vis.getByRole('button', { name: 'Solo la capa 3' }).click()
  await pickLayer(page, 3)
  const vi = await expandSource(page)
  const chooser = page.waitForEvent('filechooser')
  await vi.getByRole('button', { name: 'Imagen o vídeo' }).click()
  await (await chooser).setFiles(img)
  await page.waitForTimeout(1000)
  await useSource(page)
  await vis.getByRole('button', { name: 'Solo la capa 3' }).click()
  await page.waitForTimeout(1000)
  log('visual input: main', JSON.stringify(await st(page)), '| output', JSON.stringify(await st(out)))
}

// Main reloads: the output waits, then reconnects and the main window knows it is open.
await page.reload()
await page.waitForSelector('.stage canvas')
await reveal(page)
await page.waitForTimeout(1500)
await vis.getByRole('button', { name: 'Solo la capa 3' }).click()
await page.waitForTimeout(500)
log('after main reload: button', await live.getByRole('button', { name: /ventana de salida/ }).textContent(), '| output lost message hidden:', await out.locator('.lost').isHidden(), '| output mean', (await st(out)).mean, '| main mean', (await st(page)).mean)

await live.getByRole('button', { name: 'Cerrar ventana de salida' }).click()
await page.waitForTimeout(1500)
log('after close: button', await live.getByRole('button', { name: /ventana de salida/ }).textContent())
log('errors:', errors.length ? errors.join('\n  ') : 'none')
await browser.close()
