// A visual input for each layer: an image on layer 1 and a video on layer 2, each layer
// drawing its own, the panels showing the selected layer's, the video controls following the
// selection, stopping one leaving the other, and a clip's content.
import { open, loadTrack, grab, stats, pickLayer, useSource, sourceBox, FIXTURES } from './lib.mjs'
import { join } from 'node:path'

const kind = process.argv[2] ?? 'firefox'
const log = (...a) => console.log(`[${kind}]`, ...a)
const { browser, page, errors } = await open(kind, {})
const panel = sourceBox(page)
const status = () => panel.getByRole('status').textContent()
const title = () => page.locator('#insp-tab-layer').textContent()
const videoFold = page.locator('.insp-fold, .fold').filter({ hasText: 'Vídeo de la entrada visual' })
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
const solo = (n) => page.getByRole('button', { name: `Solo la capa ${n}`, exact: true })

log('playing:', await loadTrack(page))
// Both layers show the input, and the crossfader lets both through.
for (const n of [1, 2]) {
  await pickLayer(page, n)
  await useSource(page)
}
await page.locator('.panel.visuals input[type=range]').last().fill('0.5')
await page.waitForTimeout(500)

await pickLayer(page, 1)
log('layer 1 before:', await title(), '|', await status())
await openFile('test-image.png')
log('layer 1 image:', await status())
await pickLayer(page, 2)
log('layer 2 before:', await title(), '|', await status())
await openFile('test-video.webm')
log('layer 2 video:', await status())
await pickLayer(page, 1)
log('back on layer 1:', await title(), '|', await status(), '| preview image', await panel.locator('.input-preview img').count(), 'video', await panel.locator('.input-preview video').count())

// Each layer draws its own: alone, layer 1 holds still and layer 2 moves.
await solo(1).click()
await page.waitForTimeout(600)
const one = await motion()
await solo(1).click()
await solo(2).click()
await page.waitForTimeout(600)
const two = await motion()
await solo(2).click()
log('solo layer 1 (image, still):', JSON.stringify(one), '| solo layer 2 (video, moves):', JSON.stringify(two))

// The video controls belong to the selected layer's video.
await pickLayer(page, 1)
log('layer 1 selected: video controls', await videoFold.count())
await pickLayer(page, 2)
log('layer 2 selected: video controls', await videoFold.count())

// Stopping layer 2 leaves layer 1 as it was.
await panel.getByRole('button', { name: 'Quitar' }).click()
await page.waitForTimeout(500)
log('layer 2 stopped:', await status())
await pickLayer(page, 1)
log('layer 1 still has its input:', await status())
await solo(2).click()
await page.waitForTimeout(500)
log('solo layer 2 without input (black):', JSON.stringify(stats(await grab(page))))
await solo(2).click()

// A clip chooses between a visualization and the input.
await page.locator('.panel.clips tbody tr').last().locator('.clip').first().click({ button: 'right' })
await page.locator('.knob-menu, .clip-menu').getByRole('menuitem', { name: 'Guardar la capa aquí' }).click()
await page.locator('.panel.clips tbody tr').last().locator('.clip').first().click()
const content = page.locator('#insp-clip').getByRole('group', { name: 'Contenido' })
const pressed = async (name) => content.getByRole('button', { name, exact: true }).getAttribute('aria-pressed')
log('clip of the input layer: input', await pressed('Fuente'), '| visualization', await pressed('Visualización'))
await content.getByRole('button', { name: 'Visualización', exact: true }).click()
log('clip as a visualization: input', await pressed('Fuente'), '| visualization', await pressed('Visualización'))
await content.getByRole('button', { name: 'Fuente', exact: true }).click()
log('clip back to the input: input', await pressed('Fuente'))

log('errors:', errors.length ? '\n  ' + errors.join('\n  ') : 'none')
await browser.close()
