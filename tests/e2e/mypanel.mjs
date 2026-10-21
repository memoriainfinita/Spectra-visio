// Redesign phase 5: My panel and MIDI learned with a right click on any control, with a fake
// Web MIDI input. An action and a parameter go to My panel and get a MIDI control each from
// their menu; the panel drives them; Edit adds the crossfader, moves and removes.
import { open } from './lib.mjs'

const kind = process.argv[2] ?? 'firefox'
const log = (...a) => console.log(`[${kind}]`, ...a)
const { browser, page, errors } = await open(kind, {
  reveal: false,
  init: () => {
    const input = { id: 'fake-1', name: 'Fake controller', onmidimessage: null }
    navigator.requestMIDIAccess = async () => ({ inputs: new Map([[input.id, input]]), outputs: new Map(), onstatechange: null })
    window.__midi = (bytes) => input.onmidimessage?.({ data: new Uint8Array(bytes), timeStamp: performance.now() })
  },
})
const send = (bytes) => page.evaluate((b) => window.__midi(b), bytes)
const tab = (name) => page.getByRole('tab', { name, exact: true })
const menu = page.locator('.knob-menu')
const panel = page.locator('.panel.mypanel')
const filled = () => panel.locator('.mypanel-cell:not(.empty)').count()
const blackout = () => page.locator('.perform-bar .perform-group button').first()

// Blackout: to My panel and a MIDI note, from its right-click menu.
await blackout().click({ button: 'right' })
log('action menu:', await menu.locator('.knob-menu-what').textContent(), '|', await menu.getByRole('menuitemcheckbox').allTextContents(), '| knob groups', await menu.locator('.knob-menu-group-title').count())
await menu.getByRole('button', { name: 'Control MIDI de Apagón' }).click()
await send([0x90, 50, 100]); await send([0x80, 50, 0])
log('blackout note:', await menu.locator('.midi-learn .btn').first().textContent())
await menu.getByRole('menuitemcheckbox', { name: 'Añadir a Mi panel' }).click()
await send([0x90, 50, 100]); await send([0x80, 50, 0])
await page.waitForTimeout(100)
log('note 50 presses blackout:', await blackout().getAttribute('aria-pressed'))
await send([0x90, 50, 100]); await send([0x80, 50, 0])

// A layer parameter: to My panel and CC 20.
await tab('Inspector').click()
const row = page.locator('#insp-layer .param-row').first()
const pname = await row.locator('.param-name').textContent()
const pslider = row.locator('input[type=range]')
await row.click({ button: 'right' })
log('param menu: knob groups', await menu.locator('.knob-menu-group-title').count(), '| panel item', await menu.getByRole('menuitemcheckbox', { name: 'Añadir a Mi panel' }).count())
await menu.locator('.midi-learn .btn').first().click()
await send([0xb0, 20, 10])
log('param CC:', await menu.locator('.midi-learn .btn').first().textContent())
await menu.getByRole('menuitemcheckbox', { name: 'Añadir a Mi panel' }).click()
await send([0xb0, 20, 127])
await page.waitForTimeout(100)
log(`CC 20 at 127: ${pname}`, await pslider.inputValue(), 'max', await pslider.getAttribute('max'))
await send([0xb0, 20, 0])
await page.waitForTimeout(100)
log(`CC 20 at 0: ${pname}`, await pslider.inputValue(), 'min', await pslider.getAttribute('min'))

// My panel drives both.
await tab('Mi panel').click()
log('panel cells:', await filled(), '|', await panel.locator('.mypanel-cell:not(.empty)').allInnerTexts())
await panel.getByRole('button', { name: 'Apagón', exact: true }).click()
log('panel button presses blackout:', await blackout().getAttribute('aria-pressed'))
await panel.getByRole('button', { name: 'Apagón', exact: true }).click()
await panel.locator('.mypanel-slider input').first().fill('0.5')
await tab('Inspector').click()
log(`panel slider at half: ${pname}`, await pslider.inputValue())

// Edit: the crossfader into cell 3, moved left, then removed.
await tab('Mi panel').click()
await panel.getByRole('button', { name: 'Editar' }).click()
await panel.getByLabel('Control para la celda 3').selectOption('crossfade')
log('crossfader added:', await filled(), '| cell 3', await panel.locator('.mypanel-cell').nth(2).getByLabel('Crossfader', { exact: true }).count())
await panel.getByRole('button', { name: 'Mover Crossfader a la izquierda' }).click()
log('moved: cell 2 crossfader', await panel.locator('.mypanel-cell').nth(1).getByLabel('Crossfader', { exact: true }).count())
await panel.getByRole('button', { name: 'Quitar Crossfader de Mi panel' }).click()
log('removed:', await filled())
await panel.getByRole('button', { name: 'Hecho' }).click()

// The learned parameter in Settings › MIDI, and all of it after a reload.
await page.waitForTimeout(600)
await page.reload()
await page.waitForSelector('.stage canvas')
await page.waitForTimeout(800)
await tab('Mi panel').click()
log('after reload: cells', await filled())

log('errors:', errors.length ? errors : 'none')
await browser.close()
