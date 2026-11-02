// The clip menu (launch, save here, copy, paste, rename, empty) and the column menu
// (name, MIDI note), with a fake Web MIDI input.
import { open } from './lib.mjs'

const kind = process.argv[2] ?? 'firefox'
const log = (...a) => console.log(`[${kind}]`, ...a)
const { browser, page, errors } = await open(kind, {
  init: () => {
    const input = { id: 'fake-1', name: 'Fake controller', onmidimessage: null }
    const access = { inputs: new Map([[input.id, input]]), outputs: new Map(), onstatechange: null }
    navigator.requestMIDIAccess = async () => access
    window.__midi = (bytes) => input.onmidimessage?.({ data: new Uint8Array(bytes), timeStamp: performance.now() })
  },
})
const clips = page.locator('.panel.clips')
const menu = page.locator('.clip-menu')
const item = (name) => menu.getByRole('menuitem', { name, exact: true })
const cell = (n, c) => clips.locator('tbody tr').nth(-n).locator('.clip').nth(c - 1)
const filled = () => clips.locator('.clip:not(.empty)').count()
const send = (bytes) => page.evaluate((b) => window.__midi(b), bytes)

// Save layer 1 in cell 1 from the menu of an empty cell: only save (and paste, once copied).
await cell(1, 1).click({ button: 'right' })
log('empty cell menu:', await menu.locator('.knob-menu-what').textContent(), '|', await menu.getByRole('menuitem').allTextContents(), '| focus', await page.evaluate(() => document.activeElement?.textContent))
await item('Guardar la capa aquí').click()
log('after save: cells', await filled(), '| menu', await menu.count())

// Copy it, paste into layer 2 cell 3, rename the copy.
await cell(1, 1).click({ button: 'right' })
log('clip menu:', await menu.getByRole('menuitem').allTextContents())
await item('Copiar').click()
await cell(2, 3).click({ button: 'right' })
const paste = menu.getByRole('menuitem', { name: /^Pegar / })
log('paste item:', await paste.textContent())
await paste.click()
log('after paste: cells', await filled(), '| layer 2 cell 3', await cell(2, 3).getAttribute('aria-label'))
await cell(2, 3).click({ button: 'right' })
await item('Renombrar').click()
const field = menu.getByRole('textbox', { name: 'Renombrar' })
log('rename field focused:', await field.evaluate((el) => el === document.activeElement), '| placeholder', await field.getAttribute('placeholder'))
await field.fill('  Estribillo   final ')
await page.keyboard.press('Enter')
log('renamed:', await cell(2, 3).getAttribute('aria-label'), '| label shown', await cell(2, 3).locator('.clip-label, .clip-name').allTextContents())

// Saving the layer over a named clip keeps its name.
await cell(2, 3).click({ button: 'right' })
await item('Guardar la capa aquí').click()
log('saved over keeps the name:', await cell(2, 3).getAttribute('aria-label'))

// Launch from the menu, then empty it with the keyboard menu key.
await cell(2, 3).click({ button: 'right' })
await item('Lanzar').click()
log('launched: active', await cell(2, 3).evaluate((el) => el.classList.contains('active')))
await cell(2, 3).focus()
await page.keyboard.press('Shift+F10')
log('Shift+F10 opens:', await menu.count(), '| focus', await page.evaluate(() => document.activeElement?.textContent))
await page.keyboard.press('Escape')
log('escape: menu', await menu.count(), '| focus back on the cell', await cell(2, 3).evaluate((el) => el === document.activeElement))
await cell(2, 3).click({ button: 'right' })
await item('Vaciar').click()
log('after empty: cells', await filled())

// Column 2: a name, then a MIDI note that launches it.
await cell(1, 2).click({ modifiers: ['Shift'] })
const col2 = clips.locator('thead .clip-col').nth(1)
await col2.click({ button: 'right' })
log('column menu:', await menu.getByRole('menuitem').allTextContents())
await item('Poner nombre').click()
await menu.getByRole('textbox').fill('Puente')
await page.keyboard.press('Enter')
log('column 2:', await col2.getAttribute('aria-label'), '| shows', await col2.textContent())
await col2.click({ button: 'right' })
await menu.getByRole('button', { name: /^Control MIDI de / }).click()
await send([0x90, 40, 100])
await send([0x80, 40, 0])
log('column 2 note:', await menu.locator('.midi-learn .btn').textContent())
await page.keyboard.press('Escape')
await cell(1, 1).click()
log('cell 1 active before the note:', await cell(1, 1).evaluate((el) => el.classList.contains('active')))
await send([0x90, 40, 100])
await send([0x80, 40, 0])
await page.waitForTimeout(100)
log('note 40 launches column 2:', await cell(1, 2).evaluate((el) => el.classList.contains('active')))

// Changes that never pause for 400 ms are still stored: column 1 launched by key every
// 150 ms for 3 s, after column 2 was stored, with the stored scene read at the end.
const storedActive = () => page.evaluate(() => new Promise((res) => {
  const r = indexedDB.open('keyval-store')
  r.onsuccess = () => { const g = r.result.transaction('keyval').objectStore('keyval').get('scene'); g.onsuccess = () => { res(g.result?.layers[0].active ?? null); r.result.close() } }
}))
await page.locator('body').click({ position: { x: 5, y: 5 } })
await page.keyboard.press('2')
await page.waitForTimeout(600)
const before = await storedActive()
for (let k = 0; k < 20; k++) {
  await page.keyboard.press('1')
  await page.waitForTimeout(150)
}
log('stored column while launching nonstop: before', before, '| after 3 s', await storedActive())

// Names survive a reload, also a change made right before it (the scene is stored 400 ms
// after the last change, and at once when the page goes).
const col3 = clips.locator('thead .clip-col').nth(2)
await col3.click({ button: 'right' })
await item('Poner nombre').click()
await menu.getByRole('textbox').fill('Final')
await page.keyboard.press('Enter')
await page.reload()
await page.waitForSelector('.stage canvas')
await page.waitForTimeout(1500)
log('after reload: column 2', await clips.locator('thead .clip-col').nth(1).getAttribute('aria-label'), '| column 3, named just before', await col3.getAttribute('aria-label'), '| cells', await filled())

log('errors:', errors.length ? errors : 'none')
await browser.close()
