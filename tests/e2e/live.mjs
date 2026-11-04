// Phase 8 part 2: shortcuts, blackout, freeze, strobe, crossfader moves.
import { open, loadTrack, grab, stats } from './lib.mjs'

const kind = process.argv[2] ?? 'firefox'
const { browser, page, errors } = await open(kind)
const log = (...a) => console.log(`[${kind}]`, ...a)
const live = page.locator('.perform-bar')
const keys = page.locator('.panel.settings-keys')
const vis = page.locator('.panel.visuals, .panel.inspector')
const mean = async () => stats(await grab(page)).mean
const body = () => page.locator('body').click({ position: { x: 5, y: 5 } })
const cross = () => page.locator('.perform-bar').getByLabel('Crossfader', { exact: true }).inputValue()

log('playing:', await loadTrack(page))
await body()
await page.keyboard.press(' ')
await page.waitForTimeout(300)
log('space pauses:', await page.getByRole('button', { name: 'Reproducir' }).count() === 1)
await page.keyboard.press(' ')

// Rebind the blackout to q.
await keys.getByRole('button', { name: 'Tecla de Apagón' }).click()
await page.keyboard.press('q')
log('blackout key now:', await keys.getByRole('button', { name: 'Tecla de Apagón' }).textContent())
await body()
const before = await mean()
await page.keyboard.press('q')
await page.waitForTimeout(400)
const dark = await mean()
await page.keyboard.press('q')
await page.waitForTimeout(400)
log(`blackout: mean ${before} -> ${dark} -> ${await mean()}`)
await page.keyboard.press('b')
await page.waitForTimeout(200)
log('old key b does nothing:', await live.getByRole('button', { name: 'Apagón', exact: true }).getAttribute('aria-pressed'))

// Freeze: two grabs apart are equal while frozen.
const diff = (a, b) => a.reduce((s, v, i) => s + Math.abs(v - b[i]), 0) / a.length
await page.keyboard.press('f')
await page.waitForTimeout(200)
const f1 = await grab(page)
await page.waitForTimeout(600)
const f2 = await grab(page)
await page.keyboard.press('f')
await page.waitForTimeout(600)
log(`freeze: frozen diff ${diff(f1, f2).toFixed(2)}, live diff ${diff(f2, await grab(page)).toFixed(2)}`)

// Strobe at 3 per second, then on the beat (120 BPM): count white flashes over 3 s.
const flashes = () => page.evaluate(() => new Promise((done) => {
  const src = document.querySelector('.stage canvas')
  const c = document.createElement('canvas')
  c.width = 8; c.height = 8
  const ctx = c.getContext('2d', { willReadFrequently: true })
  const onsets = []
  let was = false
  const end = performance.now() + 3000
  const tick = (now) => {
    ctx.drawImage(src, 0, 0, 8, 8)
    const d = ctx.getImageData(0, 0, 8, 8).data
    let m = 0
    for (let i = 0; i < d.length; i += 4) m += d[i] + d[i + 1] + d[i + 2]
    const white = m / (d.length / 4) / 3 > 250
    if (white && !was) onsets.push(Math.round(now))
    was = white
    if (now < end) requestAnimationFrame(tick)
    else done(onsets)
  }
  requestAnimationFrame(tick)
}))
const gaps = (o) => o.slice(1).map((t, i) => t - o[i])
await live.getByLabel('Ritmo del estrobo').selectOption('3')
await body()
await page.keyboard.press('s')
let o = await flashes()
log(`strobe 3/s: ${o.length} flashes in 3 s, min gap ${Math.min(...gaps(o))} ms`)
await live.getByLabel('Ritmo del estrobo').selectOption('beat')
o = await flashes()
log(`strobe on beat: ${o.length} flashes in 3 s, gaps ${gaps(o).join(' ')}`)
await body()
await page.keyboard.press('s')

// Crossfader moves with a 1.5 s transition.
await vis.locator('.field').filter({ hasText: 'Transición' }).locator('input').fill('1.5')
await live.getByRole('button', { name: 'Crossfader a B', exact: true }).click()
await page.waitForTimeout(700)
const mid = await cross()
await page.waitForTimeout(1200)
log(`cross to B: ${mid} (mid) -> ${await cross()}`)
await body()
await page.keyboard.press('x')
await page.waitForTimeout(1800)
log('x swaps back to:', await cross())

// Typing in a field does not fire shortcuts.
await page.locator('.panel.presets').getByLabel('Nombre del preset').type('fbsq')
log('typing keeps switches off:', await live.locator('.btn.on').count() === 0)
log('errors:', errors.length ? errors.join('\n  ') : 'none')
await browser.close()
