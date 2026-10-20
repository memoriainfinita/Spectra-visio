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

// Names survive a reload.
await page.waitForTimeout(600)
await page.reload()
await page.waitForSelector('.stage canvas')
log('after reload: column 2', await clips.locator('thead .clip-col').nth(1).getAttribute('aria-label'), '| cells', await filled())

log('errors:', errors.length ? errors : 'none')
await browser.close()
