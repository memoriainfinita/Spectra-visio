// Redesign phase 5: Ctrl Z undoes and Ctrl Shift Z / Ctrl Y redo, over parameters, layers,
// effects and knobs; changes close together are one step; choosing a layer is not a step;
// text fields keep their own undo.
import { open } from './lib.mjs'

const kind = process.argv[2] ?? 'firefox'
const log = (...a) => console.log(`[${kind}]`, ...a)
const { browser, page, errors } = await open(kind, { reveal: false })
const tab = (name) => page.getByRole('tab', { name, exact: true })
const layers = page.locator('.panel.visuals .layer')
const slider = page.locator('#insp-layer .params').first().locator('input[type=range]').first()
const notice = page.locator('.notices')
const key = async (k) => {
  await page.keyboard.press(k)
  await page.waitForTimeout(80)
}

await tab('Inspector').click()
log('nothing yet:', await (async () => { await page.locator('body').click({ position: { x: 5, y: 5 } }); await key('Control+z'); return notice.textContent() })())

// A slider moved in steps close together: one undo brings it all back.
const v0 = await slider.inputValue()
await slider.focus()
const t0 = Date.now()
for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowRight')
const pressMs = Date.now() - t0
const v1 = await slider.inputValue()
await page.waitForTimeout(700)
await key('Control+z')
log('slider', v0, '->', v1, `(6 presses in ${pressMs} ms)`, '| undo:', await slider.inputValue(), '| notice', await notice.textContent())
await key('Control+Shift+z')
log('redo (Ctrl Shift Z):', await slider.inputValue(), '| notice', await notice.textContent())
await page.waitForTimeout(700)

// A layer added, then chosen: undo takes the layer away, not the choice.
await tab('Capas').click()
const n0 = await layers.count()
await page.getByRole('button', { name: 'Añadir capa' }).click()
await page.waitForTimeout(700)
await layers.first().locator('.layer-pick').click()
await page.waitForTimeout(700)
await page.locator('body').click({ position: { x: 5, y: 5 } })
await key('Control+z')
log('layers', n0, '-> added -> undo:', await layers.count())
await key('Control+y')
log('redo (Ctrl Y):', await layers.count())
await page.waitForTimeout(700)

// An effect, then a knob turned: two steps back.
await tab('Inspector').click()
await page.locator('#insp-layer .effect-add').selectOption({ index: 1 })
await page.waitForTimeout(700)
await tab('Mandos').click()
const knob = page.locator('.panel.knobs').getByRole('slider', { name: 'Mando 1', exact: true })
await knob.focus()
await key('End')
const k1 = await knob.getAttribute('aria-valuenow')
await page.waitForTimeout(700)
await key('Control+z')
log('knob', k1, '-> undo:', await knob.getAttribute('aria-valuenow'))
await key('Control+z')
await tab('Inspector').click()
log('effect after second undo:', await page.locator('#insp-layer li.effect').count())

// A text field keeps Ctrl Z for itself.
await tab('Moduladores').click()
await page.getByRole('button', { name: 'Añadir modulador' }).click()
await page.keyboard.press('Escape')
const name = page.locator('.panel.modulators').getByLabel('Nombre')
await name.fill('abc')
await name.press('Control+z')
log('Ctrl Z in a text field: modulators still', await page.locator('.mod-card').count())

log('errors:', errors.length ? errors : 'none')
await browser.close()
