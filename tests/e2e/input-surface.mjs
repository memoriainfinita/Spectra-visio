// A new visual input is made to be seen: the layer gets the input visualization, and a
// crossfader that hides the layer is said in a notice (never moved).
import { open, pickLayer, expandSource, FIXTURES } from './lib.mjs'
import { join } from 'node:path'

const kind = process.argv[2] ?? 'firefox'
const log = (...a) => console.log(`[${kind}]`, ...a)
const { browser, page, errors } = await open(kind, {})
const content = () => page.locator('#insp-layer').getByRole('group', { name: 'Contenido' }).getByRole('button', { name: 'Fuente visual', exact: true }).getAttribute('aria-pressed')
const visual = () => page.locator('.layer.selected .layer-pick').textContent()
const notice = () => page.locator('.notices p').textContent().catch(() => '')
const openFile = async (name) => {
  const panel = await expandSource(page)
  const chooser = page.waitForEvent('filechooser')
  await panel.getByRole('button', { name: 'Imagen o vídeo' }).click()
  await (await chooser).setFiles(join(FIXTURES, name))
  await page.waitForTimeout(1200)
}
const check = (name, ok) => log(ok ? 'PASS' : 'FAIL', name)

// Layer 2 is on side B and the crossfader starts on A: it is switched and the fader is named.
await pickLayer(page, 2)
log('layer 2 before:', await visual())
await openFile('test-image.png')
const after2 = await visual()
const n2 = await notice()
log('layer 2 after:', after2, '|', n2)
check('layer 2 shows the input', /Fuente visual/.test(after2) && (await content()) === 'true')
check('notice says layer 2 is hidden by the crossfader', /capa 2/.test(n2) && /crossfader oculta el lado B/.test(n2))

// The same layer again: already the input, so only the hidden side is said.
await page.waitForTimeout(2700)
await openFile('test-video.webm')
const again = await notice()
log('layer 2 again:', again)
check('already the input: only the crossfader is mentioned', /El crossfader oculta el lado B/.test(again) && !/muestra/.test(again))

// Layer 1 is on side A, in view: switched, nothing about the crossfader.
await page.waitForTimeout(2700)
await pickLayer(page, 1)
log('layer 1 before:', await visual())
await openFile('test-image.png')
const after1 = await visual()
const n1 = await notice()
log('layer 1 after:', after1, '|', n1)
check('layer 1 shows the input', /Fuente visual/.test(after1) && (await content()) === 'true')
check('notice only says layer 1 shows it', /La capa 1 muestra ahora/.test(n1) && !/crossfader/.test(n1))

// The crossfader was not moved.
const fader = await page.locator('.perform-bar input[type=range]').inputValue()
check('crossfader untouched (A)', Number(fader) === 0)

log('page errors:', errors.length ? errors.join(' | ') : 'none')
await browser.close()
