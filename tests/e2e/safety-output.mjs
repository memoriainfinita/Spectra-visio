// Reduce flashes and the fps cap reach the output window through the bridge.
import { open, loadTrack } from './lib.mjs'

const kind = process.argv[2] ?? 'chrome'
const log = (...a) => console.log(`[${kind}]`, ...a)
const { browser, page, errors } = await open(kind)
await loadTrack(page)
const sh = page.locator('.panel.shaders')
await sh.getByRole('button', { name: 'Pegar código' }).click()
await sh.getByLabel('Nombre', { exact: true }).fill('Blink')
await sh.getByLabel('Código ISF o Shadertoy').fill('void mainImage(out vec4 c, in vec2 p) { c = vec4(vec3(step(0.5, fract(iTime * 10.0))), 1.0); }')
await sh.getByRole('button', { name: 'Añadir' }).click()
await page.waitForTimeout(500)
await sh.getByRole('button', { name: /^Poner Blink en la capa/ }).first().click()

const panel = page.locator('.panel.output')
const [out] = await Promise.all([page.waitForEvent('popup'), panel.getByRole('button', { name: 'Abrir ventana de salida' }).click()])
await out.waitForSelector('canvas')
await out.waitForTimeout(2500)
const trace = (p, ms) => p.evaluate((ms) => new Promise((resolve) => {
  const src = document.querySelector('canvas')
  const c = document.createElement('canvas'); c.width = 16; c.height = 9
  const ctx = c.getContext('2d', { willReadFrequently: true })
  const v = []; const t0 = performance.now()
  const step = () => { ctx.drawImage(src, 0, 0, 16, 9); const d = ctx.getImageData(0, 0, 16, 9).data; let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i]; v.push(Math.round(s / 144)); if (performance.now() - t0 < ms) requestAnimationFrame(step); else resolve({ max: Math.max(...v), min: Math.min(...v) }) }
  requestAnimationFrame(step)
}), ms)
log('output, normal:', JSON.stringify(await trace(out, 1200)))
await page.locator('#settingspanel-access').getByLabel('Reducir destellos').check()
await out.waitForTimeout(800)
log('output, reduced:', JSON.stringify(await trace(out, 1200)))
await page.locator('#settingspanel-access').getByLabel('Reducir destellos').uncheck()

// Frame cap: count the output window's frames by its canvas changing.
await page.locator('.panel.settings-perf').getByLabel('Límite de fps').selectOption('30')
await out.waitForTimeout(1500)
const changes = await out.evaluate(() => new Promise((resolve) => {
  const src = document.querySelector('canvas')
  const c = document.createElement('canvas'); c.width = 4; c.height = 4
  const ctx = c.getContext('2d', { willReadFrequently: true })
  let last = -1, n = 0, frames = 0; const t0 = performance.now()
  const step = () => { ctx.drawImage(src, 0, 0, 4, 4); const v = ctx.getImageData(0, 0, 1, 1).data[0]; if (v !== last) n++; last = v; frames++; if (performance.now() - t0 < 2000) requestAnimationFrame(step); else resolve({ rafPerS: frames / 2, changesPerS: n / 2 }) }
  requestAnimationFrame(step)
}))
log('output with cap 30:', JSON.stringify(changes))
await page.locator('.panel.settings-perf').getByLabel('Límite de fps').selectOption('0')
await out.close()
await sh.getByRole('button', { name: 'Borrar Blink' }).click()
log('errors:', errors.filter((e) => !e.includes('WebGL context was lost')).join('\n  ') || 'none')
await browser.close()
