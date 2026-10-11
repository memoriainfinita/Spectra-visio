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

test('analysis settings: missing from older data, out of range or invalid', () => {
  expect(normalizeSettings({ lang: 'en' }, defaults).analysis).toEqual(defaults.analysis)
  const a = normalizeSettings({ analysis: { bands: 48, smoothing: 3, autoLevel: false, latencyOffset: -900 } }, defaults).analysis
  expect(a.bands).toBe(48)
  expect(a.smoothing).toBe(1)
  expect(a.autoLevel).toBe(false)
  expect(a.latencyOffset).toBe(-200)
  expect(normalizeSettings({ analysis: { bands: 7 } }, defaults).analysis.bands).toBe(defaults.analysis.bands)
})

test('performance and photosensitive safety: defaults, older data and invalid values', () => {
  expect(defaultSettings('es', true).reduceFlashes).toBe(true)
  const older = normalizeSettings({ lang: 'en' }, defaultSettings('es', true))
  expect(older.reduceFlashes).toBe(true)
  expect(older.flashNotice).toBe(false)
  expect(older.performance).toEqual(defaults.performance)
  const s = normalizeSettings({ reduceFlashes: false, flashNotice: true, performance: { maxFps: 30, adaptive: 'no' } }, defaults)
  expect(s.reduceFlashes).toBe(false)
  expect(s.flashNotice).toBe(true)
  expect(s.performance.maxFps).toBe(30)
  expect(s.performance.adaptive).toBe(true)
})
