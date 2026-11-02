// Redesign phase 3: knobs with several destinations, the right-click menu that puts a
// control on a knob, the composition and layer knobs in the Inspector, and variations that
// bring the panel back, at once or over beats.
import { open, loadTrack, OUT } from './lib.mjs'

const kind = process.argv[2] ?? 'firefox'
const log = (...a) => console.log(`[${kind}]`, ...a)
const { browser, page, errors } = await open(kind, { reveal: false })
const knobs = page.locator('.panel.knobs')
const dial = (name, scope = knobs) => scope.getByRole('slider', { name, exact: true })
const menu = page.locator('.knob-menu')
const opacity2 = page.locator('.panel.visuals').getByLabel('Opacidad de la capa 2')
const num = async (loc) => Number(await loc.inputValue())

await page.getByRole('tab', { name: 'Bibliotecas' }).click()
await page.getByRole('tab', { name: 'Audio', exact: true }).click()
log('playing:', await loadTrack(page))
await page.getByRole('tab', { name: 'Inspector', exact: true }).click()
await page.getByRole('tab', { name: 'Capas' }).click()
await page.getByRole('tab', { name: 'Mandos' }).click()
log('panel knobs', await knobs.getByRole('slider').count(), '| comp knobs', await page.locator('#insp-comp .knob-dial').count(), '| layer knobs', await page.locator('#insp-layer .knob-dial').count())

// A parameter of layer 1 and the opacity of layer 2 on knob 1, by right click.
const param = page.locator('#insp-layer .param-row').first()
const paramName = await param.locator('.param-name').textContent()
const paramSlider = param.locator('input[type=range]')
await param.click({ button: 'right' })
log('menu:', await menu.isVisible(), '|', await menu.locator('.knob-menu-what').textContent(), '| groups', await menu.locator('.knob-menu-group-title').allTextContents(), '| focus', await page.evaluate(() => document.activeElement?.textContent))
await menu.getByRole('menuitemcheckbox', { name: 'Mando 1' }).first().click()
await opacity2.click({ button: 'right' })
await menu.getByRole('menuitemcheckbox', { name: 'Mando 1' }).first().click()
log('knob 1:', await dial('Mando 1').getAttribute('title'))
await opacity2.click({ button: 'right' })
log('opacity 2 menu, knob 1 ticked:', await menu.getByRole('menuitemcheckbox', { name: 'Mando 1' }).first().getAttribute('aria-checked'))
await page.keyboard.press('Escape')
log('escape: menu', await menu.count())

// Turning by keyboard: both destinations follow, each over its range.
await dial('Mando 1').focus()
await page.keyboard.press('End')
log(`End: ${paramName}`, await num(paramSlider), 'max', await paramSlider.getAttribute('max'), '| opacity 2', await num(opacity2), '| playing still', await page.getByRole('button', { name: 'Pausa', exact: true }).first().count())
await page.keyboard.press('Home')
log(`Home: ${paramName}`, await num(paramSlider), 'min', await paramSlider.getAttribute('min'), '| opacity 2', await num(opacity2))
for (let i = 0; i < 5; i++) await page.keyboard.press('Shift+ArrowUp')
log('5 × Shift+Up:', await dial('Mando 1').getAttribute('aria-valuenow'), '| opacity 2', await num(opacity2))

// Mouse: drag up, then the wheel.
const box = await dial('Mando 1').boundingBox()
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
await page.mouse.down()
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 - 60, { steps: 6 })
await page.mouse.up()
log('dragged up 60 px:', await dial('Mando 1').getAttribute('aria-valuenow'))
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
const scrollBefore = await page.evaluate(() => document.querySelector('.zone-strip .dock-body:not([hidden])')?.scrollTop ?? 0)
await page.mouse.wheel(0, 300)
await page.waitForTimeout(100)
log('wheel down:', await dial('Mando 1').getAttribute('aria-valuenow'), '| dock scrolled', (await page.evaluate(() => document.querySelector('.zone-strip .dock-body:not([hidden])')?.scrollTop ?? 0)) !== scrollBefore)

// The editor: name, an inverted range, a destination off.
await knobs.getByRole('button', { name: 'Editar Mando 1' }).click()
const editor = page.getByRole('dialog', { name: 'Qué mueve Mando 1' })
log('editor:', await editor.isVisible(), '| dests', await editor.locator('.knob-dest').count(), '| inside the window', await editor.evaluate((e) => { const r = e.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight }))
await editor.getByLabel('Desde, en Opacidad de la capa 2').fill('100')
await editor.getByLabel('Hasta, en Opacidad de la capa 2').fill('0')
log('inverted note:', await editor.getByText('Invertido').count())
await editor.getByLabel('Nombre').fill('Energía')
await page.screenshot({ path: `${OUT}/knobs-editor-${kind}.png` })
await page.keyboard.press('Escape')
await dial('Energía').focus()
await page.keyboard.press('End')
log('renamed, End: opacity 2 (inverted)', await num(opacity2))
await page.keyboard.press('Home')
log('Home: opacity 2', await num(opacity2))

// Variations: at 0 and at 100; the first fades over 4 beats, the second cuts.
await knobs.getByRole('button', { name: 'Guardar la posición actual' }).click()
await page.keyboard.press('End')
await dial('Energía').focus()
await page.keyboard.press('End')
await knobs.getByRole('button', { name: 'Guardar la posición actual' }).click()
log('variations:', await knobs.locator('.variation-launch').allTextContents())
await knobs.getByRole('button', { name: 'Opciones de Variación 2' }).click()
const ved = page.getByRole('dialog', { name: 'Variación Variación 2' })
await ved.getByRole('button', { name: 'Corte' }).click()
await ved.getByLabel('Nombre').fill('Drop')
await page.keyboard.press('Escape')
const t0 = Date.now()
await knobs.getByRole('button', { name: 'Lanzar Variación 1' }).click()
await page.waitForTimeout(500)
const mid = Number(await dial('Energía').getAttribute('aria-valuenow'))
log('variation 1 after 0.5 s:', mid, '| moving', await knobs.locator('.variation.moving').count())
await page.waitForFunction(() => document.querySelector('.panel.knobs [role=slider]')?.getAttribute('aria-valuenow') === '0', null, { timeout: 6000 }).catch(() => {})
log('variation 1 reached 0 after', ((Date.now() - t0) / 1000).toFixed(1), 's (4 beats without tempo: 2 s) | opacity 2', await num(opacity2))
await knobs.getByRole('button', { name: 'Lanzar Drop' }).click()
log('Drop cuts:', await dial('Energía').getAttribute('aria-valuenow'), '| pressed', await knobs.getByRole('button', { name: 'Lanzar Drop' }).getAttribute('aria-pressed'))
// A knob moved by hand stops a variation on its way.
await knobs.getByRole('button', { name: 'Lanzar Variación 1' }).click()
await page.waitForTimeout(300)
await dial('Energía').focus()
await page.keyboard.press('End')
await page.waitForTimeout(800)
log('hand during a fade: stays at', await dial('Energía').getAttribute('aria-valuenow'), '| moving', await knobs.locator('.variation.moving').count())

// The composition's knobs: an effect parameter of layer 1 by keyboard menu.
await page.locator('#insp-layer').getByLabel('Añadir efecto a la capa 1').selectOption({ label: 'Espejo' })
await page.locator('#insp-layer').getByRole('button', { name: 'Parámetros de Espejo' }).click()
const fxSelect = page.locator('#insp-layer .effects .param-row select').first()
// The menu key or Shift+F10, whichever the browser turns into a context menu.
await paramSlider.focus()
let used = null
for (const key of ['Shift+F10', 'ContextMenu']) {
  await page.keyboard.press(key)
  if (await menu.count()) {
    used = key
    break
  }
}
log('keyboard menu by', used, ':', await menu.count(), '|', used && (await menu.locator('.knob-menu-what').textContent()), '| focus on', await page.evaluate(() => document.activeElement?.getAttribute('role')))
await page.keyboard.press('ArrowDown')
await page.keyboard.press('ArrowDown')
log('arrows move focus to', await page.evaluate(() => document.activeElement?.textContent))
await page.keyboard.press('Escape')
log('escape: focus back on', await page.evaluate(() => document.activeElement?.tagName))
await page.locator('#insp-layer .effects .param-row').first().click({ button: 'right' })
await menu.getByRole('group', { name: 'Composición' }).getByRole('menuitemcheckbox', { name: 'Mando 1' }).click()
await page.getByRole('tab', { name: 'Composición', exact: true }).click()
await dial('Mando 1', page.locator('#insp-comp')).focus()
await page.keyboard.press('End')
await page.getByRole('tab', { name: 'Capa 1', exact: true }).click()
log('comp knob 1 at 100: mirror mode', await fxSelect.inputValue())

// A layer knob on the crossfader.
await page.locator('.panel.visuals').getByLabel('Crossfader', { exact: true }).click({ button: 'right' })
await menu.getByRole('group', { name: 'Capa 1' }).getByRole('menuitemcheckbox', { name: 'Mando 1' }).click()
await dial('Mando 1', page.locator('#insp-layer')).focus()
await page.keyboard.press('End')
log('layer 1 knob 1 at 100: crossfader', await num(page.locator('.panel.visuals').getByLabel('Crossfader', { exact: true })))
await page.keyboard.press('Home')
await page.screenshot({ path: `${OUT}/knobs-${kind}.png` })

// Removing layer 2 takes its destination off the knob; all of it survives a reload.
await page.locator('.panel.visuals').getByRole('button', { name: 'Quitar la capa 2' }).click()
log('layer 2 removed: Energía', await dial('Energía').getAttribute('title'))
await page.waitForTimeout(600)
await page.reload()
await page.waitForSelector('.stage canvas')
log('after reload: Energía', await dial('Energía').getAttribute('title'), 'at', await dial('Energía').getAttribute('aria-valuenow'), '| variations', await knobs.locator('.variation-launch').allTextContents(), '| comp knob 1', await page.locator('#insp-comp .knob-dial').first().getAttribute('title'))

// Shortcuts and MIDI list the new targets.
await page.getByRole('button', { name: 'Ajustes', exact: true }).click()
await page.getByRole('tab', { name: 'Atajos de teclado' }).click().catch(() => page.getByRole('button', { name: 'Atajos de teclado' }).click())
log('shortcuts list variations:', await page.getByText('Variación 1', { exact: true }).count() > 0)
await page.keyboard.press('Escape')
log('errors:', errors.length ? '\n  ' + errors.join('\n  ') : 'none')
await browser.close()
