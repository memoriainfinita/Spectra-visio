// A microphone that sends exact silence is reported once, after about six seconds.
import { open } from './lib.mjs'

const kind = process.argv[2] ?? 'firefox'
const log = (...a) => console.log(`[${kind}]`, ...a)
const { browser, page, errors } = await open(kind, {
  // A microphone made of nothing: a stream with no source, all zeros.
  init: () => {
    navigator.mediaDevices.getUserMedia = async () => {
      const ctx = new AudioContext()
      return ctx.createMediaStreamDestination().stream
    }
  },
})

await page.getByRole('radio', { name: 'Micrófono', exact: true }).first().click().catch(async () => {
  await page.getByRole('button', { name: 'Micrófono', exact: true }).first().click()
})
const notice = page.locator('.notices p')
await page.waitForTimeout(3000)
log('after 3 s:', await notice.count())
await page.waitForTimeout(5000)
const text = (await notice.count()) ? await notice.first().textContent() : null
log('after 8 s:', text)
if (!text || !text.includes('micrófono')) log('FAIL no silence notice')
await page.waitForTimeout(10000)
log('after 18 s (gone, not repeated):', await notice.count())
if (await notice.count()) log('FAIL notice repeated or stuck')
log('errors:', errors.length ? errors.join('\n  ') : 'none')
await browser.close()
