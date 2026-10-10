import { describe, expect, test } from 'vitest'
import { VISUALS, clampParam, defaultParams, fromUnit, getVisual, paramsOf, toUnit } from '../render/registry'
import { defaultScene, normalizeScene, visualSettings } from './scene'

describe('registry', () => {
  test('eight visualizations, unique ids, defaults inside their ranges', () => {
    expect(VISUALS.length).toBe(8)
    expect(new Set(VISUALS.map((v) => v.id)).size).toBe(8)
    for (const v of VISUALS) {
      const ids = paramsOf(v).map((p) => p.id)
      expect(new Set(ids).size).toBe(ids.length)
      for (const p of paramsOf(v)) expect(p.default).toBeGreaterThanOrEqual(p.min), expect(p.default).toBeLessThanOrEqual(p.max)
    }
  })

  test('values clamp to the range; integer parameters round', () => {
    const rows = getVisual('ribbons')!.params[0]
    expect(clampParam(rows, 99)).toBe(12)
    expect(clampParam(rows, 3.6)).toBe(4)
    expect(fromUnit(rows, 0.5)).toBe(7)
    expect(toUnit(rows, 12)).toBe(1)
    expect(fromUnit(rows, 1.7)).toBe(12)
  })
})

describe('scene normalization', () => {
  test('missing or malformed data gives the default scene', () => {
    expect(normalizeScene(undefined)).toEqual(defaultScene())
    expect(normalizeScene('x')).toEqual(defaultScene())
  })

  test('valid fields kept, invalid replaced', () => {
    const s = normalizeScene({ layers: [{ visual: 'plasma' }, { visual: 'nope' }], crossfade: 4, blend: 'screen', selected: 1 })
    expect(s.layers[0].visual).toBe('plasma')
    expect(s.layers[1].visual).toBe(defaultScene().layers[1].visual)
    expect(s.crossfade).toBe(1)
    expect(s.blend).toBe('screen')
    expect(s.selected).toBe(1)
    expect(normalizeScene({ blend: 'glow' }).blend).toBe('normal')
  })

  test('stored parameters and modulations are checked against the visualization', () => {
    const s = normalizeScene({
      layers: [
        {
          visual: 'tunnel',
          perVisual: {
            tunnel: {
              params: { rings: 500, twist: 2, bogus: 1 },
              mods: {
                twist: [
                  { id: 'a', source: { kind: 'lfo', shape: 'sine', rate: 3, sync: true }, amount: 5, curve: 'x', smoothing: -1 },
                  { id: 'b', source: { kind: 'nope' } },
                ],
                bogus: [{ id: 'c', source: { kind: 'band', band: 'bass' } }],
              },
            },
            gone: { params: {} },
          },
        },
      ],
    })
    const v = s.layers[0].perVisual.tunnel
    expect(Object.keys(s.layers[0].perVisual)).toEqual(['tunnel'])
    expect(v.params.rings).toBe(40)
    expect(v.params.twist).toBe(2)
    expect(v.params.bogus).toBeUndefined()
    expect(Object.keys(v.mods)).toEqual(['twist'])
    expect(v.mods.twist).toEqual([{ id: 'a', source: { kind: 'lfo', shape: 'sine', rate: 1, sync: true }, amount: 1, curve: 'linear', smoothing: 0 }])
  })

  test('a layer without saved settings uses the defaults', () => {
    const layer = defaultScene().layers[0]
    expect(visualSettings(layer)).toEqual({ params: defaultParams(getVisual(layer.visual)!), mods: {} })
  })
})
