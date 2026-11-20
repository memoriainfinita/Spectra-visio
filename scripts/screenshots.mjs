// Screenshots for the README and docs/guide, from the production build served by
// `pnpm exec vite preview --port 4181`. Firefox, English, muted, with a synthetic track.
// Run by hand when the interface changes: `pnpm build`, start the preview, then
// `node scripts/screenshots.mjs`. Set OUT to a folder to write everything there instead
// (for a first look).
import { firefox } from 'playwright'
import { testWav } from '../tests/e2e/lib.mjs'

const url = process.env.URL ?? 'http://localhost:4181/'
const docs = new URL('../docs/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const guide = process.env.OUT ?? `${docs}guide/img/`
const hero = process.env.OUT ?? docs

const browser = await firefox.launch({ firefoxUserPrefs: { 'media.volume_scale': '0.0', 'media.autoplay.default': 0 } })
const page = await (await browser.newContext({ locale: 'en-US', viewport: { width: 1440, height: 900 } })).newPage()
// The input fallback, so Playwright can fill the file chooser.
await page.addInitScript(() => { delete window.showOpenFilePicker })
await page.goto(url)
await page.waitForSelector('.stage canvas')
await page.waitForTimeout(1500)

const wait = (ms) => page.waitForTimeout(ms)
const tab = async (name) => { await page.getByRole('tab', { name, exact: true }).first().click(); await wait(400) }
const shot = (name, dir = guide) => page.screenshot({ path: `${dir}${name}.png` })
const closeNotices = async () => { for (const b of await page.getByRole('button', { name: 'Close', exact: true }).all()) await b.click().catch(() => {}); await wait(300) }
const press = (key) => page.keyboard.press(key)

const cont = page.locator('.notice-dialog').getByRole('button', { name: /^Continue/ })
if (await cont.count()) await cont.click()
await wait(500)
await closeNotices()

// The audio source menu, before anything plays.
await page.getByRole('button', { name: /^Audio:/ }).click()
await wait(500)
await shot('sources')
await press('Escape')
await wait(300)

// A track in the queue, playing.
await tab('Audio')
const chooser = page.waitForEvent('filechooser')
await page.getByRole('button', { name: 'Add files' }).first().click()
await (await chooser).setFiles(testWav())
await wait(2000)
const play = page.getByRole('button', { name: 'Play', exact: true }).first()
if (await play.count()) await play.click()
await wait(1500)
await shot('player')

// The browser of visualizations.
await tab('Libraries')
await tab('Visualizations')
await shot('visualizations')

// The example scene.
await tab('Scenes and presets')
await page.getByRole('button', { name: /^Show/ }).first().click()
await wait(2500)
await closeNotices()
await tab('Layers')
await tab('Inspector')
await tab('Libraries')
await tab('Scenes and presets')
await shot('example-scene')

// Its fire column, as the main image.
await press('4')
await wait(4500)
await shot('Spectra-visio-demo', hero)

// Layers and the inspector on a layer.
await tab('Layers')
await shot('layers')

// A parameter with a modulation, and the shared modulators.
await tab('Modulators')
await shot('modulators')
await tab('Inspector')

// Knobs and My panel.
await tab('My panel')
await shot('my-panel')
await tab('Knobs')
await shot('knobs')

// The clip menu.
await page.getByRole('button', { name: /^Launch .* on layer 3/ }).first().click({ button: 'right' }).catch(() => {})
await wait(500)
await shot('clip-menu')
await press('Escape')

// The output menu (OBS, recording, output window).
await page.getByRole('button', { name: 'Output', exact: true }).click()
await wait(600)
await shot('output')
await press('Escape')

// Settings.
await page.getByRole('button', { name: 'Settings', exact: true }).click()
await wait(700)
await page.getByText('Keyboard shortcuts', { exact: true }).first().click()
await wait(500)
await shot('shortcuts')
await press('Escape')

await browser.close()
