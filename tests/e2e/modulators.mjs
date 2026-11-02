// Redesign phase 4: shared modulators. One oscillator mapped onto a layer parameter and an
// effect parameter, the live value moving with it, the band on the parameter, the
// assignment list, Escape ending the mapping, and all of it after a reload.
import { open, loadTrack } from './lib.mjs'

const kind = process.argv[2] ?? 'firefox'
const log = (...a) => console.log(`[${kind}]`, ...a)
const { browser, page, errors } = await open(kind, { reveal: false })
const panel = page.locator('.panel.modulators')
const tab = (name) => page.getByRole('tab', { name, exact: true })
const targets = page.locator('.map-target')
const firstParam = page.locator('#insp-layer .params').first().locator('.param').first()
// The live mark of a parameter, sampled: how much it moves over a second.
const spread = async (param) => {
  const xs = []
  for (let i = 0; i < 12; i++) {
    xs.push(await param.locator('.live-mark').evaluate((el) => parseFloat(el.style.left)))
    await page.waitForTimeout(90)
  }
  return Math.round(Math.max(...xs) - Math.min(...xs))
}

await tab('Bibliotecas').click()
await tab('Audio').click()
log('playing:', await loadTrack(page))
await tab('Inspector').click()
await page.locator('#insp-layer .effect-add').selectOption({ index: 1 })
log('layer effect:', await page.locator('#insp-layer li.effect').count(), '| param moves before', await spread(firstParam))

// A synced oscillator: adding it starts mapping.
await tab('Moduladores').click()
await panel.getByLabel('Tipo de modulador').selectOption({ label: 'Oscilador' })
await panel.getByRole('button', { name: 'Añadir modulador' }).click()
log('added:', await panel.locator('.mod-card').count(), '| banner', await panel.locator('.mapping-banner span').textContent(), '| map pressed', await panel.getByRole('button', { name: 'Mapear Oscilador 1' }).getAttribute('aria-pressed'))

await tab('Inspector').click()
log('mappable parameters:', await targets.count())
await firstParam.locator('.map-target').click()
await page.locator('#insp-layer li.effect').first().getByRole('button', { name: /^Parámetros de / }).click()
const effectParam = page.locator('#insp-layer li.effect .param').first()
await effectParam.locator('.map-target').click()
log('mapped: layer param', await firstParam.locator('.map-target').getAttribute('aria-pressed'), '| effect param', await effectParam.locator('.map-target').getAttribute('aria-pressed'), '| band', await firstParam.locator('.mod-band').count())
await firstParam.locator('.map-target').click()
log('click again takes it off:', await firstParam.locator('.map-target').getAttribute('aria-pressed'), '| band', await firstParam.locator('.mod-band').count())
await firstParam.locator('.map-target').click()
await page.keyboard.press('Escape')
log('escape: mappable', await targets.count(), '| band stays', await firstParam.locator('.mod-band').count())
log('param moves with the oscillator:', await spread(firstParam))

await tab('Moduladores').click()
log('card:', await panel.locator('.mod-card-name .small').textContent(), '| assignments', await panel.locator('.mod-assign-row').count(), '|', (await panel.locator('.mod-assign-dst').allTextContents()).join(' / '))
const meter = await panel.locator('.mod-meter span').evaluate((el) => el.style.transform)
log('meter:', meter)

// Amount 0 on the layer parameter: it stops moving.
const amount = panel.getByRole('slider', { name: /^Cantidad en Capa 1 · Caleidoscopio/ })
await amount.fill('0')
await tab('Inspector').click()
log('amount 0, param moves:', await spread(firstParam))

// Renamed, then all of it after a reload.
await tab('Moduladores').click()
await panel.getByLabel('Nombre').fill('Pulso')
await panel.getByLabel('Nombre').press('Enter')
await page.waitForTimeout(600)
await page.reload()
await page.waitForSelector('.stage canvas')
await page.waitForTimeout(800)
await tab('Moduladores').click()
log('after reload:', await panel.locator('.mod-card').count(), 'modulator', await panel.getByLabel('Nombre').inputValue(), '| assignments', await panel.locator('.mod-assign-row').count())
await panel.getByRole('button', { name: 'Quitar Pulso' }).click()
log('removed:', await panel.locator('.mod-card').count(), '| assignments', await panel.locator('.mod-assign-row').count())

log('errors:', errors.length ? errors : 'none')
await browser.close()
