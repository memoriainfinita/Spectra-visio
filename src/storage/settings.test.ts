import { expect, test } from 'vitest'
import { SETTINGS_VERSION, defaultSettings, normalizeSettings } from './settings'

const defaults = defaultSettings('es')

test('missing or malformed data falls back to the defaults', () => {
  expect(normalizeSettings(undefined, defaults)).toEqual(defaults)
  expect(normalizeSettings('nope', defaults)).toEqual(defaults)
  expect(normalizeSettings(null, defaults)).toEqual(defaults)
})

test('valid fields are kept, invalid ones replaced', () => {
  expect(normalizeSettings({ lang: 'en' }, defaults).lang).toBe('en')
  expect(normalizeSettings({ lang: 'fr' }, defaults).lang).toBe('es')
  expect(normalizeSettings({ keepFiles: true }, defaults).keepFiles).toBe(true)
  expect(normalizeSettings({ keepFiles: 'yes' }, defaults).keepFiles).toBe(false)
})

test('result always carries the current version', () => {
  expect(normalizeSettings({ version: 0, lang: 'en' }, defaults).version).toBe(SETTINGS_VERSION)
})
