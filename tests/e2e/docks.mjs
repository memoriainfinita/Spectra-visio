// Docked layout: tabs by mouse and keyboard, the top bar's pop-ups and the settings
// window, layouts from the menu, moving docks by menu and by dragging, widths, saved
// layouts, the lock, a dock in a window of its own, and the stage across the widths.
import { open, loadTrack, OUT } from './lib.mjs'
let shot = 0

const kind = process.argv[2] ?? 'chrome'
const log = (...a) => console.log(`[${kind}]`, ...a)
const { browser, page, errors } = await open(kind, { reveal: false })
const tab = (name) => page.getByRole('tab', { name, exact: true })
const where = (dock) => page.evaluate((d) => {
  const p = document.getElementById(`dock-${d}`)
  return p ? `${p.closest('.dock-zone')?.className.match(/zone-(\w+)/)?.[1]} ${p.hidden ? 'hidden' : 'shown'}` : 'none'
}, dock)
const button = (name) => page.getByRole('button', { name, exact: true })
const layoutMenu = () => page.getByRole('button', { name: /^Diseño:/ })

log('layout:', await layoutMenu().textContent(), '| page scroll', await page.evaluate(() => document.documentElement.scrollHeight - innerHeight))
log('docks:', ['layers', 'library', 'clips', 'effects', 'overlays', 'audio', 'live', 'auto', 'perform'].map((d) => d).join(','))
for (const d of ['layers', 'library', 'effects', 'audio', 'clips', 'perform']) log(' ', d, await where(d))

// Tabs: click, then the arrow keys.
await tab('Bibliotecas').click()
await tab('Lista').click()
await loadTrack(page)
await tab('Efectos').click()
await tab('Efectos').press('ArrowRight')
log('right of Efectos:', await page.evaluate(() => document.activeElement?.textContent), await where('audio'))
await page.keyboard.press('End')
log('End:', await where('auto'))
await page.reload()
await page.waitForSelector('.stage canvas')
log('after reload: auto', await where('auto'), '| shelf', await page.evaluate(() => document.querySelector('.chip.on')?.textContent))

// The perform bar and the Live panel share their state.
await tab('Directo').click()
const bar = page.locator('.perform-bar')
await bar.getByRole('button', { name: 'Apagón' }).click()
log('blackout from bar -> live panel pressed:', await page.locator('.panel.live').getByRole('button', { name: 'Apagón' }).getAttribute('aria-pressed'))
await bar.getByRole('button', { name: 'Apagón' }).click()

// Pop-ups and the settings window.
await page.getByRole('button', { name: /^Fuente:/ }).click()
log('source pop-up:', await page.locator('.panel.sources').isVisible())
await page.screenshot({ path: `${OUT}/docks-source-${kind}.png` })
await page.keyboard.press('Escape')
log('after Escape:', await page.locator('.panel.sources').isVisible(), '| focus', await page.evaluate(() => document.activeElement?.textContent))
await button('Salida').click()
log('output pop-up:', await page.locator('.panel.output').isVisible())
await page.mouse.click(700, 400)
log('after a click outside:', await page.locator('.panel.output').isVisible())
await button('Ajustes').click()
log('settings window:', await page.getByRole('dialog', { name: 'Ajustes' }).isVisible(), '| midi in it', await page.locator('#settings-body .panel.midi').count(), '| focus', await page.evaluate(() => document.activeElement?.getAttribute('aria-label')))
await page.screenshot({ path: `${OUT}/docks-settings-${kind}.png` })
await page.keyboard.press('Escape')
log('closed:', await page.getByRole('dialog', { name: 'Ajustes' }).isVisible(), '| focus back', await page.evaluate(() => document.activeElement?.textContent))

// Layouts from the menu.
await layoutMenu().click()
await button('Preparar').click()
log('Preparar:', await layoutMenu().textContent(), '| stacks right', await page.locator('.zone-right .dock-stack').count(), '| library', await where('library'))
await button('Directo').click()
await page.keyboard.press('Escape')

// Moving by the dock menu, keeping what is typed in a panel.
await tab('Bibliotecas').click()
await tab('Presets').click()
await page.getByLabel('Nombre del preset').fill('a medias')
await page.getByRole('button', { name: 'Opciones de Bibliotecas' }).click()
await page.getByRole('menuitem', { name: 'A la derecha, debajo' }).click()
log('library moved:', await where('library'), '| stacks right', await page.locator('.zone-right .dock-stack').count(), '| typed kept:', await page.getByLabel('Nombre del preset').inputValue())
await page.reload()
await page.waitForSelector('.stage canvas')
log('after reload:', await where('library'))

// Dragging, only while editing.
await layoutMenu().click()
await page.getByRole('button', { name: 'Editar el diseño…' }).click()
log('editing:', await page.getByRole('toolbar').textContent().then((s) => s.slice(0, 40)))
const drag = async (name, to) => {
  const from = await tab(name).boundingBox()
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(from.x + 40, from.y + 40, { steps: 5 })
  const box = await page.locator(to).first().boundingBox()
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 8 })
  if (!shot++) await page.screenshot({ path: `${OUT}/docks-drag-${kind}.png` })
  await page.mouse.up()
}
await drag('Rótulos', '.zone-strip .dock-stack:last-of-type .drop-area:last-child')
log('overlays dragged under the stage:', await where('overlays'))
await drag('Rótulos', '.zone-left .dock-stack .drop-area >> nth=0')
log('overlays dragged as a tab on the left:', await where('overlays'))
// Escape drops nothing.
const from = await tab('Automático').boundingBox()
await page.mouse.move(from.x + 5, from.y + 5)
await page.mouse.down()
await page.mouse.move(from.x + 200, from.y + 200, { steps: 5 })
await page.keyboard.press('Escape')
await page.mouse.up()
log('escape: auto stays', await where('auto'), '| ghost left', await page.locator('.dock-ghost').count())
await button('Hecho').click()

// Widths, by keyboard.
const sep = page.getByRole('separator', { name: 'Ancho de la zona izquierda' })
const w0 = await sep.getAttribute('aria-valuenow')
await sep.focus()
await page.keyboard.press('ArrowRight')
await page.keyboard.press('ArrowRight')
log('left width', w0, '->', await sep.getAttribute('aria-valuenow'), '| zone', await page.locator('.zone-left').evaluate((e) => Math.round(e.getBoundingClientRect().width)))

// Heights: the strip under the stage, and two stacks sharing the right zone.
const height = (sel) => page.locator(sel).first().evaluate((e) => Math.round(e.getBoundingClientRect().height))
const dragY = async (handle, dy) => {
  const b = await handle.boundingBox()
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2)
  await page.mouse.down()
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2 + dy, { steps: 6 })
  await page.mouse.up()
}
const stripEdge = page.getByRole('separator', { name: 'Alto de la zona bajo el escenario' })
// The strip fits its content until its stacks are resized: then it keeps the height it had.
const st = () => page.locator('.zone-strip .dock-stack').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().height)).join(' / '))
const st0 = `${await st()} in ${await height('.zone-strip')}`
await dragY(page.locator('.zone-strip').getByRole('separator', { name: 'Reparto del alto entre las dos pilas' }), -40)
log('strip stacks', st0, '->', await st(), 'in', await height('.zone-strip'), '| sized', await page.locator('.zone-strip.sized').count())
await stripEdge.dblclick()
const s0 = await height('.zone-strip')
await dragY(stripEdge, -120)
log('strip', s0, '->', await height('.zone-strip'), '| stage', await height('.stage'))
// To the top of the window: the stage keeps its minimum.
await dragY(stripEdge, -((await stripEdge.boundingBox()).y - 2))
log('strip pulled to the top: stage', await height('.stage'), '| stored', await stripEdge.getAttribute('aria-valuenow'), '| still dragging', await page.locator('.splitter-strip.on').count())
await page.reload()
await page.waitForSelector('.stage canvas')
log('after reload: strip', await height('.zone-strip'))
await stripEdge.dblclick()
log('double click: strip', await height('.zone-strip'), '| sized', await page.locator('.zone-strip.sized').count())
const stacksEdge = page.locator('.zone-right').getByRole('separator', { name: 'Reparto del alto entre las dos pilas' })
const r = () => page.locator('.zone-right .dock-stack').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().height)).join(' / '))
const r0 = await r()
await dragY(stacksEdge, 150)
log('right stacks', r0, '->', await r(), '| share', await stacksEdge.getAttribute('aria-valuenow'))
await stacksEdge.focus()
await page.keyboard.press('ArrowUp')
log('arrow up:', await r())
await stacksEdge.dblclick()
log('double click:', await r())
await sep.dblclick()
log('left width after double click:', await sep.getAttribute('aria-valuenow'))

// Saved layouts, and the lock.
await layoutMenu().click()
await page.getByLabel('Nombre del diseño').fill('Prueba')
await page.getByRole('button', { name: 'Guardar como' }).click()
log('saved:', await layoutMenu().textContent())
await page.getByRole('checkbox', { name: 'Bloquear el diseño' }).check()
log('locked: edit disabled', await page.getByRole('button', { name: 'Editar el diseño…' }).isDisabled(), '| splitters', await page.getByRole('separator').count())
await page.keyboard.press('Escape')
await tab('Efectos').click()
await page.getByRole('button', { name: 'Opciones de Efectos' }).click()
log('locked: move disabled', await page.getByRole('menuitem', { name: 'Bajo el escenario' }).isDisabled(), '| window enabled', await page.getByRole('menuitem', { name: 'A otra ventana' }).isEnabled())
await page.keyboard.press('Escape')
await layoutMenu().click()
await page.getByRole('checkbox', { name: 'Bloquear el diseño' }).uncheck()
await button('Borrar este diseño').click()
await button('Borrar').click()
log('deleted:', await layoutMenu().textContent(), '| layouts', await page.locator('.layout-menu .menu[aria-label=Diseños] .menu-item').count())
await button('Restablecer').click()
await page.keyboard.press('Escape')
log('reset: library', await where('library'), '| overlays', await where('overlays'))

// A dock in a window of its own.
await tab('Efectos').click()
await page.getByRole('button', { name: 'Opciones de Efectos' }).click()
const popup = page.waitForEvent('popup')
await page.getByRole('menuitem', { name: 'A otra ventana' }).click()
const w = await popup
await w.waitForTimeout(300)
log('window:', await w.title(), '| effects there', await w.locator('.panel.effects').count(), '| styled', await w.locator('.panel.effects').evaluate((e) => getComputedStyle(e).display), '| placeholder here', await page.locator('#dock-effects .elsewhere').count())
await w.getByRole('combobox').first().selectOption({ index: 1 }).catch(() => {})
log('add effect from the window:', await w.locator('.panel.effects li.effect').count())
await w.close()
await page.waitForTimeout(300)
log('closed: effects back', await page.locator('#dock-effects .panel.effects').count(), '| effects', await page.locator('.panel.effects li.effect').count())

// The same stage canvas across the widths; the laptop layout between 800 and 1279.
await page.evaluate(() => { document.querySelector('.stage canvas').dataset.k = 'same' })
await page.setViewportSize({ width: 1024, height: 768 })
await page.waitForTimeout(400)
log('1024:', await layoutMenu().textContent(), '| zones', await page.locator('.dock-zone').count(), '| same canvas', await page.locator('.stage canvas[data-k=same]').count())
// The empty right zone of the laptop layout takes a dock while editing.
await layoutMenu().click()
await page.getByRole('button', { name: 'Editar el diseño…' }).click()
log('editing laptop: drop areas outside drags', await page.locator('.drop-area').count())
await drag('Efectos', '.zone-right .drop-area.empty')
await button('Hecho').click()
log('effects into the empty zone:', await where('effects'), '| stacks right', await page.locator('.zone-right .dock-stack').count())
await page.setViewportSize({ width: 700, height: 900 })
await page.waitForTimeout(400)
log('700: tablists', await page.locator('.dock-tabs').count(), '| panels', await page.locator('section.panel').count(), '| same canvas', await page.locator('.stage canvas[data-k=same]').count())
await page.setViewportSize({ width: 1600, height: 1000 })
await page.waitForTimeout(400)
log('1600 again:', await layoutMenu().textContent(), '| same canvas', await page.locator('.stage canvas[data-k=same]').count())
log('errors:', errors.filter((e) => !e.includes('WebGL')).join('\n  ') || 'none')
await browser.close()
