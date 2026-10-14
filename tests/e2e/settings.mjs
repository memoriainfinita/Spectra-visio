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
  if (!(await page.locator('.panel.sources').isVisible())) await page.getByRole('button', { name: /^Fuente:/ }).click()
}
const keys = page.locator('.panel.settings-keys')
const blackoutKey = () => keys.getByRole('button', { name: /^(Tecla de Apagón|Key for Blackout)$/ }).textContent()
const fpsCap = () => page.locator('.panel.settings-perf select').inputValue()

await openSettings()
log('panels:', (await page.locator('#settings-body .panel h2').allTextContents()).join(' | '))
log('language in the top bar:', await page.locator('.topbar').getByLabel('Idioma').count(), '| keys left in Directo:', await page.locator('.panel.live .key-list').count())

// Help folded: closed by default, opens on click.
const help = page.locator('.panel.settings-backup details.hint')
log('help folds in the app:', await page.locator('details.hint').count(), '| backup help open:', await help.evaluate((d) => d.open), '| text visible:', await help.locator('p').isVisible())
await help.locator('summary').click()
log('after click, open:', await help.evaluate((d) => d.open), '| text visible:', await help.locator('p').isVisible())

// Language.
await page.locator('.panel.settings-general').getByLabel('Idioma').selectOption('en')
log('english:', await page.locator('[role=tab]').allTextContents().then((t) => t.join(' ')))
await page.locator('.panel.settings-general').getByLabel('Language').selectOption('es')

// Change two settings, export them.
await keys.getByRole('button', { name: 'Tecla de Apagón' }).click()
await page.keyboard.press('q')
await page.locator('.panel.settings-perf select').selectOption('30')
log('changed: blackout', await blackoutKey(), '| fps cap', await fpsCap())
const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Exportar' }).click()])
const file = join(OUT, `backup-${kind}.json`)
await download.saveAs(file)
const backup = JSON.parse(readFileSync(file, 'utf8'))
log('exported:', download.suggestedFilename(), '| keys:', Object.keys(backup).join(','), '| blackout', backup.settings.live.keys.blackout, '| obs password empty', backup.settings.obs.password === '')

// Reset asks first; Cancel leaves everything.
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
await page.getByRole('button', { name: 'Volver a mostrar el aviso de fotosensibilidad' }).click()
log('notice shown:', await page.locator('dialog.notice-dialog').isVisible())
await page.keyboard.press('Escape')
await page.waitForTimeout(200)
log('after Escape:', await page.locator('dialog.notice-dialog').count())
await openSettings()

// Erase everything: the page reloads with nothing kept.
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
await page.locator('#settings-body').screenshot({ path: join(OUT, `settings-tab-${kind}.png`) })
log('errors:', errors.length ? errors.join('\n  ') : 'none')
await browser.close()
