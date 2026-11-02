// Phase 5, part 3: presets.
import { writeFileSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { open, OUT, reveal, pickLayer } from './lib.mjs'

const kind = process.argv[2] ?? 'firefox'
const { browser, page, errors } = await open(kind)
const log = (...a) => console.log(`[${kind}]`, ...a)
const vis = page.locator('.panel.visuals, .panel.inspector')
const fx = page.locator('#insp-layer .effects')
const pr = page.locator('.panel.presets')
const visual = page.locator('#insp-layer select[aria-label^="Visualización de la capa"]')
const fxNames = () => fx.locator('.effect-name span').allTextContents()
const presetNames = () => pr.locator('.preset-name').allTextContents()
const clearFx = async () => { while (await fx.getByRole('button', { name: 'Quitar efecto' }).count()) await fx.getByRole('button', { name: 'Quitar efecto' }).first().click() }

// Start clean: no presets, no effects, layer A selected.
while (await pr.getByRole('button', { name: 'Borrar' }).count()) await pr.getByRole('button', { name: 'Borrar' }).first().click()
await clearFx()
await pickLayer(page, 1)

// Preset: tunnel with speed 1.5, bloom + palette.
await visual.selectOption('tunnel')
await vis.getByRole('slider', { name: 'Velocidad' }).fill('1.5')
await fx.getByLabel('Añadir efecto').selectOption({ label: 'Brillo difuso' })
await fx.getByLabel('Añadir efecto').selectOption({ label: 'Paleta' })
log('save disabled with empty name:', await pr.getByRole('button', { name: 'Guardar', exact: true }).isDisabled())
await pr.getByLabel('Nombre del preset').fill('Túnel   rápido')
await pr.getByRole('button', { name: 'Guardar', exact: true }).click()
log('presets', await presetNames(), '|', await pr.locator('.preset-sub').allTextContents())

// Change everything, then load on layer B.
await visual.selectOption('plasma')
await clearFx()
await fx.getByLabel('Añadir efecto').selectOption({ label: 'Espejo' })
await pickLayer(page, 2)
await pr.locator('.preset-main').first().click()
log('after load on B: B visual', await visual.inputValue(), '| speed', await vis.getByRole('slider', { name: 'Velocidad' }).inputValue(), '| effects', await fxNames())
await pickLayer(page, 1)
log('layer A untouched:', await visual.inputValue())

// Export one and all.
const d1 = page.waitForEvent('download')
await pr.getByRole('button', { name: 'Exportar', exact: true }).click()
const one = await d1
const onePath = join(OUT, `${kind}-${one.suggestedFilename()}`)
await one.saveAs(onePath)
log('exported file', one.suggestedFilename(), JSON.parse(readFileSync(onePath, 'utf8')).presets.length, 'preset')

// Delete, import back twice, bad file.
await pr.getByRole('button', { name: 'Borrar' }).click()
log('after delete', await presetNames())
for (let i = 0; i < 2; i++) {
  const c = page.waitForEvent('filechooser')
  await pr.getByRole('button', { name: 'Importar' }).click()
  await (await c).setFiles(onePath)
  await page.waitForTimeout(300)
}
log('after importing twice', await presetNames(), '|', await pr.getByRole('status').textContent())
const bad = join(OUT, 'bad.json')
writeFileSync(bad, '{"hello": 1}')
const c = page.waitForEvent('filechooser')
await pr.getByRole('button', { name: 'Importar' }).click()
await (await c).setFiles(bad)
await page.waitForTimeout(300)
log('bad file:', await pr.getByRole('status').textContent())

await page.reload()
await page.waitForSelector('.stage canvas')
await reveal(page)
await page.waitForSelector('.panel.presets')
await page.waitForTimeout(500)
log('after reload', await presetNames())

// Leave it clean.
while (await pr.getByRole('button', { name: 'Borrar' }).count()) await pr.getByRole('button', { name: 'Borrar' }).first().click()
await clearFx()
log('errors:', errors.length ? '\n  ' + errors.join('\n  ') : 'none')
await browser.close()
