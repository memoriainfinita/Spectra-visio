// Docked layout: full-page screenshots at common widths, plus the boxes of the zones and
// the docks. 1024 gets the laptop layout, the others the desktop one.
import { open, loadTrack, OUT } from './lib.mjs'

const kind = process.argv[2] ?? 'firefox'
const widths = (process.argv[3] ?? '1920,1440,1280,1024').split(',').map(Number)
for (const w of widths) {
  const { browser, page, errors } = await open(kind, { reveal: false, viewport: { width: w, height: w >= 1900 ? 1080 : w >= 1280 ? 900 : 768 } })
  await page.getByRole('tab', { name: 'Bibliotecas' }).click()
  await page.getByRole('tab', { name: 'Audio', exact: true }).click()
  await loadTrack(page)
  await page.getByRole('tab', { name: 'Visualizaciones' }).click()
  await page.waitForTimeout(800)
  await page.screenshot({ path: `${OUT}/layout-${kind}-${w}.png` })
  const boxes = await page.evaluate(() => {
    const out = []
    for (const el of document.querySelectorAll('.topbar, .stage, .dock-zone, .dock-stack')) {
      const r = el.getBoundingClientRect()
      const name = el.classList.contains('dock-stack') ? 'stack ' + el.getAttribute('aria-label') : el.className
      out.push(`${name.padEnd(30)} x${Math.round(r.x)} y${Math.round(r.y)} w${Math.round(r.width)} h${Math.round(r.height)}`)
    }
    return { page: `${document.documentElement.scrollWidth}x${document.documentElement.scrollHeight}`, view: `${innerWidth}x${innerHeight}`, out }
  })
  console.log(`[${kind} ${w}] page ${boxes.page} view ${boxes.view}\n  ` + boxes.out.join('\n  '))
  console.log('  errors:', errors.join(' | ') || 'none')
  await browser.close()
}
