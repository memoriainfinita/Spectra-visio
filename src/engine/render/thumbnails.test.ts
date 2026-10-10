import { describe, expect, test } from 'vitest'
import { KICK } from '../analysis/analyzer'
import { VISUALS } from './registry'
import { testFrame, thumbKey } from './thumbnails'
import { CATEGORIES, type VisualDef } from './visual'

describe('visualization browser', () => {
  test('every visualization has a known category', () => {
    for (const v of VISUALS) expect(CATEGORIES).toContain(v.category)
  })

  test('thumbnail key changes with the code and the parameters', () => {
    const v = VISUALS[0]
    const key = thumbKey(v)
    expect(thumbKey(v)).toBe(key)
    expect(key.startsWith(`${v.id}:`)).toBe(true)
    expect(thumbKey({ ...v, params: [...v.params, { id: 'x', label: 'param.gain', min: 0, max: 1, default: 0 }] })).not.toBe(key)
    expect(thumbKey({ ...v, create: () => ({ render() {} }) } as VisualDef)).not.toBe(key)
    expect(new Set(VISUALS.map(thumbKey)).size).toBe(VISUALS.length)
  })

  test('test audio stays in range and kicks twice a second', () => {
    const kicks = new Set<number>()
    for (let n = 0; n < 90; n++) {
      const a = testFrame(n)
      for (const v of [...a.bands.subarray(0, a.bandCount), ...a.named]) expect(v).toBeGreaterThanOrEqual(0), expect(v).toBeLessThanOrEqual(1)
      for (const w of a.waveL) expect(Math.abs(w)).toBeLessThanOrEqual(1)
      kicks.add(a.beats[KICK])
    }
    // 1.5 s at 120 BPM: counts 0, 1 and 2.
    expect([...kicks]).toEqual([0, 1, 2])
  })
})
