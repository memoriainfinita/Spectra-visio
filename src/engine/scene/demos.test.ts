import { describe, expect, it } from 'vitest'
import { CURVES, LFO_SHAPES } from '../modulation/modulation'
import { EFFECTS } from '../effects/registry'
import { visualsStore } from '../render/registry'
import { DEMOS, demoScene } from './demos'
import { INPUT_VISUAL, normalizeScene, type SceneState } from './scene'

// All the modulations of a scene: on parameters of layers and clips, and in effects.
function allMods(s: SceneState) {
  const settings = [
    ...s.layers.flatMap((l) => [...Object.values(l.perVisual), ...l.effects, ...l.clips.flatMap((c) => (c ? [c.settings, ...c.effects] : []))]),
    ...s.effects,
  ]
  return settings.flatMap((v) => Object.values(v.mods).flat())
}

// A demo must survive the same checks as a stored scene: nothing it holds may be dropped.
describe('demo scenes', () => {
  for (const d of DEMOS) {
    for (const lang of ['es', 'en'] as const) {
      it(`${d.id} loads whole in ${lang}`, () => {
        const scene = demoScene(d.id, lang)
        expect(normalizeScene(JSON.parse(JSON.stringify(scene)))).toEqual(scene)
      })
    }
  }

  it('start has three layers with oscillators and effects', () => {
    const s = demoScene('start')
    expect(s.layers).toHaveLength(3)
    expect(allMods(s).some((m) => m.source.kind === 'lfo')).toBe(true)
    expect(s.layers.some((l) => l.effects.length > 0)).toBe(true)
    expect(s.effects.length).toBeGreaterThan(0)
  })

  it('sources has every kind of source, every oscillator shape, every curve, both oscillator modes and smoothing', () => {
    const s = demoScene('sources')
    expect(s.layers).toHaveLength(4)
    const mods = allMods(s)
    expect(new Set(mods.map((m) => m.source.kind))).toEqual(new Set(['band', 'beat', 'lfo']))
    const shapes = new Set(mods.flatMap((m) => (m.source.kind === 'lfo' ? [m.source.shape] : [])))
    for (const shape of LFO_SHAPES) expect(shapes.has(shape)).toBe(true)
    expect(mods.some((m) => m.source.kind === 'lfo' && m.source.sync)).toBe(true)
    expect(mods.some((m) => m.source.kind === 'lfo' && !m.source.sync)).toBe(true)
    expect(mods.some((m) => m.smoothing > 0)).toBe(true)
    // The curves shown are the ones that are not linear; linear is every other.
    const curves = new Set(mods.map((m) => m.curve))
    expect(curves.has('exp') && curves.has('log') && curves.has('linear')).toBe(true)
    expect(CURVES.every((c) => typeof c === 'string')).toBe(true)
  })

  it('mods maps every shared modulator and keeps its knobs and variations', () => {
    const s = demoScene('mods')
    expect(s.modulators).toHaveLength(4)
    expect(s.modulators.every((m) => m.dests.length >= 2)).toBe(true)
    expect(s.knobs.filter((k) => k.dests.length > 0)).toHaveLength(3)
    expect(s.variations).toHaveLength(2)
  })

  it('fx has a column for every effect that draws and one with three chained', () => {
    const s = demoScene('fx')
    const clips = s.layers.flatMap((l) => l.clips.filter((c) => c !== null))
    const single = new Set(clips.filter((c) => c!.effects.length === 1).map((c) => c!.effects[0].type))
    const drawing = EFFECTS.map((e) => e.id).filter((id) => id !== 'inputMix')
    for (const id of drawing) expect(single.has(id)).toBe(true)
    expect(clips.some((c) => c!.effects.length === 3)).toBe(true)
    expect(s.columns.filter(Boolean)).toHaveLength(8)
    expect(allMods(s).length).toBeGreaterThan(0)
  })

  it('live has named columns, clips on both sides, a crossfader knob and my panel', () => {
    const s = demoScene('live')
    expect(s.layers.map((l) => l.side)).toEqual(['a', 'b'])
    expect(s.layers.every((l) => l.clips.filter(Boolean).length === 4)).toBe(true)
    expect(s.columns.slice(0, 4)).toEqual(['Calma', 'Pulso', 'Caos', 'Final'])
    expect(demoScene('live', 'en').columns.slice(0, 4)).toEqual(['Calm', 'Pulse', 'Chaos', 'End'])
    expect(s.layers.some((l) => l.clips.some((c) => c?.launch === 'beat'))).toBe(true)
    expect(s.knobs[0].dests[0].target.kind).toBe('crossfade')
    expect(s.panel.filter(Boolean)).toHaveLength(8)
    expect(s.transition).toBeGreaterThan(0)
  })

  it('show has all the visualizations in named columns, with the rest of the app on them', () => {
    const s = demoScene('show')
    const shown = new Set(s.layers.flatMap((l) => l.clips.flatMap((c) => (c ? [c.visual] : []))))
    const builtin = visualsStore.get().filter((v) => v.id !== INPUT_VISUAL && !v.id.startsWith('user:'))
    for (const v of builtin) expect(shown.has(v.id), v.id).toBe(true)
    expect(s.columns.filter(Boolean)).toHaveLength(8)
    expect(demoScene('show', 'en').columns[0]).toBe('Intro')
    expect(s.layers.map((l) => l.side)).toEqual(['a', 'b', null])
    const clips = s.layers.flatMap((l) => l.clips.filter((c) => c !== null))
    const types = new Set(clips.flatMap((c) => c!.effects.map((e) => e.type)))
    for (const t of ['bloom', 'feedback', 'trails', 'mirror', 'kaleido', 'color', 'palette']) expect(types.has(t), t).toBe(true)
    expect(clips.some((c) => c!.launch === 'beat')).toBe(true)
    expect(allMods(s).some((m) => m.source.kind === 'lfo')).toBe(true)
    expect(s.modulators.length).toBeGreaterThan(0)
    expect(s.knobs.filter((k) => k.dests.length > 0).length).toBeGreaterThan(0)
    expect(s.variations).toHaveLength(2)
    expect(s.panel.filter(Boolean)).toHaveLength(11)
    expect(s.transition).toBeGreaterThan(0)
    expect(s.effects.length).toBeGreaterThan(0)
  })

  it('gallery has every visualization as a clip', () => {
    const s = demoScene('gallery')
    const shown = new Set(s.layers.flatMap((l) => l.clips.flatMap((c) => (c ? [c.visual] : []))))
    const builtin = visualsStore.get().filter((v) => v.id !== INPUT_VISUAL && !v.id.startsWith('user:'))
    for (const v of builtin) expect(shown.has(v.id), v.id).toBe(true)
    expect(s.layers.every((l) => l.clips.filter(Boolean).length <= 9)).toBe(true)
    expect(s.transition).toBeGreaterThan(0)
  })
})
