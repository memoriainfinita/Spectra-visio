// Phase 10: photosensitivity notice, reduce flashes (strobe off, brightness limiter),
// fps cap, low power and adaptive quality.
import { open, loadTrack, reveal } from './lib.mjs'

const kind = process.argv[2] ?? 'firefox'
const log = (...a) => console.log(`[${kind}]`, ...a)
const { browser, page, errors } = await open(kind, { notice: true })

// The notice on a first visit, focus on its first button, Escape answers it.
const dialog = page.locator('.notice-dialog')
log('notice shown', await dialog.isVisible(), '| focus on', await page.evaluate(() => document.activeElement?.textContent))
await page.keyboard.press('Escape')
await page.waitForTimeout(300)
log('after Escape: shown', await dialog.isVisible(), '| reduce', await page.locator('.panel.live').getByLabel('Reducir destellos').isChecked())
await page.reload()
await page.waitForSelector('.stage canvas')
await reveal(page)
await page.waitForTimeout(500)
log('after reload: shown', await dialog.count())

// Mean brightness of the stage at every frame for `ms`.
const trace = (ms) => page.evaluate((ms) => new Promise((resolve) => {
  const src = document.querySelector('.stage canvas')
  const c = document.createElement('canvas')
  c.width = 16; c.height = 9
  const ctx = c.getContext('2d', { willReadFrequently: true })
  const out = []
  const t0 = performance.now()
  const step = () => {
    ctx.drawImage(src, 0, 0, 16, 9)
    const d = ctx.getImageData(0, 0, 16, 9).data
    let s = 0
    for (let i = 0; i < d.length; i += 4) s += (d[i] + d[i + 1] + d[i + 2]) / 3
    out.push(Math.round(s / (d.length / 4)))
    if (performance.now() - t0 < ms) requestAnimationFrame(step)
    else resolve(out)
  }
  requestAnimationFrame(step)
}), ms)
const summary = (v) => ({ frames: v.length, min: Math.min(...v), max: Math.max(...v), jumps: v.slice(1).filter((x, i) => Math.abs(x - v[i]) > 40).length })

log('playing:', await loadTrack(page))
// A shader that flips black and white ten times a second, solo on its layer.
const sh = page.locator('.panel.shaders')
await sh.getByRole('button', { name: 'Pegar código' }).click()
await sh.getByLabel('Nombre', { exact: true }).fill('Blink')
await sh.getByLabel('Código ISF o Shadertoy').fill('void mainImage(out vec4 c, in vec2 p) { c = vec4(vec3(step(0.5, fract(iTime * 10.0))), 1.0); }')
await sh.getByRole('button', { name: 'Añadir' }).click()
await page.waitForTimeout(500)
await sh.getByRole('button', { name: /^Poner Blink en la capa/ }).first().click()
await page.waitForTimeout(2500)
log('blink, normal:', JSON.stringify(summary(await trace(1500))))

const live = page.locator('.panel.live')
await live.getByLabel('Reducir destellos').check()
await page.waitForTimeout(500)
log('blink, reduced:', JSON.stringify(summary(await trace(1500))), '| strobe disabled', await live.getByRole('button', { name: 'Estrobo', exact: true }).isDisabled())

// A steady white image reaches full brightness, slowly.
await sh.getByRole('button', { name: 'Pegar código' }).click()
await sh.getByLabel('Nombre', { exact: true }).fill('White')
await sh.getByLabel('Código ISF o Shadertoy').fill('void mainImage(out vec4 c, in vec2 p) { c = vec4(1.0); }')
await sh.getByRole('button', { name: 'Añadir' }).click()
await page.waitForTimeout(500)
await sh.getByRole('button', { name: /^Poner White en la capa/ }).first().click()
const rise = await trace(2500)
// The layer fades in over the transition too; report when it gets near white.
log('white, reduced: frames to 240+', rise.findIndex((x) => x >= 240), 'of', rise.length, '| first 10', rise.slice(0, 10).join(','))
await live.getByLabel('Reducir destellos').uncheck()

// Fps cap and low power.
const out = page.locator('.panel.settings-perf')
const fps = async () => (await page.locator('.stage-bar .mono').textContent())?.trim()
await out.getByLabel('Límite de fps').selectOption('30')
await page.waitForTimeout(2500)
log('cap 30:', await fps())
await out.getByLabel('Límite de fps').selectOption('0')
await out.getByLabel(/^Bajo consumo/).check()
await page.waitForTimeout(2500)
log('low power:', await fps(), '| canvas', await page.evaluate(() => { const c = document.querySelector('.stage canvas'); return `${c.width}x${c.height} of ${Math.round(c.clientWidth * devicePixelRatio)}` }))
await out.getByLabel(/^Bajo consumo/).uncheck()
await out.getByLabel('Mostrar los fps sobre la imagen').uncheck()
log('fps hidden:', await page.locator('.stage-bar .mono').count())
await out.getByLabel('Mostrar los fps sobre la imagen').check()
await page.reload()
await page.waitForSelector('.stage canvas')
await reveal(page)
log('after reload: cap', await out.getByLabel('Límite de fps').inputValue(), '| reduce', await page.locator('.panel.live').getByLabel('Reducir destellos').isChecked())

await sh.getByRole('button', { name: 'Borrar Blink' }).click()
await sh.getByRole('button', { name: 'Borrar White' }).click()
log('errors:', errors.length ? errors.join('\n  ') : 'none')
await browser.close()
