// A layer's content, chosen in the Inspector: its source or a visualization. The source is
// configured there (not in Libraries), survives a change to a visualization, and the
// visualization browser no longer lists the source as one.
import { open, loadTrack, grab, stats, pickLayer, useSource, sourceBox, expandSource, FIXTURES } from './lib.mjs'
import { join } from 'node:path'

const kind = process.argv[2] ?? 'firefox'
const log = (...a) => console.log(`[${kind}]`, ...a)
const check = (name, ok) => log(ok ? 'PASS' : 'FAIL', name)
const { browser, page, errors } = await open(kind, {})
const insp = page.locator('#insp-layer')
const group = insp.getByRole('group', { name: 'Contenido' })
const pressed = (name) => group.getByRole('button', { name, exact: true }).getAttribute('aria-pressed')
const layerName = () => page.locator('.layer.selected .layer-pick').textContent()

await loadTrack(page)
await pickLayer(page, 1)
const before = await layerName()
log('layer 1 starts as:', before)
check('starts as a visualization', (await pressed('Visualización')) === 'true' && (await insp.getByLabel('Visualización de la capa 1').count()) === 1)

// The browser lists visualizations only: no source among them.
check('browser has no source card', (await page.locator('.panel.browser').getByRole('button', { name: /^Poner Fuente visual/ }).count()) === 0)
check('browser has no media filter', (await page.locator('.panel.browser .segmented').getByRole('button', { name: 'Fuente visual', exact: true }).count()) === 0)

// Source: set up there, in the Inspector.
await useSource(page)
check('content is the source', (await pressed('Fuente visual')) === 'true')
check('no visualization selector while it is the source', (await insp.getByLabel('Visualización de la capa 1').count()) === 0)
const chooser = page.waitForEvent('filechooser')
await sourceBox(page).getByRole('button', { name: 'Imagen o vídeo' }).click()
await (await chooser).setFiles(join(FIXTURES, 'test-video.webm'))
await page.waitForTimeout(1500)
check('status in the Inspector', /^Vídeo/.test(await sourceBox(page).getByRole('status').textContent()))
check('video controls in the Inspector', (await insp.locator('.video-controls').count()) === 1)
const shown = stats(await grab(page))
check('the stage shows the source', shown.mean > 2)

// Back to a visualization: the one it had, and the source stays on the layer.
await group.getByRole('button', { name: 'Visualización', exact: true }).click()
check('back to the previous visualization', (await layerName()) === before)
const kept = await expandSource(page)
check('source kept while showing a visualization', /^Vídeo/.test(await kept.getByRole('status').textContent()))

// A shader reads the kept source without changing the content.
const sh = page.locator('.panel.shaders')
await sh.getByRole('button', { name: 'Copiar Aberración sobre la entrada a tus shaders' }).click()
await sh.getByRole('button', { name: 'Poner Aberración sobre la entrada en la capa 1' }).click()
await page.waitForTimeout(1500)
check('shader keeps the content as a visualization', (await pressed('Visualización')) === 'true')
check('shader draws the source', stats(await grab(page)).mean > 2)

// The source lives in the Inspector only: all its buttons there, no source tab in Libraries.
const src = page.locator('#insp-layer .source')
check('Inspector has every source button', (await src.getByRole('button', { name: /^(Cámara|Imagen o vídeo|TV|Vídeo e imagen libres|Quitar)$/ }).count()) === 5)
check('Libraries has no sources tab', (await page.getByRole('tab', { name: 'Fuentes visuales' }).count()) === 0)

log('page errors:', errors.length ? errors.join(' | ') : 'none')
await browser.close()
