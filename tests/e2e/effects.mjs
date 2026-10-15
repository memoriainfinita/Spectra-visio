// Phase 5, part 1: effect chain and palettes.
import { open, loadTrack, grab, stats, shot, stageError, reveal } from './lib.mjs'

const kind = process.argv[2] ?? 'firefox'
const { browser, page, errors } = await open(kind)
const log = (...a) => console.log(`[${kind}]`, ...a)
const fx = page.locator('#insp-layer .effects')
const add = (label) => fx.getByLabel('Añadir efecto').selectOption({ label })
const entries = () => fx.locator('.effect-name span').allTextContents()
const clear = async () => { while (await fx.getByRole('button', { name: 'Quitar efecto' }).count()) await fx.getByRole('button', { name: 'Quitar efecto' }).first().click() }

log('playing:', await loadTrack(page))
log('base', stats(await grab(page)))
await shot(page, `${kind}-0-base`)

const names = ['Brillo difuso', 'Realimentación', 'Estelas', 'Espejo', 'Caleidoscopio', 'Corrección de color', 'Paleta']
for (const [i, name] of names.entries()) {
  await clear()
  await add(name)
  await page.waitForTimeout(1200)
  log(name, stats(await grab(page)), 'error:', await stageError(page))
  await shot(page, `${kind}-${i + 1}-${name.replace(/ /g, '_')}`)
}

// Mirror modes: halves must match.
await clear()
await add('Espejo')
await fx.getByRole('button', { name: 'Parámetros de Espejo' }).click()
for (const mode of ['Horizontal', 'Vertical', 'Ambos']) {
  await fx.getByLabel('Modo', { exact: true }).selectOption({ label: mode })
  await page.waitForTimeout(400)
  log('mirror', mode, stats(await grab(page)))
}

// Mono palette at full amount: grey only. Saturation 0 too.
await clear()
await add('Paleta')
await fx.getByRole('button', { name: 'Parámetros de Paleta' }).click()
await fx.getByLabel('Paleta', { exact: true }).selectOption({ label: 'Monocromo' })
await page.waitForTimeout(400)
log('palette mono', stats(await grab(page)))
await fx.getByLabel('Paleta', { exact: true }).selectOption({ label: 'Fuego' })
await page.waitForTimeout(400)
log('palette fire', stats(await grab(page)))
await shot(page, `${kind}-palette-fire`)

// Chain order, disable, modulation with live mark.
await add('Corrección de color')
await add('Estelas')
log('order', await entries())
await fx.getByRole('button', { name: 'Subir' }).nth(2).click()
log('after moving Estelas up', await entries())
await fx.getByLabel('Activar Paleta').uncheck()
await page.waitForTimeout(400)
log('palette off, colour back', stats(await grab(page)))
const color = fx.locator('.effect').filter({ hasText: 'Corrección de color' })
await color.getByRole('button', { name: 'Parámetros de Corrección de color' }).click()
await color.getByRole('slider', { name: 'Saturación' }).fill('0')
await page.waitForTimeout(400)
log('saturation 0', stats(await grab(page)))
await color.getByRole('button', { name: 'Modulación de Brillo' }).click()
await color.getByRole('button', { name: 'Añadir modulación' }).click()
const marks = []
for (let i = 0; i < 6; i++) {
  marks.push(await color.locator('.live-mark').first().evaluate((el) => el.style.left))
  await page.waitForTimeout(150)
}
log('brightness live mark', marks.join(' '))

// Persistence.
await page.waitForTimeout(800)
await page.reload()
await page.waitForSelector('.stage canvas')
await reveal(page)
await page.waitForSelector('.panel.inspector')
await page.waitForTimeout(800)
log('after reload', await entries(), 'palette enabled:', await fx.getByLabel('Activar Paleta').isChecked())
log('errors:', errors.length ? '\n  ' + errors.join('\n  ') : 'none')
await clear()
await browser.close()
