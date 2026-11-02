// The settings window: language, folded help, backup out and back in, reset and erase with
// their confirmation, and the photosensitivity notice shown again.
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { open, OUT } from './lib.mjs'

const kind = process.argv[2] ?? 'firefox'
const log = (...a) => console.log(`[${kind}]`, ...a)
const { browser, page, errors } = await open(kind, { reveal: false, contextOptions: { acceptDownloads: true } })
const dialog = page.getByRole('dialog', { name: 'Ajustes' })
// The settings window from the top bar, and the source pop-up with the window closed.
const openSettings = async () => { if (!(await dialog.isVisible())) await page.getByRole('button', { name: 'Ajustes', exact: true }).click() }
const openSource = async () => {
  if (await dialog.isVisible()) await page.keyboard.press('Escape')
  if (!(await page.locator('.panel.sources').isVisible())) await page.getByRole('button', { name: /^Audio:/ }).click()
}
const keys = page.locator('.panel.settings-keys')
const blackoutKey = () => keys.locator('button[aria-label="Tecla de Apagón"], button[aria-label="Key for Blackout"]').textContent()
const fpsCap = () => page.locator('.panel.settings-perf select').inputValue()
// One section shows at a time: pick it on the left.
const go = (name) => page.getByRole('tab', { name, exact: true }).click()

await openSettings()
log('panels:', (await page.locator('#settings-body .panel h2').allTextContents()).join(' | '))
log('language in the top bar:', await page.locator('.topbar').getByLabel('Idioma').count(), '| keys left in Directo:', await page.locator('.panel.live .key-list').count())

// Long help in a bubble: over it with the mouse, pinned with a click, from the keyboard.
await go('Copia de seguridad')
const help = page.locator('.panel.settings-backup .hint')
const hintButton = help.locator('.hint-button')
const bubble = help.locator('[role=tooltip]')
const shown = () => bubble.isVisible()
log('help bubbles in the app:', await page.locator('.hint-button').count(), '| backup bubble shown:', await shown(), '| described by it:', (await hintButton.getAttribute('aria-describedby')) === (await bubble.getAttribute('id')))
await hintButton.hover()
const box = await bubble.boundingBox()
await page.screenshot({ path: join(OUT, `settings-hint-${kind}.png`) })
log('mouse over:', await shown(), '| inside the window:', box.x >= 0 && box.y >= 0 && box.x + box.width <= page.viewportSize().width && box.y + box.height <= page.viewportSize().height)
await page.mouse.move(5, 5)
log('mouse away:', await shown())
await hintButton.click()
await page.mouse.move(5, 5)
log('clicked, then away:', await shown())
await page.keyboard.press('Escape')
log('Escape:', await shown(), '| settings still open:', await dialog.isVisible())
await hintButton.click()
await page.mouse.move(5, 5)
await hintButton.click()
await page.mouse.move(5, 5)
log('clicked twice, then away:', await shown())
await page.keyboard.press('Shift+Tab')
await page.keyboard.press('Tab')
log('Tab onto it:', await shown())
await page.keyboard.press('Tab')
log('Tab away:', await shown())

// Language.
await go('General')
await page.locator('.panel.settings-general').getByLabel('Idioma').selectOption('en')
log('english:', await page.locator('[role=tab]').allTextContents().then((t) => t.join(' ')))
await page.locator('.panel.settings-general').getByLabel('Language').selectOption('es')

// Change two settings, export them.
await go('Atajos de teclado')
await keys.getByRole('button', { name: 'Tecla de Apagón' }).click()
await page.keyboard.press('q')
await go('Rendimiento')
await page.locator('.panel.settings-perf select').selectOption('30')
log('changed: blackout', await blackoutKey(), '| fps cap', await fpsCap())
await go('Copia de seguridad')
const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Exportar' }).click()])
const file = join(OUT, `backup-${kind}.json`)
await download.saveAs(file)
const backup = JSON.parse(readFileSync(file, 'utf8'))
log('exported:', download.suggestedFilename(), '| keys:', Object.keys(backup).join(','), '| blackout', backup.settings.live.keys.blackout, '| obs password empty', backup.settings.obs.password === '')

// Reset asks first; Cancel leaves everything.
await go('Restablecer')
await page.getByRole('button', { name: 'Restablecer los ajustes' }).click()
log('reset asks:', await page.locator('.panel.settings-reset .confirm span').textContent())
await page.getByRole('button', { name: 'Cancelar' }).click()
log('after cancel: blackout', await blackoutKey())
await page.getByRole('button', { name: 'Restablecer los ajustes' }).click()
await page.locator('.panel.settings-reset .confirm').getByRole('button', { name: 'Restablecer' }).click()
log('after reset: blackout', await blackoutKey(), '| fps cap', await fpsCap())

// Import the backup, with a favourite station added to it.
backup.radioFavorites = [{ id: 'test-fm', name: 'Test FM', url: 'https://radio.test/stream', country: 'Spain', codec: 'MP3', bitrate: 128, tags: ['test'] }]
const withFav = join(OUT, `backup-fav-${kind}.json`)
writeFileSync(withFav, JSON.stringify(backup))
await go('Copia de seguridad')
const input = page.locator('.panel.settings-backup input[type=file]')
await input.setInputFiles(withFav)
await page.locator('.panel.settings-backup [role=status]').waitFor()
log('imported:', await page.locator('.panel.settings-backup [role=status]').textContent(), '| blackout', await blackoutKey(), '| fps cap', await fpsCap())
await input.setInputFiles(withFav)
await page.waitForTimeout(300)
log('again:', await page.locator('.panel.settings-backup [role=status]').textContent())
const bad = join(OUT, `backup-bad-${kind}.json`)
writeFileSync(bad, '{"format":"something else"}')
await input.setInputFiles(bad)
await page.waitForTimeout(300)
log('not a backup:', await page.locator('.panel.settings-backup [role=status]').textContent())
await openSource()
await page.locator('.panel.sources').getByRole('button', { name: 'Stream' }).click()
log('favourites:', await page.locator('.panel.sources').getByRole('button', { name: /^Favoritas/ }).textContent())

// The notice again.
await openSettings()
await go('Accesibilidad')
await page.getByRole('button', { name: 'Volver a mostrar el aviso de fotosensibilidad' }).click()
log('notice shown:', await page.locator('dialog.notice-dialog').isVisible())
await page.keyboard.press('Escape')
await page.waitForTimeout(200)
log('after Escape:', await page.locator('dialog.notice-dialog').count())
await openSettings()

// Erase everything: the page reloads with nothing kept.
await go('Restablecer')
await page.getByRole('button', { name: 'Borrar todos los datos' }).click()
log('erase asks:', await page.locator('.panel.settings-reset .confirm span').textContent())
await Promise.all([page.waitForEvent('load'), page.getByRole('button', { name: 'Borrar y recargar' }).click()])
await page.waitForSelector('.stage canvas')
log('after erase: notice shown', await page.locator('dialog.notice-dialog').isVisible(), '| tab', await page.evaluate(() => document.querySelector('[role=tabpanel]:not([hidden])')?.id), '| wipe flag', await page.evaluate(() => localStorage.getItem('spectra.wipe')))
await page.keyboard.press('Escape')
await openSettings()
log('after erase: blackout', await blackoutKey(), '| fps cap', await fpsCap())
await openSource()
await page.locator('.panel.sources').getByRole('button', { name: 'Stream' }).click()
log('after erase:', await page.locator('.panel.sources').getByRole('button', { name: /^Favoritas/ }).textContent())
await page.screenshot({ path: join(OUT, `settings-${kind}.png`) })
await openSettings()
await go('General')
await page.locator('#settings-body').screenshot({ path: join(OUT, `settings-tab-${kind}.png`) })
log('errors:', errors.length ? errors.join('\n  ') : 'none')
await browser.close()
