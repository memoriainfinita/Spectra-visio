// Music from Audius into the player's list. The API, the audio and the artwork are faked
// through the browser's network: a click downloads the track, adds it with Audius's title,
// artist and cover (the test file has no tags) and plays it; + only adds. With
// SPECTRA_REAL_AUDIUS=1, a real search follows.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { open, reveal, testWav, FIXTURES } from './lib.mjs'

const kind = process.argv[2] ?? 'firefox'
const log = (...a) => console.log(`[${kind}]`, ...a)
const { browser, page, errors } = await open(kind)
const wav = readFileSync(testWav())
const png = readFileSync(join(FIXTURES, 'test-image.png'))
const track = (id, title, artist) => ({ id, title, duration: 60, genre: 'Ambient', play_count: 10, is_streamable: true, user: { name: artist }, artwork: { '480x480': `https://art.test/${id}.png` } })
let calls = 0
await page.route('https://api.audius.co/v1/tracks/search?**', (r) => (calls++, r.fulfill({ json: { data: [track('a1', 'Nieve', 'Blop'), track('a2', 'Bosque', 'Lia'), { id: 'g', title: 'Gated', is_stream_gated: true }] } })))
await page.route('https://api.audius.co/v1/tracks/trending?**', (r) => (calls++, r.fulfill({ json: { data: [track('t1', 'Tendencia', 'DJ')] } })))
await page.route('https://api.audius.co/v1/tracks/*/stream?**', (r) => r.fulfill({ body: wav, contentType: 'audio/wav', headers: { 'Access-Control-Allow-Origin': '*' } }))
await page.route('https://art.test/**', (r) => r.fulfill({ body: png, contentType: 'image/png', headers: { 'Access-Control-Allow-Origin': '*' } }))

const panel = page.locator('.panel.sources')
const queue = page.locator('.panel.queue')
log('Audius contacted before searching:', calls)
await panel.locator('details.audius > summary').click()
await panel.getByRole('searchbox', { name: 'Buscar' }).fill('ambient')
await panel.getByRole('button', { name: 'Buscar', exact: true }).click()
await panel.locator('.audius .radio-row').first().waitFor()
log('results:', await panel.locator('.audius .radio-row').evaluateAll((rows) => rows.map((r) => `${r.querySelector('.radio-name').textContent} [${r.querySelector('.radio-sub').textContent}]`).join(' | ')))

await panel.getByRole('button', { name: /^Nieve/ }).click()
await page.getByRole('button', { name: 'Pausa', exact: true }).first().waitFor({ timeout: 15000 })
await page.waitForTimeout(1500)
log('played:', await page.locator('.panel.player .now-playing').textContent(), '| cover', await page.locator('.panel.player .now-playing img').count())
await panel.getByRole('button', { name: 'Añadir Lia – Bosque a la lista' }).click()
await page.waitForTimeout(1500)
log('list:', (await queue.locator('.track-title').allTextContents()).join(' | '))
await panel.getByRole('button', { name: 'Tendencias' }).click()
await panel.locator('.audius .radio-name', { hasText: 'Tendencia' }).waitFor()
log('trending:', (await panel.locator('.audius .radio-name').allTextContents()).join(' | '))

if (process.env.SPECTRA_REAL_AUDIUS) {
  await page.unrouteAll({ behavior: 'ignoreErrors' })
  await page.reload()
  await page.waitForSelector('.stage canvas')
  await reveal(page)
  await panel.locator('details.audius > summary').click()
  await panel.getByRole('searchbox', { name: 'Buscar' }).fill('ambient')
  await panel.getByRole('button', { name: 'Buscar', exact: true }).click()
  await panel.locator('.audius .radio-row').first().waitFor({ timeout: 20000 })
  log('real results:', await panel.locator('.audius .radio-row').count())
  const before = await queue.locator('.track-title').count()
  // The shortest of the first ten, so the download is quick.
  const pick = await panel.locator('.audius .radio-main').evaluateAll((els) => els.slice(0, 10).map((e, i) => ({ i, sub: e.querySelector('.radio-sub').textContent })).sort((a, b) => (a.sub.match(/(\d+):(\d+)$/)?.slice(1).reduce((m, s) => m * 60 + +s, 0) ?? 1e9) - (b.sub.match(/(\d+):(\d+)$/)?.slice(1).reduce((m, s) => m * 60 + +s, 0) ?? 1e9))[0].i)
  await panel.locator('.audius .radio-main').nth(pick).click()
  await page.waitForFunction((n) => document.querySelectorAll('.panel.queue .track-title').length > n, before, { timeout: 90000 }).catch(() => {})
  await page.waitForTimeout(3000)
  log('real track:', await page.locator('.panel.player .now-playing').textContent(), '| playing', await page.getByRole('button', { name: 'Pausa', exact: true }).count() > 0, '| cover', await page.locator('.panel.player .now-playing img').count())
}

log('errors:', errors.join('\n  ') || 'none')
await browser.close()
