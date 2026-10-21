// Redesign phase 5: the search, Ctrl K. Actions run; controls in a hidden tab, a library
// shelf or the settings window are shown, focused and marked; accents do not matter.
import { open } from './lib.mjs'

const kind = process.argv[2] ?? 'firefox'
const log = (...a) => console.log(`[${kind}]`, ...a)
const { browser, page, errors } = await open(kind, { reveal: false })
const dialog = page.locator('.search-dialog')
const options = dialog.getByRole('option')
const search = async (q) => {
  await page.locator('body').click({ position: { x: 5, y: 5 } })
  await page.keyboard.press('Control+k')
  await dialog.getByRole('combobox').fill(q)
}
const focused = () => page.evaluate(() => ({ name: document.activeElement?.getAttribute('aria-label') || document.activeElement?.textContent?.trim(), flash: document.activeElement?.classList.contains('search-flash') }))
const selected = (name) => page.getByRole('tab', { name, exact: true }).getAttribute('aria-selected')

await search('apag')
log('apag:', (await options.first().innerText()).replace(/\s+/g, ' '), '| results', await options.count())
await page.keyboard.press('Enter')
await page.waitForTimeout(100)
log('Enter runs it: blackout', await page.locator('.perform-bar .perform-group button').first().getAttribute('aria-pressed'), '| dialog', await dialog.count())
await page.keyboard.press('b')

// A control in a tab not shown: Modulators is behind Audio.
log('modulators tab before:', await selected('Moduladores'))
await search('añadir modulador')
await page.keyboard.press('Enter')
await page.waitForTimeout(300)
log('añadir modulador: tab', await selected('Moduladores'), '| focus', JSON.stringify(await focused()))

// A control in the libraries, on another shelf.
await search('anadir archivos')
log('without the accent:', (await options.first().innerText()).replace(/\s+/g, ' '))
await page.keyboard.press('Enter')
await page.waitForTimeout(300)
log('añadir archivos: shelf Lista', await page.locator('#shelf-queue').getAttribute('aria-selected'), '| focus', JSON.stringify(await focused()))

// A control in the settings window, closed.
await search('reducir destellos')
log('reducir destellos:', (await options.allInnerTexts()).map((x) => x.replace(/\s+/g, ' ')).join(' / '))
await options.filter({ hasText: 'Accesibilidad' }).first().click()
await page.waitForTimeout(300)
log('settings open', await page.getByRole('dialog', { name: 'Ajustes' }).isVisible(), '| section', await page.locator('#settingstab-access').getAttribute('aria-selected'), '| focus', JSON.stringify(await focused()))
await page.keyboard.press('Escape')

// Arrows move, Escape closes and gives the focus back; nothing found says so.
await page.getByRole('tab', { name: 'Inspector', exact: true }).focus()
await page.keyboard.press('Control+k')
await dialog.getByRole('combobox').fill('capa')
await page.keyboard.press('ArrowDown')
log('arrow down: active', await options.nth(1).getAttribute('aria-selected'))
await page.keyboard.press('Escape')
log('escape: dialog', await dialog.count(), '| focus', JSON.stringify(await focused()))
await search('zzzz')
log('nothing:', await dialog.locator('.search-none').textContent())
await page.keyboard.press('Escape')

log('errors:', errors.length ? errors : 'none')
await browser.close()
