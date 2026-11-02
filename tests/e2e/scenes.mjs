// Saved scenes: the whole composition under a name, loaded back over another one, kept after
// a reload, deleted, and Ctrl Z undoes a load.
import { open, reveal } from './lib.mjs'

const kind = process.argv[2] ?? 'firefox'
const log = (...a) => console.log(`[${kind}]`, ...a)
const check = (name, ok) => log(ok ? 'PASS' : 'FAIL', name)
const { browser, page, errors } = await open(kind, {})
const panel = page.locator('.panel.presets')
const layers = () => page.locator('.panel.visuals .layer').count()

// The scene the user made: the starting one plus two more layers.
const start = await layers()
await page.locator('.panel.visuals').getByRole('button', { name: 'Añadir capa' }).click()
await page.locator('.panel.visuals').getByRole('button', { name: 'Añadir capa' }).click()
const mine = await layers()
check('two layers were added', mine === start + 2)

await panel.getByLabel('Nombre de la escena').fill('Mi escena')
await panel.getByRole('button', { name: 'Guardar escena' }).click()
check('saved scene is listed', (await panel.getByRole('button', { name: /^Mi escena/ }).count()) === 1)
check('it says how many layers', /\b\d+ capas/.test(await panel.locator('.preset', { hasText: 'Mi escena' }).innerText()))

// Another scene replaces it, and the saved one brings it back.
await panel.getByRole('button', { name: 'Clips y directo' }).click()
await page.waitForTimeout(600)
check('an example scene replaced it', (await layers()) === 2)
await panel.getByRole('button', { name: /^Mi escena/ }).click()
await page.waitForTimeout(600)
check('the saved scene is back', (await layers()) === mine)
await page.keyboard.press('Control+z')
await page.waitForTimeout(400)
check('Ctrl Z undoes the load', (await layers()) === 2)

// It survives a reload.
await page.reload()
await page.waitForSelector('.stage canvas')
await reveal(page)
check('still saved after a reload', (await page.locator('.panel.presets').getByRole('button', { name: /^Mi escena/ }).count()) === 1)

// And can be deleted; the examples stay.
await page.locator('.panel.presets').getByRole('button', { name: 'Borrar la escena Mi escena' }).click()
check('deleted', (await page.locator('.panel.presets').getByRole('button', { name: /^Mi escena/ }).count()) === 0)
check('examples stay', (await page.locator('.panel.presets').getByRole('button', { name: 'Primeros pasos' }).count()) === 1)

log('page errors:', errors.length ? errors.join(' | ') : 'none')
await browser.close()
