import { describe, expect, test } from 'vitest'
import { levelGain } from './level'

describe('levelGain', () => {
  test('loud tracks come down to the target', () => {
    expect(levelGain(-8, -0.1)).toBe(-6)
    expect(levelGain(-14, -1)).toBe(0)
  })

  test('the cut has a floor', () => {
    expect(levelGain(10, 0)).toBe(-18)
  })

  test('quiet tracks go up, at most 6 dB and only while the peak stays under -1 dBFS', () => {
    expect(levelGain(-17, -10)).toBe(3)
    expect(levelGain(-30, -20)).toBe(6)
    expect(levelGain(-18, -3)).toBe(2)
    expect(levelGain(-18, -0.5)).toBe(0)
  })

  test('without a peak a quiet track is left as it is', () => {
    expect(levelGain(-20, null)).toBe(0)
  })
})
