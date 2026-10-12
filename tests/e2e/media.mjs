// Free videos and images from Wikimedia Commons and NASA as the visual input. Both APIs and
// their files are faked through the browser's network with the test video and image; the
// stage must show them through the Visual input visualization. With SPECTRA_REAL_MEDIA=1,
// real searches follow.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { open, reveal, loadTrack, grab, stats, FIXTURES } from './lib.mjs'

const kind = process.argv[2] ?? 'firefox'
const log = (...a) => console.log(`[${kind}]`, ...a)
const { browser, page, errors } = await open(kind)
const video = readFileSync(join(FIXTURES, 'test-video.webm'))
const image = readFileSync(join(FIXTURES, 'test-image.png'))
const cors = { 'Access-Control-Allow-Origin': '*' }
let calls = 0
await page.route('https://commons.wikimedia.org/w/api.php?**', (r) => {
  calls++
  const video = r.request().url().includes('videoinfo')
  const info = video
    ? { videoinfo: [{ url: 'https://upload.wikimedia.org/v/orig.webm', thumburl: 'https://upload.wikimedia.org/v/thumb.png', descriptionurl: 'https://commons.wikimedia.org/wiki/File:Aurora.webm', derivatives: [{ src: 'https://upload.wikimedia.org/v/a.480p.vp9.webm', type: 'video/webm; codecs="vp9"', height: 480 }] }] }
    : { imageinfo: [{ url: 'https://upload.wikimedia.org/i/orig.png', thumburl: 'https://upload.wikimedia.org/i/320px-thumb.png', descriptionurl: 'https://commons.wikimedia.org/wiki/File:Nebula.png', width: 800 }] }
  return r.fulfill({ json: { query: { pages: { 7: { pageid: 7, title: video ? 'File:Aurora boreal.webm' : 'File:Nebulosa.png', ...info } } } }, headers: cors })
})
await page.route('https://images-api.nasa.gov/search?**', (r) => (calls++, r.fulfill({ json: { collection: { items: [{ href: 'https://images-assets.nasa.gov/video/N1/collection.json', data: [{ nasa_id: 'N1', title: 'Galaxia NASA' }], links: [{ href: 'http://images-assets.nasa.gov/video/N1/N1~thumb.jpg', rel: 'preview' }] }] } }, headers: cors })))
await page.route('https://images-assets.nasa.gov/video/N1/collection.json', (r) => r.fulfill({ json: ['http://images-assets.nasa.gov/video/N1/N1~orig.mp4', 'http://images-assets.nasa.gov/video/N1/N1~medium.mp4'], headers: cors }))
await page.route(/(upload\.wikimedia\.org\/v\/.*\.webm|images-assets\.nasa\.gov\/video\/N1\/N1~medium\.mp4)/, (r) => r.fulfill({ body: video, contentType: 'video/webm', headers: cors }))
await page.route(/(upload\.wikimedia\.org\/(i|v)\/.*\.png|images-assets\.nasa\.gov\/.*\.jpg)/, (r) => r.fulfill({ body: image, contentType: 'image/png', headers: cors }))

const panel = page.locator('.panel.visual-input')
const status = () => panel.getByRole('status').textContent()
await loadTrack(page)
await page.locator('.panel.browser').getByRole('button', { name: 'Poner Entrada visual en la capa 1' }).click()
await page.waitForTimeout(800)
const dark = stats(await grab(page)).mean
log('contacted before searching:', calls)
await panel.getByRole('button', { name: 'Vídeo e imagen libres' }).click()
await panel.getByRole('searchbox', { name: 'Buscar' }).fill('aurora')
await panel.getByRole('button', { name: 'Buscar', exact: true }).click()
await panel.locator('.media-item').first().waitFor()
log('commons video results:', (await panel.locator('.media-item span').allTextContents()).join(' | '))
await panel.locator('.media-item').first().click()
await page.waitForFunction(() => document.querySelector('.panel.visual-input [role=status]')?.textContent.startsWith('Vídeo'), null, { timeout: 15000 })
await page.waitForTimeout(800)
log('opened:', await status(), '| page link', await panel.getByRole('link', { name: /Página del archivo/ }).getAttribute('href'), '| stage', dark.toFixed(1), '->', stats(await grab(page)).mean.toFixed(1))

await panel.getByRole('button', { name: 'Imagen', exact: true }).click()
await panel.getByRole('button', { name: 'Buscar', exact: true }).click()
await panel.locator('.media-item span', { hasText: 'Nebulosa' }).waitFor()
await panel.locator('.media-item').first().click()
await page.waitForFunction(() => document.querySelector('.panel.visual-input [role=status]')?.textContent.startsWith('Imagen'), null, { timeout: 15000 })
log('commons image:', await status())

await panel.getByRole('button', { name: 'NASA' }).click()
log('NASA image button disabled:', await panel.getByRole('button', { name: 'Imagen', exact: true }).isDisabled(), '| type now', await panel.locator('.media [aria-pressed=true]').allTextContents())
await panel.getByRole('button', { name: 'Buscar', exact: true }).click()
await panel.locator('.media-item span', { hasText: 'Galaxia' }).waitFor()
await panel.locator('.media-item').first().click()
await page.waitForFunction(() => document.querySelector('.panel.visual-input [role=status]')?.textContent.includes('Galaxia'), null, { timeout: 15000 })
log('nasa video:', await status(), '| thumb', await panel.locator('.media-item img').first().getAttribute('src'))

if (process.env.SPECTRA_REAL_MEDIA) {
  await page.unrouteAll({ behavior: 'ignoreErrors' })
  for (const [source, type, q] of [['Wikimedia Commons', 'Vídeo', 'aurora'], ['NASA', 'Vídeo', 'aurora'], ['Wikimedia Commons', 'Imagen', 'nebula']]) {
    await panel.getByRole('button', { name: source, exact: true }).click()
    await panel.getByRole('button', { name: type, exact: true }).click()
    await panel.getByRole('searchbox', { name: 'Buscar' }).fill(q)
    await panel.getByRole('button', { name: 'Buscar', exact: true }).click()
    await panel.locator('.media-item').first().waitFor({ timeout: 20000 })
    const n = await panel.locator('.media-item').count()
    const was = await status()
    await panel.locator('.media-item').first().click()
    await page.waitForFunction((was) => { const s = document.querySelector('.panel.visual-input [role=status]')?.textContent ?? ''; return s !== was || document.querySelector('.panel.visual-input .error') }, was, { timeout: 60000 }).catch(() => {})
    await page.waitForTimeout(1000)
    log(`real ${source} ${type} "${q}": ${n} results ->`, await status(), '| stage', stats(await grab(page)).mean.toFixed(1), '|', (await panel.locator('.error').allTextContents()).join(' '))
  }
}

log('errors:', errors.join('\n  ') || 'none')
await browser.close()
