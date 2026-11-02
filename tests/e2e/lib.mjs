// Shared harness for the browser checks: muted browser, test track, canvas grabs.
import { chromium, firefox } from 'playwright'
import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
export const ROOT = join(HERE, '..', '..')
export const FIXTURES = join(HERE, 'fixtures')
// Real tracks for the tests that need them; not in git (see music/README.md).
export const MUSIC = process.env.SPECTRA_MUSIC ?? join(HERE, 'music')
// Generated files, screenshots and recordings; ignored by git.
export const OUT = join(HERE, 'out')
export const APP = process.env.SPECTRA_URL ?? 'http://localhost:4173/'
mkdirSync(OUT, { recursive: true })

// 60 s: kick every 0.5 s (120 BPM), hi-hat between, a slow chord.
export function testWav() {
  const path = join(OUT, 'test.wav')
  if (existsSync(path)) return path
  const rate = 44100, seconds = 60, n = rate * seconds
  const buf = Buffer.alloc(44 + n * 2)
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8)
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22)
  buf.writeUInt32LE(rate, 24); buf.writeUInt32LE(rate * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34)
  buf.write('data', 36); buf.writeUInt32LE(n * 2, 40)
  for (let i = 0; i < n; i++) {
    const t = i / rate
    const k = t % 0.5
    const h = (t + 0.25) % 0.5
    const kick = Math.sin(2 * Math.PI * (50 + 80 * Math.exp(-k * 30)) * t) * Math.exp(-k * 10)
    const hat = (Math.random() * 2 - 1) * Math.exp(-h * 40)
    const chord = [220, 277, 330].reduce((s, f) => s + Math.sin(2 * Math.PI * f * t), 0) / 3
    const v = 0.6 * kick + 0.25 * hat + 0.2 * chord * (0.5 + 0.5 * Math.sin(t))
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32000), 44 + i * 2)
  }
  writeFileSync(path, buf)
  return path
}

// `camera`: a fake camera that needs no permission prompt.
// `notice`: leave the first-visit photosensitivity notice up.
export async function open(kind, { camera = false, notice = false, reveal = true, init = null, viewport = { width: 1600, height: 1000 }, contextOptions = {} } = {}) {
  const browser = kind === 'firefox'
    ? await firefox.launch({ firefoxUserPrefs: { 'media.volume_scale': '0.0', 'media.autoplay.default': 0, ...(camera ? { 'media.navigator.streams.fake': true, 'media.navigator.permission.disabled': true } : {}) } })
    : await chromium.launch({ channel: 'chrome', args: ['--mute-audio', '--autoplay-policy=no-user-gesture-required', ...(camera ? ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] : [])] })
  const context = await browser.newContext({ locale: 'es-ES', viewport, ...contextOptions })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push('pageerror ' + e.message))
  // Firefox warns once when the thumbnails' own WebGL context is released; that is expected.
  page.on('console', (m) => { if ((m.type() === 'error' || m.type() === 'warning') && !m.text().includes('WebGL context was lost')) errors.push(m.type() + ' ' + m.text()) })
  // The input fallback, so Playwright can fill the file chooser in Chrome too.
  await page.addInitScript(() => { delete window.showOpenFilePicker })
  // A page script that has to run before the app, such as a fake device.
  if (init) await page.addInitScript(init)
  await page.goto(APP)
  await page.waitForSelector('.stage canvas')
  if (!notice) await dismissNotice(page)
  // Wide layout: older tests expect every panel on the page, so all tabs show at once.
  if (reveal) await revealAll(page)
  return { browser, page, errors }
}

export async function loadTrack(page) {
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Añadir archivos' }).first().click()
  await (await chooser).setFiles(testWav())
  await page.waitForTimeout(1500)
  const play = page.getByRole('button', { name: 'Reproducir', exact: true }).first()
  if (await play.count()) await play.click()
  await page.waitForTimeout(500)
  return page.getByRole('button', { name: 'Pausa', exact: true }).first().count()
}

// Output canvas read right after the renderer's frame: 32 × 18 cells of mean RGB.
export async function grab(page) {
  return page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => {
      const src = document.querySelector('.stage canvas')
      const c = document.createElement('canvas')
      c.width = 32; c.height = 18
      const ctx = c.getContext('2d')
      ctx.drawImage(src, 0, 0, 32, 18)
      resolve([...ctx.getImageData(0, 0, 32, 18).data])
    })
  }))
}

export const stats = (px) => {
  let sum = 0, chroma = 0, mirrorX = 0, mirrorY = 0
  for (let y = 0; y < 18; y++) for (let x = 0; x < 32; x++) {
    const i = (y * 32 + x) * 4
    const [r, g, b] = [px[i], px[i + 1], px[i + 2]]
    sum += (r + g + b) / 3
    chroma += Math.max(r, g, b) - Math.min(r, g, b)
    const j = (y * 32 + (31 - x)) * 4
    mirrorX += Math.abs(px[i] - px[j]) + Math.abs(px[i + 1] - px[j + 1]) + Math.abs(px[i + 2] - px[j + 2])
    const k = ((17 - y) * 32 + x) * 4
    mirrorY += Math.abs(px[i] - px[k]) + Math.abs(px[i + 1] - px[k + 1]) + Math.abs(px[i + 2] - px[k + 2])
  }
  const n = 32 * 18
  return { mean: +(sum / n).toFixed(1), chroma: +(chroma / n).toFixed(1), asymX: +(mirrorX / n / 3).toFixed(1), asymY: +(mirrorY / n / 3).toFixed(1) }
}

// The canvas read inside a frame: Playwright's element screenshot of a WebGL canvas in
// headless Firefox can return a stale frame.
export async function shot(page, name) {
  const url = await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r(document.querySelector('.stage canvas').toDataURL('image/png')))))
  writeFileSync(join(OUT, name + '.png'), Buffer.from(url.split(',')[1], 'base64'))
}
export const stageError = (page) => page.locator('.stage-error').textContent({ timeout: 200 }).catch(() => null)

export async function dismissNotice(page) {
  const b = page.locator('.notice-dialog').getByRole('button', { name: /^Continuar/ })
  if (await b.count()) await b.click()
}

// Shows every tab's panels at once (wide layout), for tests written before the tabs.
// Every tab of the docks and the libraries, the pop-ups of the top bar and the settings
// window, shown at once in the page flow. The page scrolls instead of the docks.
function revealAll(page) {
  return page.evaluate(() => {
    if (!document.getElementById('reveal-all')) {
      const style = document.createElement('style')
      style.id = 'reveal-all'
      style.textContent = `[data-reveal]{position:static!important;inset:auto!important;width:auto!important;max-height:none!important;overflow:visible!important;box-shadow:none!important;background:none!important;padding:0!important;display:block!important}
        .modal-box{max-height:none!important;height:auto!important} .app.wide{height:auto!important} .layout-docks,.dock-zone,.dock-stack,.dock-body{min-height:auto!important;max-height:none!important;overflow:visible!important}
        .topbar.bar{flex-wrap:wrap!important;align-items:flex-start!important} .pop{flex:1 1 100%!important}
        .app.wide .stage:not(.full){flex:none!important;height:60vh!important}`
      document.head.appendChild(style)
    }
    document.querySelectorAll('[role=tabpanel], [data-reveal]').forEach((p) => { p.hidden = false })
  })
}
export const reveal = revealAll

// Selects a layer for editing (1 is the bottom one).
export const pickLayer = (page, n) => page.locator(`.panel.visuals .layer-pick[title="Editar la capa ${n}"]`).click()

// The selected layer's source, in the Inspector (Layer level).
export const sourceBox = (page) => page.locator('#insp-layer .source')

// Gives the selected layer its source as content (Inspector › Content › Source).
export const useSource = (page) => page.locator('#insp-layer').getByRole('group', { name: 'Contenido' }).getByRole('button', { name: 'Fuente', exact: true }).click()

// The source section is folded while the layer shows a visualization: opens it.
export async function expandSource(page) {
  const box = sourceBox(page)
  if (!(await box.first().isVisible())) await page.locator('#insp-layer .fold-head button').filter({ has: page.locator('.fold-title', { hasText: /^Fuente$/ }) }).click()
  return box
}
