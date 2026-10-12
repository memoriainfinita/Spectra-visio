// Wide layout: side tabs by mouse and keyboard, the tab kept after reload, the perform bar
// driving the same state as the panels, and the stage surviving the breakpoint.
import { open, loadTrack } from './lib.mjs'

const kind = process.argv[2] ?? 'chrome'
const log = (...a) => console.log(`[${kind}]`, ...a)
const { browser, page, errors } = await open(kind, { reveal: false })
const tab = (name) => page.getByRole('tab', { name })
const shown = () => page.evaluate(() => document.querySelector('[role=tabpanel]:not([hidden])')?.id)

log('default tab:', await shown(), '| page scroll', await page.evaluate(() => document.documentElement.scrollHeight - innerHeight))
await tab('Audio').click()
await loadTrack(page)
log('audio tab:', await shown(), '| app', await page.evaluate(() => document.querySelector('.app').className + ' ' + innerWidth + ' tabs ' + document.querySelectorAll('[role=tab]').length + ' fs ' + !!document.fullscreenElement))
await tab('Audio').focus()
await page.keyboard.press('ArrowRight')
await page.keyboard.press('ArrowRight')
log('two arrows right:', await shown(), '| focused', await page.evaluate(() => document.activeElement?.textContent))
await page.keyboard.press('End')
log('End:', await shown())
await page.reload()
await page.waitForSelector('.stage canvas')
log('after reload:', await shown())

// Perform bar and the Live panel share the state.
await tab('Directo').click()
const bar = page.locator('.perform-bar')
await bar.getByRole('button', { name: 'Apagón' }).click()
log('blackout from bar -> live panel pressed:', await page.locator('.panel.live').getByRole('button', { name: 'Apagón' }).getAttribute('aria-pressed'))
await bar.getByRole('button', { name: 'Apagón' }).click()
await bar.getByRole('button', { name: /^Automático/ }).click()
log('auto from bar -> auto panel:', await page.locator('.panel.auto .panel-head .btn').textContent())
await bar.getByRole('button', { name: /^Automático/ }).click()
await page.locator('.panel.live').getByLabel('Reducir destellos').check()
log('reduce flashes -> bar strobe disabled:', await bar.getByRole('button', { name: 'Estrobo' }).isDisabled())
await page.locator('.panel.live').getByLabel('Reducir destellos').uncheck()

// Crossing the breakpoint keeps the same stage canvas.
await page.evaluate(() => { document.querySelector('.stage canvas').dataset.k = 'same' })
await page.setViewportSize({ width: 700, height: 900 })
await page.waitForTimeout(500)
log('narrow: tabs', await page.getByRole('tablist').count(), '| panels', await page.locator('section.panel').count(), '| same canvas', await page.locator('.stage canvas[data-k=same]').count())
await page.setViewportSize({ width: 1600, height: 1000 })
await page.waitForTimeout(500)
log('wide again: tabs', await page.getByRole('tablist').count(), '| same canvas', await page.locator('.stage canvas[data-k=same]').count(), '| tab', await shown())
log('errors:', errors.filter((e) => !e.includes('WebGL')).join('\n  ') || 'none')
await browser.close()
