// Example scenes: each loads from the presets panel, draws something that moves, and Ctrl Z
// brings the previous scene back.
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

const expected = { 'Primeros pasos': 3, 'Fuentes de modulación': 4, 'Moduladores y mandos': 3, 'Todos los efectos': 2, 'Clips y directo': 2, 'Todas las visualizaciones': 3 }
for (const [name, n] of Object.entries(expected)) {
  await panel.getByRole('button', { name }).click()
  await page.waitForTimeout(1500)
  const got = await layers()
  const m = await motion()
  const notice = (await page.locator('.notices p', { hasText: 'Escena cargada' }).first().textContent().catch(() => '')) ?? ''
  log(name, '| layers', got, '|', JSON.stringify(m), '|', notice)
  check(`${name}: ${n} layers`, got === n)
  check(`${name}: draws something`, m.mean > 2 && m.motion > 0.3)
  check(`${name}: notice`, /Escena cargada/.test(notice))
  // The scene made of effects: launching columns keeps drawing.
  if (name === 'Todos los efectos') {
    for (const key of ['2', '4', '8']) {
      await page.keyboard.press(key)
      await page.waitForTimeout(1800)
      const after = await motion()
      check(`${name}: column ${key} draws`, after.mean > 2 && after.motion > 0.3)
    }
  }
}

// Undo goes back to the scene before the last demo: Todas las visualizaciones -> Clips y directo.
await page.keyboard.press('Control+z')
await page.waitForTimeout(500)
check('Ctrl Z brings the previous scene back', (await layers()) === expected['Clips y directo'])

// The gallery again, now to launch its clips (a launch is one more step to undo, so after the undo check).
await panel.getByRole('button', { name: 'Todas las visualizaciones' }).click()
for (const key of ['2', '4', '7']) {
  await page.keyboard.press(key)
  await page.waitForTimeout(1800)
  const after = await motion()
  check(`Todas las visualizaciones: column ${key} draws`, after.mean > 2 && after.motion > 0.3)
}

log('page errors:', errors.length ? errors.join(' | ') : 'none')
await browser.close()
