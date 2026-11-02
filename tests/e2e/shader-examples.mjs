// The example shaders: each is added from the Shaders panel (the app compiles it first and
// refuses a broken one), then drawn on layer 1 while a track plays.
import { open, loadTrack, grab, stats, pickLayer, FIXTURES } from './lib.mjs'
import { join } from 'node:path'

const kind = process.argv[2] ?? 'firefox'
const log = (...a) => console.log(`[${kind}]`, ...a)
const { browser, page, errors } = await open(kind, {})
const panel = page.locator('.panel.shaders')
const check = (name, ok) => log(ok ? 'PASS' : 'FAIL', name)
const motion = async () => {
  const a = await grab(page)
  await page.waitForTimeout(500)
  const b = await grab(page)
  let m = 0
  for (let k = 0; k < a.length; k += 4) m += Math.abs(a[k] - b[k]) + Math.abs(a[k + 1] - b[k + 1]) + Math.abs(a[k + 2] - b[k + 2])
  return { ...stats(b), motion: +(m / (a.length / 4) / 3).toFixed(1) }
}

const names = ['Túnel de espectro', 'Aberración sobre la entrada', 'Rayas al golpe', 'Flujo de ruido']
log('playing:', await loadTrack(page))
await pickLayer(page, 1)

for (const name of names) {
  await panel.getByRole('button', { name: `Copiar ${name} a tus shaders` }).click()
  await page.waitForTimeout(400)
  const alert = await panel.getByRole('alert').count()
  const added = await panel.locator('.preset-list').nth(1).getByText(name, { exact: true }).count()
  check(`${name}: compiles and is added`, alert === 0 && added === 1)
  check(`${name}: button is disabled once added`, await panel.getByRole('button', { name: `Copiar ${name} a tus shaders` }).isDisabled())
}

// Drawn on layer 1: the ones that need no visual input must draw and move.
for (const name of ['Túnel de espectro', 'Rayas al golpe', 'Flujo de ruido']) {
  await panel.getByRole('button', { name: `Poner ${name} en la capa 1` }).click()
  await page.waitForTimeout(2000)
  const m = await motion()
  log(name, JSON.stringify(m))
  check(`${name}: draws and moves`, m.mean > 2 && m.motion > 0.3)
}

// The input split draws the layer's input: with one, it is not black.
await panel.getByRole('button', { name: 'Poner Aberración sobre la entrada en la capa 1' }).click()
const chooser = page.waitForEvent('filechooser')
await page.locator('.panel.visual-input').getByRole('button', { name: 'Imagen o vídeo' }).click()
await (await chooser).setFiles(join(FIXTURES, 'test-video.webm'))
await page.waitForTimeout(2000)
const split = await motion()
log('Aberración sobre la entrada', JSON.stringify(split))
check('Aberración sobre la entrada: shows the input', split.mean > 2)

log('page errors:', errors.length ? errors.join(' | ') : 'none')
await browser.close()
