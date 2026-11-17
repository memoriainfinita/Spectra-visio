// The example scene: it loads from the presets panel, draws something that moves, every column
// keeps drawing when launched, and Ctrl Z brings the previous scene back.
import { open, loadTrack, grab, stats } from './lib.mjs'

const kind = process.argv[2] ?? 'firefox'
const log = (...a) => console.log(`[${kind}]`, ...a)
const { browser, page, errors } = await open(kind, {})
const panel = page.locator('.panel.presets')
const layers = () => page.locator('.layer').count()
const check = (name, ok) => log(ok ? 'PASS' : 'FAIL', name)
const motion = async () => {
  const a = await grab(page)
  await page.waitForTimeout(500)
  const b = await grab(page)
  let m = 0
  for (let k = 0; k < a.length; k += 4) m += Math.abs(a[k] - b[k]) + Math.abs(a[k + 1] - b[k + 1]) + Math.abs(a[k + 2] - b[k + 2])
  return { ...stats(b), motion: +(m / (a.length / 4) / 3).toFixed(1) }
}

log('playing:', await loadTrack(page))
const before = await layers()
log('layers before:', before)

const name = 'Espectáculo'
await panel.getByRole('button', { name }).click()
// Read the toast right away: it is gone by the time the frames are measured.
const notice = (await page.locator('.notices p', { hasText: 'Escena cargada' }).first().textContent({ timeout: 4000 }).catch(() => '')) ?? ''
await page.waitForTimeout(1500)
const got = await layers()
const m = await motion()
log(name, '| layers', got, '|', JSON.stringify(m), '|', notice)
check(`${name}: 3 layers`, got === 3)
check(`${name}: draws something`, m.mean > 2 && m.motion > 0.3)
check(`${name}: notice`, /Escena cargada/.test(notice))
check(`${name}: eight named columns`, (await page.locator('.clip-col-name', { hasText: 'Amanecer' }).count()) > 0)

// Launching a column keeps drawing, in every one of them (a launch is one more step to undo).
for (const key of ['1', '2', '3', '4', '5', '6', '7', '8']) {
  await page.keyboard.press(key)
  await page.waitForTimeout(1800)
  const after = await motion()
  check(`${name}: column ${key} draws`, after.mean > 2 && after.motion > 0.3)
}

// Undo the launches and the load: the scene from before the demo comes back.
for (let k = 0; k < 20 && (await page.locator('.clip-col-name', { hasText: 'Amanecer' }).count()) > 0; k++) {
  await page.keyboard.press('Control+z')
  await page.waitForTimeout(150)
}
check('Ctrl Z brings the previous scene back', (await layers()) === before && (await page.locator('.clip-col-name', { hasText: 'Amanecer' }).count()) === 0)

log('page errors:', errors.length ? errors.join(' | ') : 'none')
await browser.close()
