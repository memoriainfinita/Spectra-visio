import { describe, expect, test } from 'vitest'
import { PRESET_FORMAT, applyPreset, cleanName, exportPresets, normalizePresets, parsePresets, presetFrom } from './preset'
import { defaultScene, newLayer, normalizeEffects, type SceneState } from './scene'

function scene(): SceneState {
  const s = defaultScene()
  s.layers[1] = {
    ...newLayer('l2', 'plasma', 'b'),
    perVisual: { plasma: { params: { speed: 2, sensitivity: 1, intensity: 1, hue: 90, scale: 2 }, mods: {} } },
    effects: normalizeEffects([{ id: 'f1', type: 'trails', params: { length: 1 } }]),
  }
  s.effects = normalizeEffects([{ id: 'g1', type: 'mirror' }])
  return s
}

describe('presets', () => {
  test('saved from a layer and loaded on the other: visual, settings and the layer effects', () => {
    const p = presetFrom(scene(), 1, '  Plasma   lento ', 'p1', 5)
    expect(p).toMatchObject({ id: 'p1', name: 'Plasma lento', created: 5, visual: 'plasma' })
    expect(p.settings.params.scale).toBe(2)
    expect(p.effects.map((e) => e.type)).toEqual(['trails'])

    const target = defaultScene()
    target.layers[0].perVisual.tunnel = { params: { rings: 10 }, mods: {} }
    const next = applyPreset(target, 0, p)
    expect(next.layers[0].visual).toBe('plasma')
    expect(next.layers[0].perVisual.plasma).toEqual(p.settings)
    // Other visualizations' tweaks on that layer stay.
    expect(next.layers[0].perVisual.tunnel).toEqual({ params: { rings: 10 }, mods: {} })
    expect(next.layers[1]).toBe(target.layers[1])
    // The layer's effects, with ids of their own; the composition chain stays.
    expect(next.layers[0].effects.map((e) => e.type)).toEqual(['trails'])
    expect(next.layers[0].effects[0].id).not.toBe('f1')
    expect(next.effects).toBe(target.effects)
  })

  test('export and import round trip', () => {
    const p = presetFrom(scene(), 1, 'A', 'p1', 5)
    const { presets, rejected } = parsePresets(exportPresets([p]))
    expect(presets).toEqual([p])
    expect(rejected).toBe(0)
  })

  test('invalid entries dropped, values checked like a scene', () => {
    const text = JSON.stringify({
      format: PRESET_FORMAT,
      version: 1,
      presets: [
        { id: 'a', name: 'ok', visual: 'tunnel', settings: { params: { rings: 999 } }, effects: [{ id: 'x', type: 'nope' }] },
        { id: 'b', name: '   ', visual: 'tunnel' },
        { id: 'c', name: 'gone', visual: 'nope' },
        'junk',
      ],
    })
    const { presets, rejected } = parsePresets(text)
    expect(presets.map((p) => p.id)).toEqual(['a'])
    expect(presets[0].settings.params.rings).toBe(40)
    expect(presets[0].effects).toEqual([])
    expect(rejected).toBe(3)
  })

  test('files that are not an export are refused', () => {
    expect(() => parsePresets('not json')).toThrow()
    expect(() => parsePresets('{"presets": []}')).toThrow()
  })

  test('stored list: repeated ids dropped; names cleaned and capped', () => {
    const p = presetFrom(scene(), 0, 'x', 'p1', 1)
    expect(normalizePresets([p, { ...p, name: 'dup' }, null])).toEqual([p])
    expect(normalizePresets('x')).toEqual([])
    expect(cleanName('a'.repeat(100))).toHaveLength(60)
  })
})
