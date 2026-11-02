// Dragging: the amount of a shared modulator dragged sideways on the parameter while mapping,
// a layer opacity as a destination, controls dragged onto My panel in Edit mode (and not
// acting meanwhile), and the undo notice saying what it undid.
import { open } from './lib.mjs'

const kind = process.argv[2] ?? 'firefox'
const log = (...a) => console.log(`[${kind}]`, ...a)
const { browser, page, errors } = await open(kind, { reveal: false })
const tab = (name) => page.getByRole('tab', { name, exact: true })
const mods = page.locator('.panel.modulators')
const panel = page.locator('.panel.mypanel')
const notice = page.locator('.notices')
const filled = () => panel.locator('.mypanel-cell:not(.empty)').count()
const firstParam = page.locator('#insp-layer .params').first().locator('.param').first()
const amountSlider = mods.getByRole('slider', { name: /^Cantidad en Capa 1 · / }).first()

const centre = async (loc) => {
  const b = await loc.boundingBox()
  return { x: b.x + b.width / 2, y: b.y + b.height / 2, w: b.width }
}
async function drag(from, to) {
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, { steps: 4 })
  await page.mouse.move(to.x, to.y, { steps: 6 })
  await page.mouse.up()
  await page.waitForTimeout(120)
}

// An oscillator maps; a parameter gets it by a click and its amount by dragging.
await tab('Inspector').click()
await tab('Moduladores').click()
await mods.getByLabel('Tipo de modulador').selectOption({ label: 'Oscilador' })
await mods.getByRole('button', { name: 'Añadir modulador' }).click()
await tab('Inspector').click()
const target = firstParam.locator('.map-target')
await target.click()
await tab('Moduladores').click()
log('click maps at', await amountSlider.inputValue())
await tab('Inspector').click()
const c = await centre(target)
await drag(c, { x: c.x + c.w * 0.2, y: c.y })
log('drag right by a fifth of the width: still on', await target.getAttribute('aria-pressed'))
await tab('Moduladores').click()
log('amount after (50 + about 20):', await amountSlider.inputValue())
await tab('Inspector').click()
const c2 = await centre(target)
await drag(c2, { x: c2.x - c2.w * 0.4, y: c2.y })
await tab('Moduladores').click()
log('amount after dragging left (about 30):', await amountSlider.inputValue())

// The opacity of a layer takes the modulator too.
await tab('Inspector').click()
const opacities = page.locator('.layer-opacity-wrap .map-target')
log('opacity targets while mapping:', await opacities.count())
await opacities.first().click()
log('opacity mapped:', await opacities.first().getAttribute('aria-pressed'), '| bands on layers', await page.locator('.layer-opacity-wrap .mod-band').count())
await page.keyboard.press('Escape')
log('escape: opacity targets', await opacities.count(), '| band stays', await page.locator('.layer-opacity-wrap .mod-band').count())
await tab('Moduladores').click()
log('assignments:', (await mods.locator('.mod-assign-dst').allTextContents()).join(' / '))

// My panel in Edit: controls are picked up and dropped on cells, and do not act.
await tab('Mi panel').click()
await page.getByRole('button', { name: 'Editar', exact: true }).click()
await page.waitForTimeout(500)
log('body armed:', await page.evaluate(() => document.body.classList.contains('panel-editing')))
await tab('Inspector').click()
const row = page.locator('#insp-layer .param-row').nth(1)
const slider = row.locator('input[type=range]')
const before = await slider.inputValue()
const cells = panel.locator('.mypanel-cell')
const cell = async (i) => centre(cells.nth(i))
const start = await filled()
const r = await row.boundingBox()
await drag({ x: r.x + 30, y: r.y + r.height / 2 }, await cell(10))
log('parameter dropped: cells', start, '->', await filled(), '| slider unmoved', before === (await slider.inputValue()))

await tab('Directo').click()
const blackout = page.locator('.panel.live button[data-control]').first()
await drag(await centre(blackout), await cell(11))
log('blackout dropped: cells', await filled(), '| it did not act:', await blackout.getAttribute('aria-pressed'))

const cross = page.locator('.panel.visuals input[type=range][data-control]').last()
const cb = await cross.inputValue()
await drag(await centre(cross), await cell(12))
log('crossfader dropped: cells', await filled(), '| value unmoved', cb === (await cross.inputValue()))
log('names in cells:', await cells.evaluateAll((els) => els.filter((e) => !e.classList.contains('empty')).map((e) => e.innerText.replace(/\s+/g, ' ').trim())))

// Esc during a drag drops nothing.
{
  const from = await centre(blackout)
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(from.x + 30, from.y + 30, { steps: 3 })
  await page.keyboard.press('Escape')
  const t = await cell(13)
  await page.mouse.move(t.x, t.y, { steps: 4 })
  await page.mouse.up()
  log('escape mid-drag: cells', await filled(), '| ghost', await page.locator('.panel-ghost').count())
}

// Done: the controls act again.
await page.getByRole('button', { name: 'Hecho', exact: true }).click()
await page.waitForTimeout(500)
log('body armed after Done:', await page.evaluate(() => document.body.classList.contains('panel-editing')))
await blackout.click()
log('blackout acts again:', await blackout.getAttribute('aria-pressed'))
await blackout.click()

// Undo says what it undid.
await page.locator('body').click({ position: { x: 5, y: 5 } })
await page.keyboard.press('Control+z')
await page.waitForTimeout(100)
log('undo notice:', await notice.textContent())

await tab('Mi panel').click()
await page.getByRole('button', { name: 'Editar', exact: true }).click()
await page.waitForTimeout(400)
// Names stay readable: no label cut short, at a narrow width too.
for (const width of [1600, 1100]) {
  await page.setViewportSize({ width, height: 1000 })
  await page.waitForTimeout(500)
  await tab('Mi panel').click()
  await page.waitForTimeout(400)
  log(width, 'px: columns', await page.locator('.mypanel-grid').evaluate((g) => getComputedStyle(g).gridTemplateColumns.split(' ').length), '| labels cut short', await panel.locator('.mypanel-slider span, .mypanel .knob-name, .mypanel-action').evaluateAll((els) => els.filter((e) => e.scrollHeight > e.clientHeight + 1).length))
  await panel.screenshot({ path: process.env.SHOTS ? process.env.SHOTS + '/mypanel-' + width + '.png' : undefined })
}
await page.setViewportSize({ width: 1600, height: 1000 })
await page.waitForTimeout(400)

await page.getByRole('button', { name: 'Hecho', exact: true }).click()

log('errors:', errors.length ? errors : 'none')
await browser.close()
