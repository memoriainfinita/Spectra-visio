// Phase 10: everything reachable with Tab, with a name and a visible focus ring.
import { open, loadTrack } from './lib.mjs'

const kind = process.argv[2] ?? 'chrome'
const log = (...a) => console.log(`[${kind}]`, ...a)
const { browser, page, errors } = await open(kind)
await loadTrack(page)
// Open every collapsed section so its controls count.
await page.evaluate(() => document.querySelectorAll('details').forEach((d) => (d.open = true)))
await page.waitForTimeout(300)

const describe = () => page.evaluate(() => {
  const el = document.activeElement
  if (!el || el === document.body) return null
  const labelled = el.getAttribute('aria-labelledby')
  const name = (el.getAttribute('aria-label') || (labelled && document.getElementById(labelled)?.textContent) || [...(el.labels ?? [])].map((l) => l.textContent).join(' ') || el.textContent || el.getAttribute('title') || el.getAttribute('placeholder') || '').trim()
  const cs = getComputedStyle(el)
  const ring = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0
  if (!el.dataset.k) el.dataset.k = String(Math.random())
  return { key: el.dataset.k, tag: el.tagName.toLowerCase() + (el.type ? `[${el.type}]` : ''), name: name.slice(0, 40), ring, panel: el.closest('section')?.className ?? '' }
})

// Start before the first control: a click on the title sets where Tab starts from, and the
// first Tab lands on the first control, with a visible ring.
await page.locator('.topbar h1').click()
await page.keyboard.press('Tab')
const seen = new Map()
{ const d = await describe(); seen.set(d.key, d) }
let i = 0
for (; i < 800; i++) {
  await page.keyboard.press('Tab')
  const d = await describe()
  if (!d) continue
  if (seen.has(d.key)) break
  seen.set(d.key, d)
}
const all = [...seen.values()]
const interactive = await page.evaluate(() => [...document.querySelectorAll('button:not(:disabled), select:not(:disabled), input:not(:disabled):not([type=hidden]), textarea, summary, a[href]')].filter((el) => {
  const r = el.getBoundingClientRect()
  return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'
}).length)
log('tab stops', all.length, 'of', interactive, 'visible enabled controls (radio groups count once)')
log('without name:', JSON.stringify(all.filter((d) => !d.name).map((d) => `${d.tag} in ${d.panel}`)))
log('without focus ring:', JSON.stringify(all.filter((d) => !d.ring).map((d) => `${d.tag} ${d.name} in ${d.panel}`).slice(0, 20)))

// Controls that the mouse reaches but Tab does not.
const missed = await page.evaluate((keys) => [...document.querySelectorAll('button:not(:disabled), select:not(:disabled), input:not(:disabled):not([type=hidden]), textarea, summary')].filter((el) => {
  const r = el.getBoundingClientRect()
  return r.width > 0 && r.height > 0 && !keys.includes(el.dataset.k) && el.type !== 'radio' && el.type !== 'file' && !(el.getAttribute('role') === 'tab' && el.getAttribute('aria-selected') !== 'true')
}).map((el) => `${el.tagName.toLowerCase()}[${el.type ?? ''}] ${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 30)} in ${el.closest('section')?.className}`), all.map((d) => d.key))
log('not reached by Tab:', missed.length, JSON.stringify(missed.slice(0, 20)))
log('errors:', errors.filter((e) => !e.includes('WebGL context was lost')).join('\n  ') || 'none')
await browser.close()
