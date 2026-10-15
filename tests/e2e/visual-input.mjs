// Phase 6, part 4: visual input (image, video, camera) in the visualization, the effect and shaders.
import { open, loadTrack, grab, stats, shot, stageError, OUT, FIXTURES, reveal } from './lib.mjs'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const kind = process.argv[2] ?? 'firefox'
const { browser, page, errors } = await open(kind, { camera: true })
const log = (...a) => console.log(`[${kind}]`, ...a)
const panel = page.locator('.panel.visual-input')
const br = page.locator('.panel.browser')
const fx = page.locator('#insp-layer .effects')
const sh = page.locator('.panel.shaders')
const status = () => panel.getByRole('status').textContent()
const motion = async () => {
  const a = await grab(page)
  await page.waitForTimeout(400)
  const b = await grab(page)
  let m = 0
  for (let k = 0; k < a.length; k += 4) m += Math.abs(a[k] - b[k]) + Math.abs(a[k + 1] - b[k + 1]) + Math.abs(a[k + 2] - b[k + 2])
  return { ...stats(b), motion: +(m / (a.length / 4) / 3).toFixed(1) }
}
const openFile = async (name) => {
  const chooser = page.waitForEvent('filechooser')
  await panel.getByRole('button', { name: 'Imagen o vídeo' }).click()
  await (await chooser).setFiles(join(FIXTURES, name))
  await page.waitForTimeout(1500)
}
const pick = async (name) => {
  await br.getByRole('button', { name: `Poner ${name} en la capa 1` }).click()
  await page.waitForTimeout(2000)
}

await page.evaluate(() => new Promise((r) => { const q = indexedDB.open('keyval-store'); q.onsuccess = () => { const tx = q.result.transaction('keyval', 'readwrite'); tx.objectStore('keyval').delete('shaders'); tx.oncomplete = r } }))
await page.reload()
await page.waitForSelector('.stage canvas')
await reveal(page)
await page.waitForSelector('.panel.visual-input')
log('playing:', await loadTrack(page))
await pick('Entrada visual')
log('no input:', await status(), JSON.stringify(stats(await grab(page))))

await openFile('test-image.png')
log('image:', await status(), JSON.stringify(await motion()), 'error:', await stageError(page))
await shot(page, `${kind}-input-image`)
log('preview:', await panel.locator('.input-preview img').count())

await openFile('test-video.webm')
log('video:', await status(), JSON.stringify(await motion()))
await shot(page, `${kind}-input-video`)

await panel.getByRole('button', { name: 'Cámara' }).click()
await page.waitForTimeout(2500)
log('camera:', await status(), JSON.stringify(await motion()), 'alert:', await panel.getByRole('alert').textContent({ timeout: 200 }).catch(() => null))
await shot(page, `${kind}-input-camera`)

// Back to the image for the effect and the shaders: predictable colours.
await openFile('test-image.png')
const image = stats(await grab(page))

// The effect: plasma masked by the image (black bars stay black).
await pick('Plasma')
const plasma = stats(await grab(page))
await fx.getByLabel('Añadir efecto').selectOption({ label: 'Mezcla con entrada' })
await fx.getByRole('button', { name: 'Parámetros de Mezcla con entrada' }).click()
await fx.getByLabel('Modo', { exact: true }).selectOption({ label: 'Máscara' })
await fx.getByLabel('Cantidad', { exact: true }).fill('1')
await page.waitForTimeout(800)
log('plasma', JSON.stringify(plasma), '| masked by image', JSON.stringify(stats(await grab(page))), 'error:', await stageError(page))
await shot(page, `${kind}-input-mask`)
await fx.getByLabel('Modo', { exact: true }).selectOption({ label: 'Encima' })
await page.waitForTimeout(500)
log('over, amount 1 (≈ image)', JSON.stringify(stats(await grab(page))), '| image alone', JSON.stringify(image))
while (await fx.getByRole('button', { name: 'Quitar efecto' }).count()) await fx.getByRole('button', { name: 'Quitar efecto' }).first().click()

// ISF image input: the inverted image.
const chooser = page.waitForEvent('filechooser')
await sh.getByRole('button', { name: 'Importar' }).click()
await (await chooser).setFiles(join(FIXTURES, 'Input Negative.fs'))
await page.waitForTimeout(800)
await sh.getByRole('button', { name: 'Poner Input Negative en la capa 1' }).click()
await page.waitForTimeout(2000)
log('ISF negative', JSON.stringify(stats(await grab(page))), 'error:', await stageError(page))
await shot(page, `${kind}-input-isf`)

// Shadertoy iChannel1.
await sh.getByRole('button', { name: 'Pegar código' }).click()
await sh.getByLabel('Nombre', { exact: true }).fill('Channel one')
await sh.getByLabel('Código ISF o Shadertoy').fill('void mainImage(out vec4 c, in vec2 p) { c = texture(iChannel1, p / iResolution.xy); }')
await sh.getByRole('button', { name: 'Añadir' }).click()
await page.waitForTimeout(500)
await sh.getByRole('button', { name: 'Poner Channel one en la capa 1' }).click()
await page.waitForTimeout(2000)
log('Shadertoy iChannel1', JSON.stringify(stats(await grab(page))), 'error:', await stageError(page))

await panel.getByRole('button', { name: 'Quitar' }).click()
await page.waitForTimeout(500)
log('removed:', await status(), JSON.stringify(stats(await grab(page))))
for (const n of ['Input Negative', 'Channel one']) await sh.getByRole('button', { name: `Borrar ${n}` }).click()
log('errors:', errors.length ? '\n  ' + errors.join('\n  ') : 'none')
await browser.close()
