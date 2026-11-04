// Live TV as the visual input. iptv-org's group list and playlist are faked through the
// browser's network; the channels come from a local https server with an HLS test pattern
// and a tone made by ffmpeg: one sends CORS and plays as the input, the other does not, is marked in
// the background and turned away. Needs openssl and ffmpeg. With SPECTRA_REAL_TV=1, a real
// group follows.
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { createServer } from 'node:https'
import { join } from 'node:path'
import { open, reveal, loadTrack, grab, stats, useSource, sourceBox, OUT } from './lib.mjs'

const kind = process.argv[2] ?? 'firefox'
const log = (...a) => console.log(`[${kind}]`, ...a)
const key = join(OUT, 'radio-key.pem')
const cert = join(OUT, 'radio-cert.pem')
if (!existsSync(cert)) spawnSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', key, '-out', cert, '-days', '3650', '-subj', '/CN=127.0.0.1'], { stdio: 'ignore' })
const hlsDir = join(OUT, 'hls-av')
if (!existsSync(join(hlsDir, 'index.m3u8'))) {
  mkdirSync(hlsDir, { recursive: true })
  spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc=size=320x180:rate=25', '-f', 'lavfi', '-i', 'sine=frequency=220:sample_rate=44100', '-t', '30', '-c:v', 'libx264', '-c:a', 'aac', '-pix_fmt', 'yuv420p', '-g', '25', '-hls_time', '1', '-hls_playlist_type', 'vod', join(hlsDir, 'index.m3u8')], { stdio: 'inherit' })
}
if (!existsSync(cert) || !existsSync(join(hlsDir, 'index.m3u8'))) {
  log('skipped: openssl and ffmpeg are needed for the test stream')
  process.exit(0)
}

// /ok/… with CORS, /no/… without; the same HLS files behind both.
const server = createServer({ key: readFileSync(key), cert: readFileSync(cert) }, (req, res) => {
  const [, folder, file] = req.url.split('/')
  const path = join(hlsDir, file ?? '')
  if (!file || !existsSync(path)) return res.writeHead(404).end()
  res.writeHead(200, { 'Content-Type': file.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' : 'video/mp2t', ...(folder === 'ok' ? { 'Access-Control-Allow-Origin': '*' } : {}) })
  res.end(readFileSync(path))
})
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
const base = `https://127.0.0.1:${server.address().port}`

const MD = `### Grouped by category
    <tr><td>Music</td><td align="right">3</td><td nowrap><code>https://iptv-org.github.io/iptv/categories/music.m3u</code></td></tr>
- 🇪🇸 Spain <code>https://iptv-org.github.io/iptv/countries/es.m3u</code>
`
const M3U = `#EXTM3U
#EXTINF:-1 tvg-id="Ok.es@SD" group-title="Music",Canal con CORS (720p)
${base}/ok/index.m3u8
#EXTINF:-1 tvg-id="No.es@SD" group-title="Music",Canal sin CORS [Geo-blocked]
${base}/no/index.m3u8
#EXTINF:-1 tvg-id="Ref.es@SD" http-referrer="https://player.test/" group-title="Music",Canal con referrer
#EXTVLCOPT:http-referrer=https://player.test/
${base}/ok/index.m3u8?ref
`

const { browser, page, errors } = await open(kind, { contextOptions: { ignoreHTTPSErrors: true } })
let asked = 0
await page.route('https://raw.githubusercontent.com/iptv-org/iptv/master/PLAYLISTS.md', (r) => (asked++, r.fulfill({ body: MD, contentType: 'text/plain' })))
await page.route('https://iptv-org.github.io/iptv/categories/music.m3u', (r) => (asked++, r.fulfill({ body: M3U, contentType: 'audio/x-mpegurl' })))

const panel = sourceBox(page)
const status = () => panel.getByRole('status').textContent()
log('playing:', await loadTrack(page))
await useSource(page)
await page.waitForTimeout(1000)
const dark = stats(await grab(page)).mean
log('iptv-org contacted before opening TV:', asked)
await panel.getByRole('button', { name: 'TV' }).click()
await panel.getByLabel('Grupo').locator('option', { hasText: 'Música' }).waitFor({ state: 'attached' })
log('groups:', (await panel.getByLabel('Grupo').locator('option').allTextContents()).join(' | '))
await panel.getByLabel('Agrupar por').selectOption('country')
log('countries:', (await panel.getByLabel('Grupo').locator('option').allTextContents()).join(' | '))
await panel.getByLabel('Agrupar por').selectOption('category')
await panel.getByLabel('Grupo').selectOption({ label: 'Música (3)' })
await panel.locator('.radio-row').first().waitFor()
await panel.locator('.radio-row.unusable').first().waitFor({ timeout: 15000 })
await page.waitForTimeout(500)
log('channels:', await panel.locator('.radio-row').evaluateAll((rows) => rows.map((r) => `${r.querySelector('.radio-name').textContent} [${r.querySelector('.radio-sub').textContent}]`).join(' | ')))

await panel.getByRole('button', { name: /^Canal sin CORS/ }).click()
await panel.locator('.tv .error').waitFor({ timeout: 15000 })
log('without CORS:', await panel.locator('.tv .error').textContent(), '| input:', await status())

await panel.getByRole('button', { name: /^Canal con CORS/ }).click()
await panel.locator('.radio-row.current').waitFor({ timeout: 25000 })
await page.waitForTimeout(1500)
const a = stats(await grab(page))
await page.waitForTimeout(1000)
const b = stats(await grab(page))
log('with CORS:', await status(), '| stage mean', dark.toFixed(1), '->', a.mean.toFixed(1), '| moving', Math.abs(a.mean - b.mean) > 0.05 || JSON.stringify(a) !== JSON.stringify(b))

await panel.getByLabel('Filtrar por nombre').fill('sin')
log('filter "sin":', (await panel.locator('.radio-name').allTextContents()).join(' | '))
await panel.getByLabel('Filtrar por nombre').fill('')
await panel.getByRole('button', { name: 'Añadir Canal con CORS a favoritos' }).click()
await page.reload()
await page.waitForSelector('.stage canvas')
await reveal(page)
await panel.getByRole('button', { name: 'TV' }).click()
await panel.getByRole('button', { name: /^Favoritos/ }).click()
log('favourites after reload:', (await panel.locator('.radio-name').allTextContents()).join(' | '), '| input after reload:', await status())
await panel.getByRole('button', { name: /^Canal con CORS/ }).click()
await panel.locator('.radio-row.current').waitFor({ timeout: 25000 })
log('from favourites:', await status())

// Its sound: the channel becomes the audio source and the transport follows it.
const level = () => page.evaluate(() => new Promise((resolve) => {
  const c = document.querySelector('.meter canvas')
  setTimeout(() => {
    const row = c.getContext('2d', { willReadFrequently: true }).getImageData(0, 4, c.width, 1).data
    let filled = 0
    for (let x = 0; x < c.width; x++) if (row[x * 4 + 2] > 200 && row[x * 4] < 160) filled = x + 1
    resolve(+(filled / c.width).toFixed(2))
  }, 300)
}))
const mini = page.locator('.mini-transport')
const top = () => mini.textContent()
log('before sound: top', await top(), '| level', await level())
await panel.getByLabel('Usar también su sonido').check()
await page.waitForTimeout(1500)
log('sound on: top', await top(), '| level', await level(), '| source', await page.evaluate(() => document.querySelector('.panel.sources .seg .live-dot')?.closest('.seg').textContent.trim()))
await mini.getByRole('button', { name: 'Pausa' }).click()
await page.waitForTimeout(800)
log('paused: top', await top(), '| picture paused', await page.evaluate(() => document.querySelector('.input-preview video')?.paused))
await page.locator('.topbar h1').click()
await page.keyboard.press(' ')
await page.waitForTimeout(1500)
log('Space resumes: top', await top(), '| level', await level())
log('next favourite button:', await mini.getByRole('button', { name: 'Canal favorito siguiente' }).isEnabled())
await panel.getByLabel('Usar también su sonido').uncheck()
await page.waitForTimeout(800)
log('sound off: top', await top(), '| input', await status())
await panel.getByLabel('Usar también su sonido').check()
await page.waitForTimeout(1000)
await sourceBox(page).getByRole('button', { name: 'Quitar', exact: true }).click()
await page.waitForTimeout(500)
log('input removed: top', await top())
await panel.getByLabel('Usar también su sonido').uncheck()
log('removed:', await status())
await panel.getByRole('button', { name: 'Quitar Canal con CORS de favoritos' }).click()

if (process.env.SPECTRA_REAL_TV) {
  await page.unrouteAll({ behavior: 'ignoreErrors' })
  await page.reload()
  await page.waitForSelector('.stage canvas')
  await reveal(page)
  await panel.getByRole('button', { name: 'TV' }).click()
  await panel.getByLabel('Grupo').locator('option', { hasText: 'Música' }).waitFor({ state: 'attached', timeout: 20000 })
  log('real groups:', await panel.getByLabel('Grupo').locator('option').count())
  const music = await panel.getByLabel('Grupo').locator('option', { hasText: /^Música/ }).textContent()
  await panel.getByLabel('Grupo').selectOption({ label: music })
  await panel.locator('.radio-row').first().waitFor({ timeout: 20000 })
  await page.waitForTimeout(25000)
  const flags = await panel.locator('.radio-flag').allTextContents()
  log('real music:', music, '| shown', await panel.locator('.radio-row').count(), '| marked', flags.length, `(${flags.filter((f) => f === 'no disponible').length} no disponible)`)
  const firstOk = panel.locator('.radio-row:not(.unusable) .radio-main').first()
  const name = await firstOk.locator('.radio-name').textContent()
  await firstOk.click()
  await page.waitForFunction(() => document.querySelector('#insp-layer .source [role=status]')?.textContent.startsWith('TV') || document.querySelector('#insp-layer .source .error'), null, { timeout: 40000 }).catch(() => {})
  log('real channel', name, '->', await status(), '|', await panel.locator('.error').allTextContents())
}

// Expected: the browser reports the blocked check on the stream without CORS.
log('errors:', errors.filter((e) => !/CORS|Cross-Origin|Access-Control|\/no\/|ERR_FAILED|NetworkError|willReadFrequently|status of 40[34]/.test(e)).join('\n  ') || 'none')
await browser.close()
server.close()
