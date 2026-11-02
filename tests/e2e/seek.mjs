// Seeking while playing: drag and click the seek bar, then check the shown time keeps advancing with the clock.
import { open, loadTrack } from './lib.mjs'

const kind = process.argv[2] ?? 'firefox'
const { browser, page, errors } = await open(kind, { reveal: false })
const log = (...a) => console.log(`[${kind}]`, ...a)
await page.getByRole('tab', { name: 'Bibliotecas' }).click()
await page.getByRole('tab', { name: 'Audio', exact: true }).click()
await loadTrack(page)
await page.getByRole('tab', { name: 'Audio' }).click()
const seek = page.locator('input.seek')
await seek.scrollIntoViewIfNeeded()
const box = await seek.boundingBox()
const shown = () => page.locator('.seek-row .time').first().textContent()
const value = () => seek.evaluate((el) => Number(el.value))
const watch = async (label) => {
  const xs = []
  for (let i = 0; i < 4; i++) { xs.push(`${await shown()}/${(await value()).toFixed(1)}`); await page.waitForTimeout(1000) }
  log(label, xs.join('  '))
}
await page.waitForTimeout(2000)
await watch('start')
// Drag from the thumb to 60 %.
const x0 = box.x + box.width * ((await value()) / Number(await seek.getAttribute("max")))
await page.mouse.move(x0, box.y + box.height / 2)
await page.mouse.down()
for (let i = 1; i <= 10; i++) { await page.mouse.move(x0 + (box.x + box.width * 0.6 - x0) * i / 10, box.y + box.height / 2); await page.waitForTimeout(30) }
await page.mouse.up()
await watch('after drag to 60%')
// Click at 20 %.
await page.mouse.click(box.x + box.width * 0.2, box.y + box.height / 2)
await watch('after click 20%')
// Drag back to 80 % in one move, release quickly.
await page.mouse.move(box.x + box.width * 0.2, box.y + box.height / 2)
await page.mouse.down()
await page.mouse.move(box.x + box.width * 0.8, box.y + box.height / 2, { steps: 3 })
await page.mouse.up()
await watch('after drag to 80%')
log('errors:', errors.length ? '\n  ' + errors.join('\n  ') : 'none')
await browser.close()
