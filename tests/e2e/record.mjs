// Phase 9 parts 1 and 2: output format and recording.
import { open, loadTrack, OUT, reveal } from './lib.mjs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'

const kind = process.argv[2] ?? 'firefox'
const { browser, page, errors } = await open(kind)
const log = (...a) => console.log(`[${kind}]`, ...a)
const panel = page.locator('.panel.output')
const size = () => page.evaluate(() => { const c = document.querySelector('.stage canvas'); return `${c.width}x${c.height}` })

import { spawnSync } from 'node:child_process'
function ff(args) {
  return spawnSync('ffmpeg', args, { encoding: 'utf8' }).stderr
}
function check(path) {
  const info = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type,codec_name,width,height', '-of', 'json', path]).toString())
  const streams = info.streams.map((s) => s.codec_type === 'video' ? `${s.codec_name} ${s.width}x${s.height}` : s.codec_name).join(' + ')
  const vol = ff(['-i', path, '-vn', '-af', 'volumedetect', '-f', 'null', '-'])
  const mean = vol.match(/mean_volume: (-?[\d.]+) dB/)?.[1]
  const frames = ff(['-i', path, '-map', '0:v:0', '-c', 'copy', '-f', 'null', '-'])
  const time = [...frames.matchAll(/time=(\d+):(\d+):([\d.]+)/g)].pop()
  const frameN = [...frames.matchAll(/frame=\s*(\d+)/g)].pop()?.[1]
  const dur = time ? (+time[1] * 3600 + +time[2] * 60 + +time[3]).toFixed(2) : '?'
  return `${streams} | ${dur} s, ${frameN} frames | audio mean ${mean} dB`
}

log('playing:', await loadTrack(page))
log('mime:', await panel.locator('.live-row .mono').last().textContent())

// Format.
log('auto size:', await size())
await panel.getByLabel('Resolución', { exact: true }).selectOption('720')
await page.waitForTimeout(200)
log('720p 16:9:', await size())
await panel.getByLabel('Proporción').selectOption('9:16')
await page.waitForTimeout(200)
log('720p 9:16:', await size())
await panel.getByLabel('Proporción').selectOption('16:9')

// Record 4 s at 30 fps.
await panel.getByLabel('Fotogramas por segundo').selectOption('30')
await panel.getByLabel('Calidad', { exact: true }).selectOption('standard')
await panel.getByRole('button', { name: 'Grabar' }).click()
await page.waitForTimeout(4200)
log('while recording:', await panel.locator('.mono[role=status]').textContent(), '| stage', await page.locator('.stage-bar .mono').textContent(), '| format disabled:', await panel.getByLabel('Resolución', { exact: true }).isDisabled())
let dl = page.waitForEvent('download')
await panel.getByRole('button', { name: 'Detener' }).click()
let d = await dl
let path = join(OUT, 'rec1-' + kind + '-' + d.suggestedFilename())
await d.saveAs(path)
log('file:', d.suggestedFilename(), '|', check(path))
log('kept:', await panel.locator('.kept span').textContent())

// Auto size while recording is made even, then back to auto. Key R starts and stops.
await panel.getByLabel('Resolución', { exact: true }).selectOption('auto')
await page.setViewportSize({ width: 1501, height: 977 })
await page.waitForTimeout(300)
const before = await size()
await page.locator('body').click({ position: { x: 5, y: 5 } })
await page.keyboard.press('r')
await page.waitForTimeout(2500)
const during = await size()
dl = page.waitForEvent('download')
await page.keyboard.press('r')
d = await dl
path = join(OUT, 'rec2-' + kind + '-' + d.suggestedFilename())
await d.saveAs(path)
await page.waitForTimeout(300)
log('auto: before', before, '| during', during, '| after', await size(), '|', check(path))

// Reload in the middle of a recording: what was written is kept.
await panel.getByRole('button', { name: 'Grabar' }).click()
await page.waitForTimeout(3500)
await page.reload()
await page.waitForSelector('.stage canvas')
await reveal(page)
await page.waitForTimeout(800)
log('after reload mid-recording:', await panel.locator('.kept span').textContent().catch(() => 'none'))
dl = page.waitForEvent('download')
await panel.getByRole('button', { name: 'Descargar la última grabación' }).click()
d = await dl
path = join(OUT, 'rec3-' + kind + '-' + d.suggestedFilename())
await d.saveAs(path)
log('cut short:', check(path))
await panel.getByRole('button', { name: 'Borrar la última grabación' }).click()
await page.waitForTimeout(300)
log('after delete, kept shown:', await panel.locator('.kept').count())
await page.reload()
await page.waitForSelector('.stage canvas')
await reveal(page)
await page.waitForTimeout(500)
log('after reload, kept shown:', await panel.locator('.kept').count(), '| format kept:', await panel.getByLabel('Resolución', { exact: true }).inputValue(), '| R bound:', await page.locator('.panel.settings-keys').getByRole('button', { name: 'Tecla de Grabar' }).textContent())
log('errors:', errors.length ? errors.join('\n  ') : 'none')
await browser.close()
