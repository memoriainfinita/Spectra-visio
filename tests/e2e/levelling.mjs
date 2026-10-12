// Volume levelling between tracks: two tones 18 dB apart (-9 and -27 LUFS). Levelled, the
// loud one comes down 5 dB to -14 and the quiet one goes up the most allowed, 6 dB, so they
// end 7 dB apart; without levelling, 18. Read from the input level meter, which shows what
// the analysers hear.
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { open, OUT, reveal } from './lib.mjs'

const kind = process.argv[2] ?? 'chrome'
const log = (...a) => console.log(`[${kind}]`, ...a)

function tone(name, amplitude) {
  const path = join(OUT, name)
  const rate = 44100, n = rate * 12
  const buf = Buffer.alloc(44 + n * 2)
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8)
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22)
  buf.writeUInt32LE(rate, 24); buf.writeUInt32LE(rate * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34)
  buf.write('data', 36); buf.writeUInt32LE(n * 2, 40)
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.round(amplitude * Math.sin(2 * Math.PI * 997 * (i / rate)) * 32767), 44 + i * 2)
  writeFileSync(path, buf)
  return path
}

const { browser, page, errors } = await open(kind)
const chooser = page.waitForEvent('filechooser')
await page.getByRole('button', { name: 'Añadir archivos' }).first().click()
await (await chooser).setFiles([tone('loud.wav', 0.5), tone('quiet.wav', 0.0625)])
await page.waitForTimeout(6000)

// Mean filled width of the meter's left bar over a second, as a fraction.
const meter = () => page.evaluate(() => new Promise((resolve) => {
  const canvas = document.querySelector('.meter canvas')
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  const values = []
  const t0 = performance.now()
  const step = () => {
    const row = ctx.getImageData(0, 4, canvas.width, 1).data
    let filled = 0
    for (let x = 0; x < canvas.width; x++) if (row[x * 4 + 2] > 200 && row[x * 4] < 160) filled = x + 1
    values.push(filled / canvas.width)
    if (performance.now() - t0 < 1000) requestAnimationFrame(step)
    else resolve(values.reduce((a, b) => a + b, 0) / values.length)
  }
  requestAnimationFrame(step)
}))
const db = (a, b) => (20 * Math.log10(a / b)).toFixed(1)
const play = async (name) => {
  await page.locator('.panel.queue').getByRole('button', { name: new RegExp(`^${name}`) }).click()
  await page.waitForTimeout(1500)
  return meter()
}

const normalize = page.getByLabel('Igualar volumen')
log('levelling on by default:', await normalize.isChecked())
const loudOn = await play('loud')
const quietOn = await play('quiet')
log(`on: loud ${loudOn.toFixed(3)} | quiet ${quietOn.toFixed(3)} | apart ${db(loudOn, quietOn)} dB (expected about 7)`)
await normalize.uncheck()
await page.waitForTimeout(1500)
const quietOff = await meter()
const loudOff = await play('loud')
log(`off: loud ${loudOff.toFixed(3)} | quiet ${quietOff.toFixed(3)} | apart ${db(loudOff, quietOff)} dB (expected about 18)`)
log(`loud track came down ${db(loudOff, loudOn)} dB (expected 5)`)
await page.reload()
await page.waitForSelector('.stage canvas')
await reveal(page)
log('setting kept after reload (off):', !(await page.getByLabel('Igualar volumen').isChecked()))
await page.getByLabel('Igualar volumen').check()
// Reading the app's meter canvas from here makes Chrome suggest willReadFrequently.
log('errors:', errors.filter((e) => !e.includes('willReadFrequently')).join('\n  ') || 'none')
await browser.close()
