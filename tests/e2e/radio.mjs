// Radio directory in the Stream source. The directory is faked through the browser's
// network; the two stations come from a local https server, because Playwright's faked
// responses skip the browser's CORS check: one stream sends CORS and plays, the other does
// not and is turned away before it replaces anything; the background check marks it
// first. A real search follows with SPECTRA_REAL_RADIO=1. Needs openssl for the test certificate.
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { createServer } from 'node:https'
import { join } from 'node:path'
import { open, reveal, testWav, OUT } from './lib.mjs'

const kind = process.argv[2] ?? 'chrome'
const log = (...a) => console.log(`[${kind}]`, ...a)
const key = join(OUT, 'radio-key.pem')
const cert = join(OUT, 'radio-cert.pem')
if (!existsSync(cert)) spawnSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', key, '-out', cert, '-days', '3650', '-subj', '/CN=127.0.0.1'], { stdio: 'ignore' })
if (!existsSync(cert)) {
  log('skipped: openssl is needed for the test certificate')
  process.exit(0)
}
const wav = readFileSync(testWav())
const server = createServer({ key: readFileSync(key), cert: readFileSync(cert) }, (req, res) => {
  const cors = req.url !== '/no.wav'
  res.writeHead(200, { 'Content-Type': 'audio/wav', ...(cors ? { 'Access-Control-Allow-Origin': '*' } : {}) })
  res.end(wav)
})
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
const base = `https://127.0.0.1:${server.address().port}`

const { browser, page, errors } = await open(kind, { contextOptions: { ignoreHTTPSErrors: true } })
const station = (id, name, url) => ({ stationuuid: id, name, url, url_resolved: url, country: 'Spain', codec: 'WAV', bitrate: 0, tags: 'test' })
let searches = 0
await page.route('https://all.api.radio-browser.info/json/servers', (r) => r.fulfill({ json: [{ name: 'radio.test' }] }))
await page.route('https://radio.test/json/stations/search?**', (r) => {
  searches++
  return r.fulfill({ json: [station('ok', 'Con CORS', `${base}/ok.wav`), station('ok2', 'Otra con CORS', `${base}/ok2.wav`), station('no', 'Sin CORS', `${base}/no.wav`), station('http', 'Sin https', 'http://stream.test/plain.wav')] })
})

const panel = page.locator('.panel.sources')
await panel.getByRole('button', { name: 'Stream' }).click()
log('directory contacted before searching:', searches)
await panel.getByLabel('Buscar por').selectOption('tag')
await panel.getByRole('searchbox', { name: 'Buscar' }).fill('jazz')
await panel.getByRole('button', { name: 'Buscar', exact: true }).click()
await panel.locator('.radio-row').first().waitFor()
log('results:', (await panel.locator('.radio-name').allTextContents()).join(' | '), '| searches', searches)
const flags = () => panel.locator('.radio-row').evaluateAll((rows) => rows.map((r) => `${r.querySelector('.radio-name').textContent}: ${r.querySelector('.radio-flag')?.textContent ?? '-'}`).join(' | '))
await panel.locator('.radio-row.unusable').first().waitFor({ timeout: 15000 })
await page.waitForTimeout(1000)
log('background check:', await flags())

await panel.getByRole('button', { name: /^Sin CORS/ }).click()
await panel.locator('.radio .error').waitFor({ timeout: 15000 })
log('without CORS:', await panel.locator('.radio .error').textContent(), '| source still', await page.evaluate(() => document.querySelector('.panel.sources .seg.on')?.textContent))

await panel.getByRole('button', { name: /^Con CORS/ }).click()
await panel.locator('.radio-row.current').waitFor({ timeout: 15000 })
await page.waitForTimeout(1500)
const level = await page.evaluate(() => new Promise((resolve) => {
  const c = document.querySelector('.meter canvas')
  setTimeout(() => {
    const row = c.getContext('2d', { willReadFrequently: true }).getImageData(0, 4, c.width, 1).data
    let filled = 0
    for (let x = 0; x < c.width; x++) if (row[x * 4 + 2] > 200 && row[x * 4] < 160) filled = x + 1
    resolve(filled / c.width)
  }, 300)
}))
log('with CORS: playing', await panel.locator('.radio-row.current .radio-name').textContent(), '| live dot on Stream', await panel.locator('.seg', { hasText: 'Stream' }).locator('.live-dot').count(), '| level', level.toFixed(2))

// The transport follows the stream: name and badge, pause and resume, Space, favourites.
const mini = page.locator('.mini-transport')
const player = page.locator('.panel.player')
const liveState = () => page.evaluate(() => ({
  top: document.querySelector('.mini-transport')?.textContent,
  panel: document.querySelector('.panel.player .now-playing')?.textContent,
  seek: !!document.querySelector('.panel.player input.seek'),
  dot: !!document.querySelector('.panel.sources .seg .live-dot') && document.querySelector('.panel.sources .seg .live-dot').closest('.seg').textContent.trim(),
  system: navigator.mediaSession?.metadata ? `${navigator.mediaSession.metadata.title} / ${navigator.mediaSession.metadata.artist} / ${navigator.mediaSession.playbackState}` : null,
}))
log('transport live:', JSON.stringify(await liveState()))
log('previous/next without favourites disabled:', await mini.getByRole('button', { name: 'Emisora favorita siguiente' }).isDisabled())
await mini.getByRole('button', { name: 'Pausa' }).click()
await page.waitForTimeout(800)
log('paused:', JSON.stringify(await liveState()))
await player.getByRole('button', { name: 'Reproducir' }).click()
await panel.locator('.radio-row.current').waitFor()
await page.waitForTimeout(1000)
log('resumed from the player panel:', JSON.stringify(await liveState()))
await page.locator('.topbar h1').click()
await page.keyboard.press(' ')
await page.waitForTimeout(800)
log('Space pauses:', (await liveState()).top)
await page.keyboard.press(' ')
await page.waitForTimeout(1500)
log('Space resumes:', (await liveState()).top)
await panel.getByRole('button', { name: 'Añadir Otra con CORS a favoritas' }).click()
await panel.getByRole('button', { name: 'Añadir Con CORS a favoritas' }).click()
await mini.getByRole('button', { name: 'Emisora favorita siguiente' }).click()
await page.waitForTimeout(1500)
log('next favourite (from the first favourite):', (await liveState()).top)
await mini.getByRole('button', { name: 'Emisora favorita siguiente' }).click()
await page.waitForTimeout(1500)
log('next again, wraps:', (await liveState()).top)
await page.screenshot({ path: OUT + '/radio-' + kind + '.png' })
await panel.getByRole('button', { name: 'Reproductor' }).click()
await page.waitForTimeout(500)
log('back to the player:', JSON.stringify(await liveState()))
await panel.getByRole('button', { name: 'Stream' }).click()
await panel.getByRole('button', { name: 'Quitar Otra con CORS de favoritas' }).click()
await page.reload()
await page.waitForSelector('.stage canvas')
await reveal(page)
await panel.getByRole('button', { name: 'Stream' }).click()
await panel.getByRole('button', { name: /^Favoritas/ }).click()
log('favourites after reload:', (await panel.locator('.radio-name').allTextContents()).join(' | '))
await panel.getByRole('button', { name: 'Quitar Con CORS de favoritas' }).click()
log('after removing:', await panel.locator('.radio .muted.small').first().textContent())

// The real directory, only when asked (SPECTRA_REAL_RADIO=1): it takes half a minute and
// depends on outside servers.
if (process.env.SPECTRA_REAL_RADIO) {
  await page.unrouteAll({ behavior: 'ignoreErrors' })
  await page.reload()
  await page.waitForSelector('.stage canvas')
  await reveal(page)
  await panel.getByRole('button', { name: 'Stream' }).click()
  await panel.getByRole('searchbox', { name: 'Buscar' }).fill('jazz')
  await panel.getByRole('button', { name: 'Buscar', exact: true }).click()
  await page.waitForFunction(() => document.querySelector('.radio-row') || document.querySelector('.radio .error') || document.querySelector('.radio .muted.small')?.textContent.includes('Ninguna'), null, { timeout: 20000 }).catch(() => {})
  log('real directory, "jazz" by name:', await panel.locator('.radio-row').count(), 'stations')
  await page.waitForTimeout(20000)
  log('real directory, after the background check:', await panel.locator('.radio-flag').allTextContents().then((f) => `${f.length} marked (${f.filter((x) => x === 'sin análisis').length} sin análisis)`))
}
// Expected: the browser reports the blocked check on the station without CORS, and reading
// the app's meter canvas from here makes Chrome suggest willReadFrequently.
log('errors:', errors.filter((e) => !/willReadFrequently|CORS|Cross-Origin|Access-Control|no.wav|ERR_FAILED/.test(e)).join('\n  ') || 'none')
await browser.close()
server.close()
