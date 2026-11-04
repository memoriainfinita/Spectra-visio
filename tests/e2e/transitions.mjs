// Phase 5, part 2: fades between visualizations.
import { open, loadTrack, grab, stats, shot, pickLayer, reveal } from './lib.mjs'

const kind = process.argv[2] ?? 'firefox'
const { browser, page, errors } = await open(kind)
const log = (...a) => console.log(`[${kind}]`, ...a)
const panel = page.locator('.panel.visuals, .panel.inspector')
const visual = page.locator('#insp-layer select[aria-label^="Visualización de la capa"]')
const transition = panel.getByRole('slider', { name: 'Transición' })

log('playing:', await loadTrack(page))
await page.locator('.perform-bar').getByRole('slider', { name: 'Crossfader' }).fill('0')
await visual.selectOption('kaleido')
await page.waitForTimeout(800)

// Mean brightness over time after a change: kaleido is mostly black, plasma fills the screen.
async function series(ms) {
  const t0 = Date.now()
  const out = []
  while (Date.now() - t0 < ms) {
    const s = stats(await grab(page))
    out.push(`${((Date.now() - t0) / 1000).toFixed(1)}s:${s.mean}`)
    await page.waitForTimeout(120)
  }
  return out.join(' ')
}

await transition.fill('2')
log('transition label', await panel.locator('label.field .mono').first().textContent())
await visual.selectOption('plasma')
log('kaleido → plasma, 2 s:', await series(2600))
await shot(page, `${kind}-t-plasma`)

await visual.selectOption('kaleido')
log('plasma → kaleido, back after 0.8 s:')
const back = series(1800)
await page.waitForTimeout(800)
await visual.selectOption('plasma')
log('  ', await back)

await transition.fill('0')
log('transition label', await panel.locator('label.field .mono').first().textContent())
await visual.selectOption('kaleido')
log('cut → kaleido:', await series(600))

// Layer B hidden by the crossfader changes without a fade, then shows straight away.
await transition.fill('2')
await pickLayer(page, 2)
await visual.selectOption('plasma')
await page.waitForTimeout(300)
await page.locator('.perform-bar').getByRole('slider', { name: 'Crossfader' }).fill('1')
log('B revealed (plasma, no fade):', await series(600))

await page.reload()
await page.waitForSelector('.panel.inspector')
await reveal(page)
log('transition after reload:', await page.locator('.panel.visuals, .panel.inspector').getByRole('slider', { name: 'Transición' }).inputValue())
log('errors:', errors.length ? '\n  ' + errors.join('\n  ') : 'none')
await browser.close()
