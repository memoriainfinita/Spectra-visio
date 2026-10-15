// Phase 9 part 3: the OBS source through a fake obs-websocket. The app runs in the browser
// given; the source runs in Chrome, as OBS's browser source is Chromium.
import { chromium } from 'playwright'
import { open, loadTrack, reveal, APP } from './lib.mjs'
import { startFakeObs, browserShim } from './obs-fake.mjs'

const kind = process.argv[2] ?? 'firefox'
const PORT = 4456
const obs = await startFakeObs(PORT, 'testpass')
const { browser, page, errors } = await open(kind)
const log = (...a) => console.log(`[${kind}]`, ...a)
const panel = page.locator('.panel.output')

// Source page: transparent canvas read with its alpha.
const srcBrowser = await chromium.launch({ channel: 'chrome', args: ['--mute-audio'] })
const src = await (await srcBrowser.newContext({ viewport: { width: 960, height: 540 } })).newPage()
const srcErrors = []
src.on('pageerror', (e) => srcErrors.push('pageerror ' + e.message))
src.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') srcErrors.push(m.type() + ' ' + m.text()) })
await src.addInitScript(browserShim(PORT))
const read = (p) => p.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => {
  const s = document.querySelector('canvas')
  const c = document.createElement('canvas')
  c.width = 32; c.height = 18
  const ctx = c.getContext('2d')
  ctx.drawImage(s, 0, 0, 32, 18)
  const d = ctx.getImageData(0, 0, 32, 18).data
  let rgb = 0, a = 0, clear = 0
  for (let i = 0; i < d.length; i += 4) { rgb += (d[i] + d[i + 1] + d[i + 2]) / 3; a += d[i + 3]; if (d[i + 3] < 8) clear++ }
  const n = d.length / 4
  resolve({ size: `${s.width}x${s.height}`, rgb: +(rgb / n).toFixed(1), alpha: +(a / n).toFixed(1), clear, bg: getComputedStyle(document.body).backgroundColor })
})))

log('playing:', await loadTrack(page))
await src.goto(APP + '?source')
await src.waitForTimeout(800)
log('source before connecting: waiting shown', await src.locator('.lost').isVisible(), '|', await src.locator('.lost').textContent())

// Wrong password, then the right one.
await panel.getByText('Conexión', { exact: true }).click()
await panel.getByLabel('Dirección', { exact: true }).fill(`ws://127.0.0.1:${PORT}`)
await panel.getByLabel('Contraseña').fill('nope')
await panel.getByRole('button', { name: 'Guardar y conectar' }).click()
await panel.getByLabel('Enviar a OBS').check()
await page.waitForTimeout(1000)
log('wrong password:', await panel.locator('.error[role=status]').textContent().catch(() => 'no error'), '| rejected', obs.stats.rejected)
await panel.getByLabel('Contraseña').fill('testpass')
await panel.getByRole('button', { name: 'Guardar y conectar' }).click()
await page.waitForTimeout(1500)
log('right password:', await panel.locator('p[role=status]').last().textContent(), '| protocol asked', obs.stats.protocol)

// Rate and size over 3 s.
let r0 = obs.stats.requests, b0 = obs.stats.bytes
await page.waitForTimeout(3000)
log('rate:', ((obs.stats.requests - r0) / 3).toFixed(0), 'requests/s,', ((obs.stats.bytes - b0) / 3 / 1024).toFixed(0), 'KB/s | events', JSON.stringify(obs.stats.events))

const s1 = await read(src)
await src.waitForTimeout(400)
const s2 = await read(src)
log('source:', JSON.stringify(s1), '| moves', Math.abs(s1.rgb - s2.rgb) + Math.abs(s1.alpha - s2.alpha) > 0, '| waiting hidden', await src.locator('.lost').isHidden())

// Blackout reaches the source; then a solo plasma layer changes it.
await page.locator('.panel.live').getByRole('button', { name: 'Apagón', exact: true }).click()
await page.waitForTimeout(600)
log('blackout in source:', JSON.stringify(await read(src)))
await page.locator('.panel.live').getByRole('button', { name: 'Apagón', exact: true }).click()
const vis = page.locator('.panel.visuals, .panel.inspector')
await vis.getByRole('button', { name: 'Añadir capa' }).click()
await page.locator('.panel.browser').getByRole('button', { name: 'Poner Plasma en la capa 3' }).click()
await vis.getByRole('button', { name: 'Solo la capa 3' }).click()
await page.waitForTimeout(800)
log('plasma solo: main rgb', (await page.evaluate(() => 0)), '| source', JSON.stringify(await read(src)))

// Fixed format reaches the source; black background option.
await panel.getByLabel('Resolución', { exact: true }).selectOption('720')
await page.waitForTimeout(600)
log('720p: source canvas', (await read(src)).size)
await panel.getByLabel('Resolución', { exact: true }).selectOption('auto')
await page.waitForTimeout(400)
log('auto: source canvas', (await read(src)).size)
await panel.getByLabel('Fondo negro en vez de transparente').check()
const blackUrl = await panel.locator('.source-url input').inputValue()
const src2 = await (await srcBrowser.newContext({ viewport: { width: 640, height: 360 } })).newPage()
await src2.addInitScript(browserShim(PORT))
await src2.goto(blackUrl)
await src2.waitForTimeout(1500)
log('black background url', blackUrl.replace(/^.*\?/, '?'), '|', JSON.stringify(await read(src2)))

// A source opened late catches up within the state period; stopping shows the wait line.
await panel.getByLabel('Enviar a OBS').uncheck()
await src.waitForTimeout(4800)
log('after stop: waiting shown', await src.locator('.lost').isVisible(), '| identified total', obs.stats.identified)

// Reload: connects again by itself.
await page.reload()
await page.waitForSelector('.stage canvas')
await reveal(page)
await panel.getByLabel('Enviar a OBS').check()
await page.reload()
await page.waitForSelector('.stage canvas')
await reveal(page)
await page.waitForTimeout(1500)
log('after reload:', await panel.locator('p[role=status]').last().textContent(), '| enabled kept', await panel.getByLabel('Enviar a OBS').isChecked())

log('errors:', errors.length ? errors.join('\n  ') : 'none')
log('source errors:', srcErrors.length ? srcErrors.join('\n  ') : 'none')
await browser.close()
await srcBrowser.close()
await obs.close()
