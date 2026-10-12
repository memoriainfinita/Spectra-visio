// Desktop layout: full-page screenshots at common widths, plus the panel boxes.
import { open, loadTrack, OUT } from './lib.mjs'

const kind = process.argv[2] ?? 'firefox'
const widths = (process.argv[3] ?? '1920,1440,1280').split(',').map(Number)
for (const w of widths) {
  const { browser, page, errors } = await open(kind, { reveal: false, viewport: { width: w, height: w >= 1900 ? 1080 : 900 } })
  if (await page.getByRole('tab', { name: 'Audio' }).count()) await page.getByRole('tab', { name: 'Audio' }).click()
  await loadTrack(page)
  if (await page.getByRole('tab', { name: 'Imagen' }).count()) await page.getByRole('tab', { name: 'Imagen' }).click()
  await page.waitForTimeout(800)
  await page.screenshot({ path: `${OUT}/layout-${kind}-${w}.png`, fullPage: true })
  const boxes = await page.evaluate(() => {
    const out = []
    const grid = document.querySelector('.stage')?.parentElement
    for (const el of document.querySelectorAll('section.panel:not([hidden] *), .stage, .topbar, .side, .side-body:not([hidden])')) {
      const r = el.getBoundingClientRect()
      out.push(`${el.className.padEnd(26)} x${Math.round(r.x)} y${Math.round(r.y + scrollY)} w${Math.round(r.width)} h${Math.round(r.height)}`)
    }
    return { page: `${document.documentElement.scrollWidth}x${document.documentElement.scrollHeight}`, grid: grid ? getComputedStyle(grid).gridTemplateColumns + ' | ' + grid.className : '', out }
  })
  console.log(`[${kind} ${w}] page ${boxes.page} grid ${boxes.grid}\n  ` + boxes.out.join('\n  '))
  console.log('  errors:', errors.join(' | ') || 'none')
  await browser.close()
}
