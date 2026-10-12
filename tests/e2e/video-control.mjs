// Video in the visual input: play and pause, position, trimmed span, loop or once, speed.
// A 10 s test pattern made by ffmpeg; the video element's own clock is read to check that
// playback stays inside the span.
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { open, OUT } from './lib.mjs'

const kind = process.argv[2] ?? 'firefox'
const log = (...a) => console.log(`[${kind}]`, ...a)
const file = join(OUT, 'vc-10s.webm')
if (!existsSync(file)) spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc=size=320x180:rate=25', '-t', '10', '-c:v', 'libvpx-vp9', '-b:v', '300k', file], { stdio: 'inherit' })
if (!existsSync(file)) {
  log('skipped: ffmpeg is needed for the test video')
  process.exit(0)
}

const { browser, page, errors } = await open(kind)
const panel = page.locator('.panel.visual-input')
const ctl = panel.locator('.video-controls')
const v = () => page.evaluate(() => { const e = document.querySelector('.input-preview video'); return e ? { t: +e.currentTime.toFixed(2), paused: e.paused, rate: e.playbackRate, loop: e.loop } : null })
// Samples of the clock over `ms`.
const sample = (ms) => page.evaluate((ms) => new Promise((resolve) => {
  const e = document.querySelector('.input-preview video')
  const out = []
  const t0 = performance.now()
  const step = () => (out.push(e.currentTime), performance.now() - t0 < ms ? requestAnimationFrame(step) : resolve({ min: +Math.min(...out).toFixed(2), max: +Math.max(...out).toFixed(2), wraps: out.slice(1).filter((x, i) => x < out[i] - 0.5).length }))
  step()
}), ms)

log('controls before a video:', await ctl.count())
const chooser = page.waitForEvent('filechooser')
await panel.getByRole('button', { name: 'Imagen o vídeo' }).click()
await (await chooser).setFiles(file)
await ctl.waitFor()
await page.waitForTimeout(500)
log('opened:', JSON.stringify(await v()), '| shown', await ctl.locator('.mono').textContent())

await ctl.getByLabel('Inicio (s)').fill('2')
await ctl.getByLabel('Fin (s)').fill('4')
await page.waitForTimeout(300)
log('span 2-4, loop, 5 s:', JSON.stringify(await sample(5000)))

await ctl.getByLabel('Bucle').uncheck()
await page.waitForTimeout(3000)
log('loop off, after 3 s:', JSON.stringify(await v()))
await ctl.getByRole('button', { name: 'Reproducir el vídeo' }).click()
await page.waitForTimeout(300)
log('play again starts the span:', JSON.stringify(await v()))
await ctl.getByLabel('Bucle').check()

await ctl.getByLabel('Velocidad').selectOption('2')
log('speed 2, 4 s:', JSON.stringify(await sample(4000)), '| rate', (await v()).rate)
await ctl.getByLabel('Velocidad').selectOption('1')

await ctl.getByRole('button', { name: 'Quitar recorte' }).click()
await ctl.getByRole('button', { name: 'Pausar el vídeo' }).click()
await ctl.getByLabel('Posición del vídeo').fill('6')
await page.waitForTimeout(200)
log('seek to 6, paused:', JSON.stringify(await v()))
await ctl.getByRole('button', { name: 'Marcar inicio' }).click()
await ctl.getByLabel('Posición del vídeo').fill('7.5')
await ctl.getByRole('button', { name: 'Marcar fin' }).click()
log('marked:', await ctl.getByLabel('Inicio (s)').inputValue(), '-', await ctl.getByLabel('Fin (s)').inputValue())
await ctl.getByRole('button', { name: 'Reproducir el vídeo' }).click()
log('span 6-7.5, 3 s:', JSON.stringify(await sample(3000)))
await ctl.getByRole('button', { name: 'Quitar recorte' }).click()
log('trim removed:', await ctl.getByLabel('Inicio (s)').inputValue(), '-', await ctl.getByLabel('Fin (s)').inputValue())
log('full length loops, 12 s:', JSON.stringify(await sample(12000)))

await panel.getByRole('button', { name: 'Quitar', exact: true }).click()
await page.waitForTimeout(300)
log('input removed, controls:', await ctl.count())
log('errors:', errors.join('\n  ') || 'none')
await browser.close()
