import { describe, expect, it } from 'vitest'
import { SILENCE_AFTER_MS, SilenceWatch, isDigitalSilence } from './silence'

describe('isDigitalSilence', () => {
  it('is true for exact zeros only', () => {
    expect(isDigitalSilence(new Float32Array(8), new Float32Array(8))).toBe(true)
    const faint = new Float32Array(8)
    faint[5] = 1e-7
    expect(isDigitalSilence(new Float32Array(8), faint)).toBe(false)
  })
})

describe('SilenceWatch', () => {
  it('warns once after the silence lasts, and again after sound returned', () => {
    const w = new SilenceWatch()
    expect(w.update(true, true, 0)).toBe(false)
    expect(w.update(true, true, SILENCE_AFTER_MS - 1)).toBe(false)
    expect(w.update(true, true, SILENCE_AFTER_MS)).toBe(true)
    expect(w.update(true, true, SILENCE_AFTER_MS * 3)).toBe(false)
    expect(w.update(false, true, SILENCE_AFTER_MS * 3 + 100)).toBe(false)
    expect(w.update(true, true, SILENCE_AFTER_MS * 4)).toBe(false)
    expect(w.update(true, true, SILENCE_AFTER_MS * 5)).toBe(true)
  })
  it('does not count time while not listening', () => {
    const w = new SilenceWatch()
    expect(w.update(true, true, 0)).toBe(false)
    expect(w.update(true, false, SILENCE_AFTER_MS)).toBe(false)
    expect(w.update(true, true, SILENCE_AFTER_MS + 100)).toBe(false)
    expect(w.update(true, true, SILENCE_AFTER_MS * 2 + 100)).toBe(true)
  })
})
