// Folded panels in the Visuals tab: closed by default, open on click, remembered, and the
// subtitle is the tagline.
import { open, OUT } from './lib.mjs'

const kind = process.argv[2] ?? 'chrome'
const log = (...a) => console.log(`[${kind}]`, ...a)
const { browser, page, errors } = await open(kind, { reveal: false })
log('subtitle:', await page.locator('.topbar p').textContent())
await page.getByRole('tab', { name: 'Imagen' }).click()
const folds = () => page.evaluate(() => [...document.querySelectorAll('details.fold')].map((d) => `${d.querySelector('summary').textContent}:${d.open ? 'open' : 'closed'}`).join(', '))
log('folds:', await folds())
await page.locator('details.fold > summary', { hasText: 'Shaders' }).click()
log('shaders open, paste button visible:', await page.locator('.panel.shaders').getByRole('button', { name: 'Pegar código' }).isVisible(), '| h2 hidden:', await page.locator('.panel.shaders h2').isHidden())
await page.locator('.side-body:not([hidden])').evaluate((el) => { el.scrollTop = el.scrollHeight })
await page.screenshot({ path: `${OUT}/fold-${kind}.png` })
await page.reload()
await page.waitForSelector('.stage canvas')
log('after reload:', await folds())
log('errors:', errors.filter((e) => !e.includes('WebGL')).join('\n  ') || 'none')
await browser.close()
