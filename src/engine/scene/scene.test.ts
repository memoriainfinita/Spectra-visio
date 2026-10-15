import { describe, expect, test } from 'vitest'
import { VISUALS, clampParam, defaultParams, fromUnit, getVisual, paramsOf, toUnit } from '../render/registry'
import { CLIP_COLUMNS, MAX_LAYERS, SCENE_VERSION, applyClip, clipOf, defaultScene, layerAmount, newLayer, normalizeScene, visualSettings } from './scene'

describe('registry', () => {
  test('unique ids, defaults inside their ranges, a name for every option', () => {
    expect(VISUALS.length).toBeGreaterThanOrEqual(20)
    expect(new Set(VISUALS.map((v) => v.id)).size).toBe(VISUALS.length)
    for (const v of VISUALS) {
      const ids = paramsOf(v).map((p) => p.id)
      expect(new Set(ids).size).toBe(ids.length)
      for (const p of paramsOf(v)) {
        expect(p.default).toBeGreaterThanOrEqual(p.min), expect(p.default).toBeLessThanOrEqual(p.max)
        if (p.options) expect(p.options.length).toBe(p.max - p.min + 1)
        if (p.labels) expect(p.labels.length).toBe(p.max - p.min + 1)
      }
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

  test('scenes before the layer stack become layers A and B, with the old blend on B', () => {
    const s = normalizeScene({ version: 3, layers: [{ visual: 'plasma' }, { visual: 'nope' }], crossfade: 4, blend: 'screen', selected: 1, effects: [{ id: 'f', type: 'mirror' }] })
    expect(s.layers.map((l) => [l.visual, l.side, l.blend])).toEqual([
      ['plasma', 'a', 'normal'],
      [defaultScene().layers[1].visual, 'b', 'screen'],
    ])
    expect(s.crossfade).toBe(1)
    expect(s.selected).toBe(1)
    expect(s.effects.map((e) => e.type)).toEqual(['mirror'])
    expect(normalizeScene({ version: 3, blend: 'glow' }).layers[1].blend).toBe('normal')
  })

  test('layer stack: fields checked, ids unique, at most MAX_LAYERS', () => {
    const s = normalizeScene({
      version: SCENE_VERSION,
      layers: [
        { id: 'x', visual: 'plasma', opacity: 3, blend: 'add', bypass: true, side: null, clips: [{ visual: 'tunnel' }, { visual: 'nope' }], active: 1 },
        { id: 'x', visual: 'tunnel', side: 'b', solo: true, active: 0 },
        ...Array.from({ length: 10 }, () => ({})),
      ],
      selected: 99,
    })
    expect(s.layers).toHaveLength(MAX_LAYERS)
    expect(new Set(s.layers.map((l) => l.id)).size).toBe(MAX_LAYERS)
    expect(s.layers[0]).toMatchObject({ id: 'x', visual: 'plasma', opacity: 1, blend: 'add', bypass: true, side: null, active: null })
    expect(s.layers[0].clips).toHaveLength(CLIP_COLUMNS)
    expect(s.layers[0].clips[0]?.visual).toBe('tunnel')
    expect(s.layers[0].clips[1]).toBeNull()
    expect(s.layers[1]).toMatchObject({ side: 'b', solo: true, active: null })
    expect(s.selected).toBe(MAX_LAYERS - 1)
    expect(normalizeScene({ version: SCENE_VERSION, layers: [] }).layers).toEqual(defaultScene().layers)
  })

  test('layer amount: opacity, crossfader side, bypass and solo', () => {
    const s = defaultScene()
    s.layers.push({ ...newLayer('l3'), opacity: 0.5 })
    const amounts = () => s.layers.map((_, i) => layerAmount(s, i))
    expect(amounts()).toEqual([1, 0, 0.5])
    s.crossfade = 0.5
    expect(amounts()).toEqual([1, 1, 0.5])
    s.crossfade = 0.75
    expect(amounts()).toEqual([0.5, 1, 0.5])
    s.layers[1].bypass = true
    expect(amounts()).toEqual([0.5, 0, 0.5])
    s.layers[2].solo = true
    expect(amounts()).toEqual([0, 0, 0.5])
  })

  test('a clip carries visualization, settings and effects; applying marks its column', () => {
    const s = defaultScene()
    s.layers[0].effects = [{ id: 'f1', type: 'mirror', enabled: true, params: {}, mods: {} }]
    const clip = clipOf(s.layers[0])
    const next = applyClip(s, 1, clip, 4)
    expect(next.layers[1]).toMatchObject({ visual: 'kaleido', active: 4 })
    expect(next.layers[1].perVisual.kaleido).toEqual(clip.settings)
    expect(next.layers[1].effects[0].type).toBe('mirror')
    expect(next.layers[1].effects[0].id).not.toBe('f1')
    expect(applyClip(s, 1, { ...clip, visual: 'gone' })).toBe(s)
  })

  test('a clip keeps launching on the beat; any other mode is the default, at once', () => {
    const s = normalizeScene({
      version: SCENE_VERSION,
      layers: [{ id: 'a', visual: 'tunnel', clips: [{ visual: 'tunnel', launch: 'beat' }, { visual: 'tunnel', launch: 'later' }, { visual: 'tunnel' }] }],
    })
    const [beat, odd, plain] = s.layers[0].clips
    expect(beat?.launch).toBe('beat')
    expect(odd && 'launch' in odd).toBe(false)
    expect(plain && 'launch' in plain).toBe(false)
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

  test('transition time clamped; missing in older scenes gives the default', () => {
    expect(normalizeScene({ transition: 3 }).transition).toBe(3)
    expect(normalizeScene({ transition: 99 }).transition).toBe(10)
    expect(normalizeScene({ transition: -1 }).transition).toBe(0)
    expect(normalizeScene({ version: 1 }).transition).toBe(defaultScene().transition)
  })

  test('a layer without saved settings uses the defaults', () => {
    const layer = defaultScene().layers[0]
    expect(visualSettings(layer)).toEqual({ params: defaultParams(getVisual(layer.visual)!), mods: {} })
  })
})
