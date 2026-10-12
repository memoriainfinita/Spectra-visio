// Phase 6, part 3: imported ISF and pasted Shadertoy shaders.
import { open, loadTrack, grab, stats, shot, stageError, FIXTURES, reveal } from './lib.mjs'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const kind = process.argv[2] ?? 'firefox'
const { browser, page, errors } = await open(kind)
const log = (...a) => console.log(`[${kind}]`, ...a)
const dir = FIXTURES
const sh = page.locator('.panel.shaders')
const vis = page.locator('.panel.visuals')
const motion = async () => {
  const a = await grab(page)
  await page.waitForTimeout(300)
  const b = await grab(page)
  let m = 0
  for (let k = 0; k < a.length; k += 4) m += Math.abs(a[k] - b[k]) + Math.abs(a[k + 1] - b[k + 1]) + Math.abs(a[k + 2] - b[k + 2])
  return { ...stats(b), motion: +(m / (a.length / 4) / 3).toFixed(1) }
}
const message = () => sh.locator('.shader-message').textContent({ timeout: 2000 }).catch(() => null)
const importFiles = async (names) => {
  const chooser = page.waitForEvent('filechooser')
  await sh.getByRole('button', { name: 'Importar' }).click()
  await (await chooser).setFiles(names.map((n) => join(dir, n)))
  await page.waitForTimeout(800)
}
const paste = async (name, code) => {
  if (!(await sh.getByLabel('Código ISF o Shadertoy').count())) await sh.getByRole('button', { name: 'Pegar código' }).click()
  await sh.getByLabel('Nombre', { exact: true }).fill(name)
  await sh.getByLabel('Código ISF o Shadertoy').fill(code)
  await sh.getByRole('button', { name: 'Añadir' }).click()
  await page.waitForTimeout(500)
}

// Start clean.
await page.evaluate(() => new Promise((r) => { const q = indexedDB.open('keyval-store'); q.onsuccess = () => { const tx = q.result.transaction('keyval', 'readwrite'); tx.objectStore('keyval').delete('shaders'); tx.oncomplete = r } }))
await page.reload()
await page.waitForSelector('.stage canvas')
await reveal(page)
await page.waitForSelector('.panel.shaders')
log('playing:', await loadTrack(page))

await importFiles(['Audio Rings.fs', 'broken.fs'])
log('import message:', JSON.stringify(await message()))
await paste('Not a shader', 'hello world')
log('paste junk:', JSON.stringify(await message()))
await paste('Sound bars', readFileSync(join(dir, 'shadertoy.glsl'), 'utf8'))
log('paste shadertoy:', JSON.stringify(await message()))
log('list:', await sh.locator('.preset-name').allTextContents(), await sh.locator('.preset-sub').allTextContents())

await sh.getByRole('button', { name: 'Poner Audio Rings en la capa 1' }).click()
await page.waitForTimeout(2500)
log('ISF on A', JSON.stringify(await motion()), 'error:', await stageError(page))
log('ISF params:', await vis.locator('.param-name').allTextContents())
await shot(page, `${kind}-isf-rings`)
// The point parameter moves the rings: compare halves before and after.
await vis.getByLabel('Center X', { exact: true }).fill('0.15')
await page.waitForTimeout(1500)
log('center x 0.15', JSON.stringify(await motion()))
await shot(page, `${kind}-isf-rings-left`)

await sh.getByRole('button', { name: 'Poner Sound bars en la capa 1' }).click()
await page.waitForTimeout(2500)
log('Shadertoy on A', JSON.stringify(await motion()), 'error:', await stageError(page))
await shot(page, `${kind}-shadertoy-bars`)

await page.waitForFunction(() => document.querySelectorAll('.panel.browser img').length >= 24, null, { timeout: 60000 }).catch(() => {})
await page.locator('.panel.browser').getByRole('button', { name: 'Shader', exact: true }).click()
log('browser shader category:', await page.locator('.panel.browser .visual-card-name').allTextContents(), 'thumbs', await page.locator('.panel.browser img').count())

await page.reload()
await page.waitForSelector('.stage canvas')
await reveal(page)
await page.waitForSelector('.panel.shaders')
await page.waitForTimeout(1500)
log('after reload:', await sh.locator('.preset-name').allTextContents(), '| layer A:', await vis.locator('.field select').first().evaluate((s) => s.selectedOptions[0].textContent))
log('after reload render', JSON.stringify(await motion()), 'error:', await stageError(page))

await sh.getByRole('button', { name: 'Borrar Sound bars' }).click()
await page.waitForTimeout(800)
log('after delete:', await sh.locator('.preset-name').allTextContents(), '| layer A:', await vis.locator('.field select').first().evaluate((s) => s.selectedOptions[0].textContent))
await sh.getByRole('button', { name: 'Borrar Audio Rings' }).click()
log('errors:', errors.length ? '\n  ' + errors.join('\n  ') : 'none')
await browser.close()
