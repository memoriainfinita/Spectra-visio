// Lyrics from LRCLIB and covers through MusicBrainz for a track that has neither. The
// services are faked through the browser's network; the test file is named
// "Daft Punk - One More Time" and has no tags. Off by default: nothing is asked until turned
// on in Settings. With SPECTRA_REAL_LOOKUP=1, the real services follow.
import { copyFileSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { open, reveal, testWav, FIXTURES, OUT } from './lib.mjs'

const kind = process.argv[2] ?? 'firefox'
const log = (...a) => console.log(`[${kind}]`, ...a)
const file = join(OUT, 'Daft Punk - One More Time.wav')
copyFileSync(testWav(), file)
const png = readFileSync(join(FIXTURES, 'test-image.png'))
const { browser, page, errors } = await open(kind)
const calls = { lrclib: 0, mb: 0, caa: 0 }
const fake = async () => {
  await page.route('https://lrclib.net/api/get?**', (r) => (calls.lrclib++, r.fulfill({ json: { syncedLyrics: '[00:00.50] One more time\n[00:02.00] We gonna celebrate', plainLyrics: 'x' }, headers: { 'Access-Control-Allow-Origin': '*' } })))
  await page.route('https://musicbrainz.org/ws/2/recording/?**', (r) => (calls.mb++, r.fulfill({ json: { recordings: [{ score: 100, releases: [{ 'release-group': { id: 'none' } }, { 'release-group': { id: 'rg1' } }] }] }, headers: { 'Access-Control-Allow-Origin': '*' } })))
  await page.route('https://coverartarchive.org/release-group/**', (r) => (calls.caa++, r.request().url().includes('/rg1/') ? r.fulfill({ body: png, contentType: 'image/png' }) : r.fulfill({ status: 404, body: 'not found' })))
}
if (!process.env.SPECTRA_REAL_LOOKUP) await fake()

const add = async () => {
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Añadir archivos' }).first().click()
  await (await chooser).setFiles(file)
  await page.waitForTimeout(1500)
}
const state = async () => ({
  lyrics: await page.locator('.panel.overlays').getByText(/letra/).first().textContent(),
  cover: await page.locator('.panel.player .now-playing img').getAttribute('src').catch(() => null),
  calls: JSON.stringify(calls),
})
await add()
log('off:', JSON.stringify(await state()))
await page.locator('.panel.settings-online').getByLabel(/letra sincronizada/).check()
await page.locator('.panel.settings-online').getByLabel(/carátula/).check()
await page.waitForFunction(() => document.querySelector('.panel.player .now-playing img'), null, { timeout: 30000 }).catch(() => {})
await page.waitForTimeout(1500)
log('on:', JSON.stringify(await state()))
await page.reload()
await page.waitForSelector('.stage canvas')
await reveal(page)
await page.waitForTimeout(2000)
log('after reload (file not kept):', JSON.stringify(await state()))
await add()
await page.waitForTimeout(2500)
log('added again:', JSON.stringify(await state()))
log('errors:', errors.filter((e) => !/404|NotFound/i.test(e)).join('\n  ') || 'none')
await browser.close()
