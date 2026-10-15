// Redesign phase 2: the Inspector by levels (composition, layer and clip), its sections
// that fold, the composition row of Layers, and clips launched on the beat.
import { open, loadTrack, OUT } from './lib.mjs'

const kind = process.argv[2] ?? 'firefox'
const log = (...a) => console.log(`[${kind}]`, ...a)
const { browser, page, errors } = await open(kind, { reveal: false })
const insp = page.locator('.panel.inspector')
const level = (name) => insp.getByRole('tab', { name, exact: true })
const shown = () => insp.locator('[role=tab][aria-selected=true]').textContent()
const folds = (panel) => page.locator(`${panel} .fold-head button`).evaluateAll((bs) => bs.map((b) => `${b.querySelector('.fold-title').textContent}${b.getAttribute('aria-expanded') === 'true' ? '' : ' (plegada)'}`).join(', '))
const clips = page.locator('.panel.clips')

await page.getByRole('tab', { name: 'Bibliotecas' }).click()
await page.getByRole('tab', { name: 'Lista' }).click()
log('playing:', await loadTrack(page))
log('inspector in', await page.evaluate(() => document.getElementById('dock-inspector')?.closest('.dock-zone')?.className.match(/zone-(\w+)/)?.[1]), '| level', await shown())
log('layer sections:', await folds('#insp-layer'))

// Levels by click and by arrow keys.
await level('Composición').click()
log('composition sections:', await folds('#insp-comp'), '| layer panel hidden', await page.locator('#insp-layer').isHidden())
await level('Composición').press('ArrowRight')
log('arrow right:', await shown(), '| focus', await page.evaluate(() => document.activeElement?.textContent))

// Layers: picking a layer shows it; the composition row shows the composition.
await page.getByRole('tab', { name: 'Capas' }).click()
await page.locator('.panel.visuals').getByRole('button', { name: 'Añadir capa' }).click()
log('added layer 3: inspector shows', await shown(), '| pickers', await insp.locator('.insp-layer').count())
await page.locator('.panel.visuals .layer-pick').filter({ hasText: /^1 / }).click()
log('picked layer 1:', await shown(), '| visual select', await insp.getByLabel('Visualización de la capa 1').inputValue())
await page.locator('.panel.visuals').getByRole('button', { name: /^Composición/ }).click()
log('composition row:', await shown(), '| row pressed', await page.locator('.layer-comp').getAttribute('aria-pressed'))
await insp.getByRole('button', { name: 'Inspeccionar la capa 2' }).click()
log('picker to layer 2 keeps the level:', await shown(), '| selected in Layers', await page.locator('.panel.visuals .layer.selected .layer-pick strong').textContent())

// Composition: transition and effects.
await insp.getByRole('slider', { name: 'Transición' }).fill('0')
await insp.getByLabel('Añadir efecto a la composición').selectOption({ label: 'Espejo' })
log('composition effects meta:', await page.locator('#insp-comp .fold-meta').first().textContent(), '| transition meta', await page.locator('#insp-comp .fold-meta').nth(1).textContent())

// Folding is kept across a reload.
await insp.getByRole('button', { name: /^Rótulos/ }).click()
log('overlays opened:', await page.locator('#insp-comp .panel.overlays').isVisible())
// The scene is stored 400 ms after the last change.
await page.waitForTimeout(600)
await page.reload()
await page.waitForSelector('.stage canvas')
log('after reload: level', await shown(), '| sections', await folds('#insp-comp'))
await insp.getByRole('button', { name: /^Rótulos/ }).click()
log('after reload: layers', await page.locator('.panel.visuals .layer').count(), '| layers tab', await page.getByRole('tab', { name: 'Capas' }).getAttribute('aria-selected'))
await page.getByRole('tab', { name: 'Capas' }).click()
await page.locator('.panel.visuals').getByRole('button', { name: 'Quitar la capa 3' }).click()
await page.getByRole('tab', { name: 'Bibliotecas' }).click()
await page.getByRole('tab', { name: 'Lista' }).click()
log('playing again:', await loadTrack(page))

// Layer level: effects of the layer, parameter, preset.
await page.getByRole('tab', { name: 'Capas' }).click()
await page.locator('.panel.visuals .layer-pick').filter({ hasText: /^1 / }).click()
await insp.getByLabel('Añadir efecto a la capa 1').selectOption({ label: 'Brillo difuso' })
log('layer 1 effects meta:', await page.locator('#insp-layer .fold-meta').nth(2).textContent())
await page.screenshot({ path: `${OUT}/inspector-layer-${kind}.png` })

// Clips: clicking a cell shows the clip level.
await clips.getByRole('button', { name: 'Guardar la capa 1 en la celda 1' }).click()
log('saved cell 1:', await shown(), '| sections', await folds('#insp-clip'))
const firstSlider = page.locator('#insp-clip input[type=range]').first()
const name = await firstSlider.getAttribute('aria-label')
await firstSlider.fill(String(Number(await firstSlider.getAttribute('min'))))
const layerValue = await page.locator('#insp-layer input[type=range]').first().inputValue()
const clipValue = await firstSlider.inputValue()
log(`clip playing, ${name} set to its minimum in the clip:`, clipValue, '-> layer', layerValue)

// Beat launch: a tempo by hand, the clip set to wait for the beat.
await page.getByRole('tab', { name: 'Bibliotecas' }).click()
await page.getByRole('tab', { name: 'Visualizaciones' }).click()
await page.locator('.panel.browser').getByRole('button', { name: 'Poner Túnel en la capa 1' }).click()
await clips.getByRole('button', { name: 'Guardar la capa 1 en la celda 2' }).click()
await insp.getByRole('button', { name: 'Al golpe' }).click()
log('cell 2 on the beat:', await clips.locator('.clip.on-beat').count(), '| label', await clips.locator('.clip.on-beat').getAttribute('aria-label'))
const tap = page.getByRole('button', { name: 'Marcar tempo' }).first()
for (let i = 0; i < 6; i++) {
  await tap.click()
  await page.waitForTimeout(500)
}
await page.waitForTimeout(600)
log('tempo:', await page.locator('.topbar').getByText(/BPM/).first().textContent().catch(() => '?'))
await clips.getByRole('button', { name: /^Lanzar .* en la capa 1$/ }).first().click()
const t0 = Date.now()
const queued = await clips.locator('.clip.queued').count()
await page.waitForFunction(() => !document.querySelector('.panel.clips .clip.queued'), null, { timeout: 3000 }).catch(() => {})
log('cell 1 is plain: queued', queued, '| active cell', await clips.locator('.clip.active').getAttribute('aria-label'))
await clips.locator('.clip.on-beat').click()
const waited = await clips.locator('.clip.queued').count()
await page.waitForFunction(() => !document.querySelector('.panel.clips .clip.queued'), null, { timeout: 3000 }).catch(() => {})
log('cell 2 waited for the beat:', waited, '| released after', Date.now() - t0 > 0 ? 'ok' : '?', '| active', await clips.locator('.clip.active').getAttribute('aria-label'), '| inspector', await shown())
// The same through the column key.
await clips.getByRole('button', { name: /^Lanzar .* en la capa 1$/ }).first().click()
await page.waitForTimeout(100)
await page.locator('.stage canvas').click()
await page.keyboard.press('2')
const keyWaited = await clips.locator('.clip.queued').count()
await page.waitForFunction(() => !document.querySelector('.panel.clips .clip.queued'), null, { timeout: 3000 }).catch(() => {})
log('key 2 waited:', keyWaited, '| active', await clips.locator('.clip.active').getAttribute('aria-label'))
await page.screenshot({ path: `${OUT}/inspector-clip-${kind}.png` })

// The composition row: above the layers, with what it has on.
await page.getByRole('tab', { name: 'Capas' }).click()
log('composition row first:', await page.locator('.panel.visuals').evaluate((p) => p.querySelector('.layer-comp')?.compareDocumentPosition(p.querySelector('.layer-list')) === Node.DOCUMENT_POSITION_FOLLOWING), '| says', await page.locator('.layer-comp span').textContent())

// Desktop: a clip does not take the right stack away from what it shows.
const shownTab = (zone) => page.locator(`.zone-${zone} [role=tab][aria-selected=true]`).first().textContent()
await page.getByRole('tab', { name: 'Directo', exact: true }).click()
await clips.getByRole('button', { name: /^Lanzar .* en la capa 1$/ }).first().click()
log('desktop, clip clicked: right shows', await shownTab('right'), '| level', await shown())
await page.locator('.panel.visuals .layer-pick').filter({ hasText: /^1 / }).click()
log('desktop, layer clicked: right shows', await shownTab('right'), '| level', await shown())

// Laptop: Layers and the Inspector share a stack.
await page.setViewportSize({ width: 1024, height: 768 })
await page.waitForTimeout(400)
await page.getByRole('tab', { name: 'Capas' }).click()
await page.locator('.panel.visuals').getByRole('button', { name: /^Composición/ }).click()
log('laptop, composition row: left shows', await shownTab('left'), '| level', await shown())
await page.getByRole('tab', { name: 'Capas' }).click()
await page.locator('.panel.visuals .layer-pick').filter({ hasText: /^2 / }).click()
log('laptop, layer 2: left shows', await shownTab('left'), '| level', await shown())
await page.getByRole('tab', { name: 'Capas' }).click()
await clips.getByRole('button', { name: /^Lanzar .* en la capa 1$/ }).first().click()
log('laptop, clip clicked: left shows', await shownTab('left'), '| level', await shown())
await page.screenshot({ path: `${OUT}/inspector-laptop-${kind}.png` })

// Narrow: the Inspector in the column of panels; picking a layer leaves the layouts alone.
await page.setViewportSize({ width: 700, height: 900 })
await page.waitForTimeout(400)
log('700: inspector', await insp.count(), '| visible', await insp.isVisible())
await page.locator('.panel.visuals .layer-pick').filter({ hasText: /^1 / }).click()
await page.setViewportSize({ width: 1024, height: 768 })
await page.waitForTimeout(400)
log('back to laptop after a pick at 700: left shows', await shownTab('left'))
log('errors:', errors.length ? '\n  ' + errors.join('\n  ') : 'none')
await browser.close()
