// Phase 10: phone layout and touch gestures on the stage.
import { open, loadTrack } from './lib.mjs'

const kind = process.argv[2] ?? 'chrome'
const log = (...a) => console.log(`[${kind}]`, ...a)
const { browser, page, errors } = await open(kind, {
  viewport: { width: 390, height: 844 },
  contextOptions: { hasTouch: true, deviceScaleFactor: 3, ...(kind === 'chrome' ? { isMobile: true } : {}) },
})

log('coarse pointer', await page.evaluate(() => matchMedia('(pointer: coarse)').matches), '| page wider than screen', await page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
// Visible controls under 44 px tall or wide.
const small = await page.evaluate(() => {
  const out = []
  for (const el of document.querySelectorAll('button, select, input:not([type=hidden]), summary')) {
    const r = el.getBoundingClientRect()
    if (!r.width || !r.height || getComputedStyle(el).visibility === 'hidden') continue
    if (el.matches('input[type=checkbox], input[type=radio]')) {
      const label = el.closest('label')?.getBoundingClientRect()
      if (label && label.height >= 44) continue
    }
    if (r.height < 44 || (r.width < 44 && !el.matches('input[type=range]'))) out.push(`${el.tagName.toLowerCase()}${el.className ? '.' + String(el.className).split(' ')[0] : ''} ${Math.round(r.width)}x${Math.round(r.height)} ${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 24)}`)
  }
  return out
})
log('controls under 44 px:', small.length, small.slice(0, 40))

log('playing:', await loadTrack(page))
const current = () => page.locator('.layer.selected .layer-pick').textContent()
const stage = page.locator('.stage')
await stage.scrollIntoViewIfNeeded()
const box = await stage.boundingBox()
const cx = box.x + box.width / 2, cy = box.y + box.height / 2

// Synthetic touch pointer events: Playwright's touchscreen only taps.
const swipe = (dx) => page.evaluate(({ cx, cy, dx }) => new Promise((resolve) => {
  const el = document.querySelector('.stage canvas')
  const ev = (type, x, t) => el.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerType: 'touch', isPrimary: true, pointerId: 7, clientX: x, clientY: cy }))
  ev('pointerdown', cx)
  setTimeout(() => { ev('pointerup', cx + dx); resolve() }, 200)
}), { cx, cy, dx })

const v0 = await current()
await swipe(-150)
await page.waitForTimeout(300)
const v1 = await current()
await swipe(150)
await page.waitForTimeout(300)
log('swipe left:', v0, '->', v1, '| swipe right back:', await current())
await swipe(-20)
await page.waitForTimeout(300)
log('short drag keeps it:', await current())

// Tap: the bar; its blackout; it hides by itself.
await page.touchscreen.tap(cx, cy)
await page.waitForTimeout(500)
log('tap: bar shown', await page.locator('.touch-bar').isVisible())
await page.locator('.touch-bar').getByRole('button', { name: 'Apagón' }).tap()
await page.waitForTimeout(200)
log('blackout from the bar', await page.locator('.touch-bar').getByRole('button', { name: 'Apagón' }).getAttribute('aria-pressed'))
await page.locator('.touch-bar').getByRole('button', { name: 'Apagón' }).tap()
await page.waitForTimeout(4500)
log('bar after 4.5 s', await page.locator('.touch-bar').count())

// Double tap: full screen, and back.
await page.touchscreen.tap(cx, cy)
await page.waitForTimeout(80)
await page.touchscreen.tap(cx, cy)
await page.waitForTimeout(600)
log('double tap: fullscreen', await page.evaluate(() => !!document.fullscreenElement), '| bar', await page.locator('.touch-bar').count())
await page.evaluate(() => document.exitFullscreen?.().catch(() => {}))

// Long help: a tap shows its bubble, another one hides it.
const hint = page.locator('.panel.clips .hint')
// Taps at the button's place: the locator's own tap scrolls first, and a scroll closes it.
await hint.locator('.hint-button').scrollIntoViewIfNeeded()
const hb = await hint.locator('.hint-button').boundingBox()
const tapHint = () => page.touchscreen.tap(hb.x + hb.width / 2, hb.y + hb.height / 2)
await tapHint()
const tipBox = await hint.locator('[role=tooltip]').boundingBox()
log('help tap:', await hint.locator('[role=tooltip]').isVisible(), '| fits the screen:', !!tipBox && tipBox.x >= 0 && tipBox.x + tipBox.width <= 390)
await tapHint()
log('help tap again:', await hint.locator('[role=tooltip]').isVisible())
log('errors:', errors.filter((e) => !e.includes('WebGL context was lost')).join('\n  ') || 'none')
await browser.close()
