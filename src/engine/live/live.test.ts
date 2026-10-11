import { describe, expect, test } from 'vitest'
import { ACTIONS, DEFAULT_KEYS, FLASH_MS, MIN_FLASH_GAP_MS, OutputStage, actionForKey, bindKey, keyCombo, normalizeKeys, normalizeLive, type OutputInput } from './live'

const key = (k: string, mods: Partial<{ shiftKey: boolean; ctrlKey: boolean; altKey: boolean; metaKey: boolean }> = {}) =>
  keyCombo({ key: k, shiftKey: false, ctrlKey: false, altKey: false, metaKey: false, ...mods })

describe('keys', () => {
  test('combos: printable keys in lower case, Shift only on named keys, browser combos left alone', () => {
    expect(key('A', { shiftKey: true })).toBe('a')
    expect(key('!', { shiftKey: true })).toBe('!')
    expect(key('ArrowRight', { shiftKey: true })).toBe('Shift+ArrowRight')
    expect(key('ArrowRight')).toBe('ArrowRight')
    expect(key('r', { ctrlKey: true })).toBeNull()
    expect(key('Shift', { shiftKey: true })).toBeNull()
  })

  test('the defaults keep the earlier shortcuts', () => {
    expect(actionForKey(DEFAULT_KEYS, ' ')).toBe('play')
    expect(actionForKey(DEFAULT_KEYS, 't')).toBe('tap')
    expect(actionForKey(DEFAULT_KEYS, 'a')).toBe('auto')
    expect(actionForKey(DEFAULT_KEYS, '3')).toBe('column3')
    expect(actionForKey(DEFAULT_KEYS, 'q')).toBeNull()
  })

  test('binding takes the key from another action; null unbinds', () => {
    const k = bindKey(DEFAULT_KEYS, 'blackout', 't')
    expect(k.blackout).toBe('t')
    expect(k.tap).toBeUndefined()
    expect(bindKey(k, 'blackout', null).blackout).toBeUndefined()
  })

  test('stored keys: unknown actions, bad values and repeated keys dropped', () => {
    expect(normalizeKeys({ tap: 'q', auto: 'q', nope: 'w', blackout: 3, freeze: '' })).toEqual({ tap: 'q' })
    expect(normalizeLive(undefined).keys).toEqual(DEFAULT_KEYS)
    expect(normalizeLive({ strobe: 9 }).strobe).toBe('beat')
    expect(normalizeLive({ strobe: 2, keys: {}, known: ACTIONS })).toEqual({ strobe: 2, keys: {}, known: [...ACTIONS] })
  })

  test('an action added later gets its default key when it is free', () => {
    // Saved before 'record' existed: it gets R, the rest stay as they were.
    expect(normalizeLive({ keys: { tap: 'q' } }).keys).toEqual({ tap: 'q', record: 'r' })
    expect(normalizeLive({ keys: { tap: 'r' } }).keys).toEqual({ tap: 'r' })
    // Saved knowing it, and left without a key.
    expect(normalizeLive({ keys: { tap: 'q' }, known: ACTIONS }).keys).toEqual({ tap: 'q' })
  })
})

describe('output stage', () => {
  const base: OutputInput = { now: 0, blackout: false, freeze: false, strobe: false, rate: 'beat', phase: null }

  test('blackout fades in and out', () => {
    const o = new OutputStage()
    o.tick(base)
    expect(o.tick({ ...base, now: 125, blackout: true }).black).toBeCloseTo(0.5)
    expect(o.tick({ ...base, now: 400, blackout: true }).black).toBe(1)
    expect(o.tick({ ...base, now: 525 }).black).toBeCloseTo(0.5)
  })

  test('strobe on the beat flashes briefly, at most three times a second', () => {
    const o = new OutputStage()
    const flashes: number[] = []
    let wasOn = false
    // 240 BPM: a beat every 250 ms, faster than the limit.
    for (let t = 0; t < 2000; t += 10) {
      const on = o.tick({ ...base, now: t, strobe: true, phase: (t / 250) % 1 }).flash > 0
      if (on && !wasOn) flashes.push(t)
      wasOn = on
    }
    expect(flashes.length).toBeGreaterThan(3)
    for (let i = 1; i < flashes.length; i++) expect(flashes[i] - flashes[i - 1]).toBeGreaterThanOrEqual(MIN_FLASH_GAP_MS)
  })

  test('strobe at a fixed rate, flash length, and nothing without the switch', () => {
    const o = new OutputStage()
    const on: number[] = []
    for (let t = 0; t < 2000; t += 10) if (o.tick({ ...base, now: t, strobe: true, rate: 2 }).flash) on.push(t)
    // Flashes at 0, 500, 1000 and 1500 ms.
    expect(on.length).toBe(4 * (FLASH_MS / 10))
    const off = new OutputStage()
    expect(off.tick({ ...base, now: 0, phase: 0.9 }).flash).toBe(0)
    expect(off.tick({ ...base, now: 10, phase: 0.1 }).flash).toBe(0)
  })
})
