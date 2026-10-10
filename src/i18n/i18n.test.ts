import { expect, test } from 'vitest'
import { en } from './en'
import { es } from './es'
import { detectLang, translate } from './index'

test('detectLang takes the first supported language', () => {
  expect(detectLang(['es-ES', 'en-US'])).toBe('es')
  expect(detectLang(['fr-FR', 'en-GB', 'es'])).toBe('en')
  expect(detectLang(['de-DE'])).toBe('en')
  expect(detectLang([])).toBe('en')
})

test('translate fills params and leaves unknown placeholders', () => {
  expect(translate('es', 'app.rebuilding', { phase: 1, total: 10 })).toBe('Reconstrucción en curso: fase 1 de 10.')
  expect(translate('en', 'app.rebuilding', { phase: 2 })).toBe('Rebuild in progress: phase 2 of {total}.')
})

test('every language has the same keys and no empty messages', () => {
  expect(Object.keys(en).sort()).toEqual(Object.keys(es).sort())
  for (const messages of [es, en]) {
    for (const text of Object.values(messages)) expect(text.trim()).not.toBe('')
  }
})
