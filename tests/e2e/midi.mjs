// Phase 8 part 3: MIDI with a fake Web MIDI input injected into the page.
import { open, loadTrack, reveal } from './lib.mjs'

const kind = process.argv[2] ?? 'firefox'
const { browser, page, errors } = await open(kind, {
  init: () => {
    const input = { id: 'fake-1', name: 'Fake controller', onmidimessage: null }
    const access = { inputs: new Map([[input.id, input]]), outputs: new Map(), onstatechange: null }
    navigator.requestMIDIAccess = async () => access
    window.__midi = (bytes, timeStamp = performance.now()) => input.onmidimessage?.({ data: new Uint8Array(bytes), timeStamp })
  },
})
const log = (...a) => console.log(`[${kind}]`, ...a)
const midi = page.locator('.panel.midi')
const live = page.locator('.perform-bar')
const vis = page.locator('.panel.visuals, .panel.inspector')
const send = (bytes) => page.evaluate((b) => window.__midi(b), bytes)

log('playing:', await loadTrack(page))
await midi.getByRole('button', { name: 'Activar MIDI' }).click()
log('inputs:', await midi.locator('select').first().locator('option').allTextContents())

// Map the blackout to a pad, the crossfader to CC 7, layer 2 opacity to CC 8.
await midi.locator('details.live-keys > summary').click()
await midi.getByRole('button', { name: 'Control MIDI de Apagón', exact: true }).click()
log('learning shows:', await midi.getByRole('button', { name: 'Control MIDI de Apagón', exact: true }).textContent())
await send([0x90, 36, 30])
await send([0x80, 36, 0])
log('blackout mapped to:', await midi.getByRole('button', { name: 'Control MIDI de Apagón', exact: true }).textContent())
const pressed = () => live.getByRole('button', { name: 'Apagón', exact: true }).getAttribute('aria-pressed')
await send([0x90, 36, 20]); await send([0x80, 36, 0])
const p1 = await pressed()
await send([0x90, 36, 90]); await send([0x80, 36, 0])
log('pad presses blackout:', p1, '->', await pressed())

await midi.getByRole('button', { name: 'Control MIDI de Crossfader', exact: true }).click()
await send([0xb0, 7, 10])
await midi.getByRole('button', { name: 'Control MIDI de Opacidad de la capa 2' }).click()
await send([0xb0, 8, 10])
await send([0xb0, 7, 127])
await send([0xb0, 8, 64])
await page.waitForTimeout(100)
log('CC 7 -> crossfader', await page.locator('.perform-bar').getByLabel('Crossfader', { exact: true }).inputValue(), '| CC 8 -> layer 2 opacity', await vis.getByLabel('Opacidad de la capa 2').inputValue())
log('last control:', await midi.locator('[role=status]').textContent())

// A modulation following CC 20 on the selected layer's intensity; layer 1 is on side A.
await send([0xb0, 7, 0])
const param = vis.locator('.param').filter({ hasText: 'Intensidad' }).first()
await param.getByRole('button', { name: 'Modulación de Intensidad' }).click()
await param.getByRole('button', { name: 'Añadir modulación' }).click()
await param.getByLabel('Fuente').selectOption('midi')
await param.getByRole('button', { name: 'Aprender' }).click()
await send([0xb0, 20, 0])
log('modulation control:', await param.locator('.midi-learn .btn').textContent())
const mark = () => param.locator('.live-mark').evaluate((el) => el.style.left || el.style.transform)
await page.waitForTimeout(200)
const m0 = await mark()
await send([0xb0, 20, 127])
await page.waitForTimeout(200)
log('live mark with CC 20 at 0 and 127:', m0, '->', await mark())

// Clock at 128 BPM for 3 s, after a Start.
await page.evaluate(() => {
  window.__midi([0xfa])
  const interval = 60000 / 128 / 24
  const start = performance.now()
  let n = 0
  const id = setInterval(() => {
    const now = performance.now()
    while (start + n * interval <= now) { window.__midi([0xf8], start + n * interval); n++ }
    if (now - start > 3000) clearInterval(id)
  }, 5)
})
await page.waitForTimeout(2500)
log('clock: panel', await midi.locator('.setting-row', { has: page.getByRole('switch', { name: 'Seguir el reloj MIDI' }) }).locator('.setting-desc').textContent(), '| analysis', (await page.locator('.panel.analysis .tempo-row').textContent()).replace(/\s+/g, ' '))
await page.waitForTimeout(1500)
log('clock gone: analysis', (await page.locator('.panel.analysis .tempo-row').textContent()).replace(/\s+/g, ' ').slice(0, 60))

await page.reload()
await page.waitForSelector('.stage canvas')
await reveal(page)
await page.waitForTimeout(500)
log('after reload: enabled again', await midi.getByRole('button', { name: 'Activar MIDI' }).count() === 0)
await midi.locator('details.live-keys > summary').click()
log('mappings kept:', await midi.getByRole('button', { name: 'Control MIDI de Apagón', exact: true }).textContent(), '|', await midi.getByRole('button', { name: 'Control MIDI de Crossfader', exact: true }).textContent())
log('errors:', errors.length ? errors.join('\n  ') : 'none')
await browser.close()
