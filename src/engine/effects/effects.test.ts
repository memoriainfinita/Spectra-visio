import { describe, expect, test } from 'vitest'
import { defaultEffectParams, normalizeEffects, normalizeScene } from '../scene/scene'
import { keepFactor } from './effect'
import { PALETTES, PALETTE_WIDTH, paletteData } from './palettes'
import { EFFECTS, MAX_EFFECTS } from './registry'

describe('effect registry', () => {
  test('unique ids; defaults inside their ranges; named values cover the range', () => {
    expect(new Set(EFFECTS.map((e) => e.id)).size).toBe(EFFECTS.length)
    for (const e of EFFECTS) {
      expect(new Set(e.params.map((p) => p.id)).size).toBe(e.params.length)
      for (const p of e.params) {
        expect(p.default).toBeGreaterThanOrEqual(p.min)
        expect(p.default).toBeLessThanOrEqual(p.max)
        if (p.options) expect(p.options.length).toBe(p.max - p.min + 1), expect(p.int).toBe(true)
      }
    }
  })

  test('trail keep factor follows the time constant, not the frame rate', () => {
    // After one second the trail is at e^-1 whatever the frame time.
    expect(Math.pow(keepFactor(1, 1 / 60), 60)).toBeCloseTo(Math.exp(-1), 6)
    expect(Math.pow(keepFactor(1, 1 / 144), 144)).toBeCloseTo(Math.exp(-1), 6)
    expect(keepFactor(0, 1 / 60)).toBe(0)
  })
})

describe('palettes', () => {
  test('one row per palette, from the first stop to the last', () => {
    const data = paletteData()
    expect(data.length).toBe(PALETTE_WIDTH * PALETTES.length * 4)
    PALETTES.forEach((p, row) => {
      const first = row * PALETTE_WIDTH * 4
      const last = first + (PALETTE_WIDTH - 1) * 4
      expect([...data.slice(first, first + 4)]).toEqual([0, 0, 0, 255])
      const end = parseInt(p.stops[p.stops.length - 1][1].slice(1), 16)
      expect([...data.slice(last, last + 3)]).toEqual([(end >> 16) & 255, (end >> 8) & 255, end & 255])
    })
  })

  test('linear between stops', () => {
    const data = paletteData([{ id: 't', label: 'palette.mono', stops: [[0, '#000000'], [1, '#ff0000']] }], 3)
    expect([...data]).toEqual([0, 0, 0, 255, 128, 0, 0, 255, 255, 0, 0, 255])
  })
})

describe('effect chain in the scene', () => {
  test('a version 1 scene loads with an empty chain', () => {
    expect(normalizeScene({ version: 1, blend: 'add' }).effects).toEqual([])
  })

  test('unknown effects and repeated ids dropped; values clamped; enabled by default', () => {
    const fx = normalizeEffects([
      { id: 'a', type: 'bloom', params: { strength: 99, bogus: 1 }, mods: { radius: [{ id: 'm', source: { kind: 'band', band: 'bass' } }] } },
      { id: 'a', type: 'trails' },
      { id: 'b', type: 'nope' },
      { id: 'c', type: 'mirror', enabled: false, params: { mode: 1.6 } },
      { type: 'color' },
    ])
    expect(fx.map((e) => e.id)).toEqual(['a', 'c'])
    expect(fx[0].enabled).toBe(true)
    expect(fx[0].params).toEqual({ ...defaultEffectParams('bloom'), strength: 3 })
    expect(fx[0].mods.radius).toHaveLength(1)
    expect(fx[1].enabled).toBe(false)
    expect(fx[1].params.mode).toBe(2)
  })

  test('the chain is capped', () => {
    const many = Array.from({ length: MAX_EFFECTS + 5 }, (_, i) => ({ id: `e${i}`, type: 'trails' }))
    expect(normalizeEffects(many)).toHaveLength(MAX_EFFECTS)
  })
})
