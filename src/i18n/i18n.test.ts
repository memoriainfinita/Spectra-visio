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
  expect(translate('es', 'queue.regain', { n: 3 })).toBe('Recuperar el acceso a 3 archivos de la sesión anterior')
  expect(translate('en', 'clips.save', { n: 2 })).toBe('Save layer 2 in cell {c}')
})

test('every language has the same keys and no empty messages', () => {
  expect(Object.keys(en).sort()).toEqual(Object.keys(es).sort())
  for (const messages of [es, en]) {
    for (const text of Object.values(messages)) expect(text.trim()).not.toBe('')
  }
})
