// Automatic mode through the UI, with two real tracks (see music/README.md).
import { existsSync } from 'node:fs'
import { open, MUSIC, pickLayer } from './lib.mjs'

const kind = process.argv[2] ?? 'firefox'
const log = (...a) => console.log(`[${kind}]`, ...a)
const tracks = [`${MUSIC}/Pixel Peeker Polka - faster.mp3`, `${MUSIC}/Sneaky Snitch.mp3`]
if (!tracks.every((t) => existsSync(t))) {
  log('skipped: the test tracks are not in tests/e2e/music (see its README)')
  process.exit(0)
}
const { browser, page, errors } = await open(kind)
const auto = page.locator('.panel.auto')
const vis = page.locator('.panel.visuals, .panel.inspector')
const field = (label, i = 0) => auto.locator('.field').filter({ hasText: label }).nth(i).locator('select').first()
const layers = async () => (await vis.locator('.layer-pick').allTextContents()).join(' | ')
const status = () => auto.locator('p.muted.small').first().textContent()
const crossfade = () => vis.locator('.crossfade-row input[type=range]').inputValue()

const chooser = page.waitForEvent('filechooser')
await page.getByRole('button', { name: 'Añadir archivos' }).first().click()
await (await chooser).setFiles(tracks)
await page.locator('.track-bpm', { hasText: 'BPM' }).nth(1).waitFor({ timeout: 60000 })
log('queue bpm:', (await page.locator('.track-bpm').allTextContents()).join(' | '))
await vis.locator('.field').filter({ hasText: 'Transición' }).locator('input').fill('0')

// Time.
await field('Cada', 0).selectOption('10')
await field('Cada', 1).selectOption('0')
await auto.getByLabel('Al cambiar de sección').uncheck()
await auto.getByLabel('Al cambiar de canción').uncheck()
await page.locator('body').click({ position: { x: 5, y: 5 } })
let before = await layers()
await page.keyboard.press('a')
log('A key:', await auto.getByRole('button', { name: 'Activo' }).count() === 1 ? 'on' : 'off', '|', await status())
await page.waitForTimeout(11000)
log('time 10 s:', before, '->', await layers(), '|', await status())

// Bars: 4 bars at 145 BPM = 6.6 s.
await field('Cada', 0).selectOption('0')
await field('Cada', 1).selectOption('4')
await page.keyboard.press('a'); await page.keyboard.press('a') // restart the count
before = await layers()
const t0 = Date.now()
await page.waitForFunction(() => document.querySelector('.panel.auto p.muted.small')?.textContent?.includes('compases'), null, { timeout: 15000 })
log(`bars 4 after ${((Date.now() - t0) / 1000).toFixed(1)} s:`, before, '->', await layers())

// Section: Sneaky Snitch has one at 89.0 s.
await field('Cada', 1).selectOption('0')
await auto.getByLabel('Al cambiar de sección').check()
await page.getByRole('button', { name: /Sneaky Snitch/ }).click()
await page.waitForTimeout(1500)
await page.locator('input.seek').evaluate((el) => { el.value = '86'; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })) })
before = await layers()
await page.waitForFunction(() => document.querySelector('.panel.auto p.muted.small')?.textContent?.includes('sección'), null, { timeout: 15000 })
log('section:', before, '->', await layers(), '| at', await page.locator('.seek-row .time').first().textContent())

// Track change.
await auto.getByLabel('Al cambiar de sección').uncheck()
await auto.getByLabel('Al cambiar de canción').check()
await page.waitForTimeout(2500)
before = await layers()
await page.locator('.panel.player').getByRole('button', { name: 'Anterior' }).click() // past 3 s: restart
await page.locator('.panel.player').getByRole('button', { name: 'Anterior' }).click()
await page.waitForFunction(() => document.querySelector('.panel.auto p.muted.small')?.textContent?.includes('canción'), null, { timeout: 15000 })
log('track:', before, '->', await layers())

// Alternate with a 1.5 s crossfade.
await auto.getByLabel('Al cambiar de canción').uncheck()
await vis.locator('.field').filter({ hasText: 'Transición' }).locator('input').fill('1.5')
await field('Aplicar en').selectOption('alternate')
await field('Cada', 0).selectOption('10')
const cf0 = await crossfade()
before = await layers()
await page.waitForTimeout(10500)
const mid = await crossfade()
await page.waitForTimeout(2000)
log(`alternate: crossfade ${cf0} -> ${mid} (mid-move) -> ${await crossfade()} |`, before, '->', await layers())

// Presets pool: two saved presets.
await field('Aplicar en').selectOption('layer')
const presets = page.locator('.panel.presets')
await pickLayer(page, 1)
for (const [n, v] of [['uno', 'Barras de espectro'], ['dos', 'Conjunto de Julia']]) {
  await page.locator('.panel.browser').getByRole('button', { name: `Poner ${v} en la capa 1` }).click()
  await presets.getByLabel('Nombre del preset').fill(n)
  await presets.getByRole('button', { name: 'Guardar', exact: true }).click()
}
await page.locator('.panel.browser').getByRole('button', { name: 'Poner Plasma en la capa 1' }).click()
await field('Elegir de').selectOption('presets')
await page.waitForTimeout(10500)
log('presets pool:', await status(), '|', await layers())

// Typing an "a" into a text field does not toggle it.
await presets.getByLabel('Nombre del preset').fill('')
await presets.getByLabel('Nombre del preset').type('a')
log('typing a in a field keeps it on:', await auto.getByRole('button', { name: 'Activo' }).count() === 1)
await page.locator('body').click({ position: { x: 5, y: 5 } })
await page.keyboard.press('a')
log('A again:', await auto.getByRole('button', { name: 'Apagado' }).count() === 1 ? 'off' : 'on')
log('errors:', errors.length ? errors.join('\n  ') : 'none')
await browser.close()
