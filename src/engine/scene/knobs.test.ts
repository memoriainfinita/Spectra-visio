import { describe, expect, test } from 'vitest'
import { LEVEL_KNOBS, MAX_DESTS, PANEL_KNOBS, blend, normalizeKnob, normalizeVariations, variationMs, withDest, withoutLayer, emptyKnob, type KnobTarget } from './knobs'
import { SCENE_VERSION, defaultScene, normalizeScene, visualSettings, type SceneState } from './scene'
import { knobAt, turnKnob, turnPanel, withKnob } from './turn'

const zoom: KnobTarget = { kind: 'param', layer: 'l1', visual: 'kaleido', param: 'segments' }

function withDests(s: SceneState, ...targets: KnobTarget[]): SceneState {
  return withKnob(s, { bank: 'panel', i: 0 }, (k) => targets.reduce(withDest, k))
}

describe('turning a knob', () => {
  test('sets every destination over its range, inverted when it runs backwards', () => {
    let s = withDests(defaultScene(), { kind: 'crossfade' }, { kind: 'opacity', layer: 'l2' })
    s = withKnob(s, { bank: 'panel', i: 0 }, (k) => ({ ...k, dests: k.dests.map((d, i) => (i === 1 ? { ...d, from: 1, to: 0.2 } : d)) }))
    s = turnKnob(s, { bank: 'panel', i: 0 }, 0.5)
    expect(s.knobs[0].value).toBe(0.5)
    expect(s.crossfade).toBe(0.5)
    expect(s.layers[1].opacity).toBeCloseTo(0.6)
    s = turnKnob(s, { bank: 'panel', i: 0 }, 2)
    expect(s.knobs[0].value).toBe(1)
    expect(s.layers[1].opacity).toBeCloseTo(0.2)
  })

  test('a parameter of a visualization, in its own range, even when the layer shows another', () => {
    let s = withDests(defaultScene(), zoom)
    s = turnKnob(s, { bank: 'panel', i: 0 }, 1)
    const after = visualSettings(s.layers[0], 'kaleido').params.segments
    expect(after).toBeGreaterThan(visualSettings(defaultScene().layers[0], 'kaleido').params.segments)
    const other = withDests(defaultScene(), { ...zoom, layer: 'l2' })
    const turned = turnKnob(other, { bank: 'panel', i: 0 }, 1)
    expect(turned.layers[1].visual).toBe('tunnel')
    expect(turned.layers[1].perVisual.kaleido).toBeDefined()
  })

  test('an effect by its place among those of its type, so a clip launch keeps it', () => {
    let s = defaultScene()
    const fx = (id: string) => ({ id, type: 'mirror', enabled: true, params: { mode: 0 }, mods: {} })
    s = { ...s, effects: [fx('a'), fx('b')] }
    s = withDests(s, { kind: 'effect', owner: 'comp', type: 'mirror', nth: 1, param: 'mode' })
    s = turnKnob(s, { bank: 'panel', i: 0 }, 1)
    expect(s.effects[0].params.mode).toBe(0)
    expect(s.effects[1].params.mode).toBeGreaterThan(0)
  })

  test('missing destinations are left alone; knobs on layers and on the composition', () => {
    const s = withDests(defaultScene(), { kind: 'opacity', layer: 'gone' }, { kind: 'effect', owner: 'comp', type: 'mirror', nth: 3, param: 'mode' })
    const turned = turnKnob(s, { bank: 'panel', i: 0 }, 0.3)
    expect(turned.layers).toEqual(s.layers)
    expect(turnKnob(s, { bank: 'layer', layer: 'l1', i: 2 }, 0.7).layers[0].knobs[2].value).toBe(0.7)
    expect(turnKnob(s, { bank: 'comp', i: 3 }, 0.4).compKnobs[3].value).toBe(0.4)
    expect(knobAt(s, { bank: 'layer', layer: 'nope', i: 0 })).toBeNull()
  })

  test('the whole panel at once', () => {
    const s = turnPanel(defaultScene(), [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8])
    expect(s.knobs.map((k) => k.value)).toEqual([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8])
  })
})

describe('destinations', () => {
  test('once each, up to the limit', () => {
    let k = withDest(emptyKnob(), zoom)
    expect(withDest(k, { ...zoom })).toBe(k)
    for (let i = 0; i < MAX_DESTS + 3; i++) k = withDest(k, { kind: 'opacity', layer: `x${i}` })
    expect(k.dests).toHaveLength(MAX_DESTS)
  })

  test('a layer that goes takes its destinations', () => {
    const k = [zoom, { kind: 'opacity', layer: 'l1' } as KnobTarget, { kind: 'effect', owner: 'l1', type: 'mirror', nth: 0, param: 'mode' } as KnobTarget, { kind: 'crossfade' } as KnobTarget].reduce(withDest, emptyKnob())
    expect(withoutLayer(k, 'l1').dests.map((d) => d.target.kind)).toEqual(['crossfade'])
  })
})

describe('variations', () => {
  test('values blend over the way, and beats take their time', () => {
    expect(blend([0, 1], [1, 0], 0.25)).toEqual([0.25, 0.75])
    expect(blend([0, 1], [1, 0], 2)).toEqual([1, 0])
    expect(variationMs(4, 120)).toBe(2000)
    expect(variationMs(4, null)).toBe(2000)
    expect(variationMs(2, 60)).toBe(2000)
    expect(variationMs(0, 90)).toBe(0)
  })

  test('stored ones checked: ids, values, beats, how many', () => {
    const v = normalizeVariations([{ id: 'a', name: '  Drop  ', values: [2, -1, 0.5], beats: 4 }, { id: 'a' }, { id: 'b', beats: 3 }, 'x'])
    expect(v).toHaveLength(2)
    expect(v[0]).toEqual({ id: 'a', name: 'Drop', values: [1, 0, 0.5, 0, 0, 0, 0, 0], beats: 4 })
    expect(v[1].beats).toBe(4)
    expect(normalizeVariations(Array.from({ length: 20 }, (_, i) => ({ id: `v${i}` })))).toHaveLength(8)
  })
})

describe('stored scenes', () => {
  test('version 4 gets empty knobs and no variations', () => {
    const s = normalizeScene({ version: 4, layers: [{ id: 'a', visual: 'tunnel' }] })
    expect(s.version).toBe(SCENE_VERSION)
    expect(s.knobs).toHaveLength(PANEL_KNOBS)
    expect(s.compKnobs).toHaveLength(LEVEL_KNOBS)
    expect(s.layers[0].knobs).toHaveLength(LEVEL_KNOBS)
    expect(s.variations).toEqual([])
  })

  test('destinations on layers that are not there go; the rest round-trips', () => {
    let s = withDests(defaultScene(), zoom, { kind: 'opacity', layer: 'gone' }, { kind: 'crossfade' })
    s = turnKnob(s, { bank: 'panel', i: 0 }, 0.4)
    s = withKnob(s, { bank: 'layer', layer: 'l2', i: 1 }, (k) => withDest({ ...k, name: 'Giro' }, { kind: 'opacity', layer: 'l1' }))
    s = { ...s, variations: [{ id: 'v1', name: 'Intro', values: [0.5, 0, 0, 0, 0, 0, 0, 0], beats: 8 }] }
    const back = normalizeScene(JSON.parse(JSON.stringify(s)))
    expect(back.knobs[0].dests.map((d) => d.target.kind)).toEqual(['param', 'crossfade'])
    expect(back.knobs[0].value).toBe(0.4)
    expect(back.layers[1].knobs[1]).toEqual(s.layers[1].knobs[1])
    expect(back.variations).toEqual(s.variations)
  })

  test('a knob from bad data is empty', () => {
    expect(normalizeKnob('x', new Set())).toEqual(emptyKnob())
    expect(normalizeKnob({ name: 5, value: 'a', dests: [{ target: { kind: 'nope' } }] }, new Set())).toEqual(emptyKnob())
  })
})
