// The sound of a video in a layer's source: off by default, heard with its switch, silent at
// volume 0 and again once switched off. The analysis hears what the speakers get, so its
// peak stands in for the sound.
import { open, loadTrack, reveal, useSource, sourceBox, FIXTURES } from './lib.mjs'
import { join } from 'node:path'

const kind = process.argv[2] ?? 'firefox'
const log = (...a) => console.log(`[${kind}]`, ...a)
const { browser, page, errors } = await open(kind, {
  init: () => {
    window.__peak = 0
    const read = AnalyserNode.prototype.getFloatTimeDomainData
    AnalyserNode.prototype.getFloatTimeDomainData = function (data) {
      read.call(this, data)
      for (let i = 0; i < data.length; i++) window.__peak = Math.max(window.__peak, Math.abs(data[i]))
    }
  },
})
const panel = sourceBox(page)
const peak = async (ms = 1200) => {
  await page.evaluate(() => { window.__peak = 0 })
  await page.waitForTimeout(ms)
  return page.evaluate(() => window.__peak)
}
const check = (label, ok, value) => {
  log(label, value.toFixed(4), ok ? 'ok' : 'FAIL')
}

await reveal(page)
await useSource(page)
const chooser = page.waitForEvent('filechooser')
await panel.getByRole('button', { name: 'Imagen o vídeo' }).click()
await (await chooser).setFiles(join(FIXTURES, 'test-video-sound.webm'))
await page.waitForTimeout(1500)

const sound = panel.getByLabel('Oír su sonido')
const volume = panel.getByLabel('Volumen de la fuente')
log('controls shown:', await sound.count(), 'checked:', await sound.isChecked())

let p = await peak()
check('silent by default', p < 0.001, p)
await sound.check()
p = await peak()
check('heard with the switch', p > 0.02, p)
await volume.fill('0')
await page.waitForTimeout(500)
p = await peak()
check('silent at volume 0', p < 0.001, p)
await volume.fill('1')
p = await peak()
check('heard again at volume 1', p > 0.02, p)
await sound.uncheck()
await page.waitForTimeout(500)
p = await peak()
check('silent once switched off', p < 0.001, p)
// The song goes on: a source's sound is mixed in, it does not take the player's place.
await sound.check()
log('player still playing with the source sound on:', await loadTrack(page))
await page.waitForTimeout(800)
p = await peak()
check('song and source together', p > 0.02, p)
log('errors:', errors.length ? errors.join('\n  ') : 'none')
await browser.close()
