import { describe, expect, it } from 'vitest'
import { DEMOS, demoScene } from './demos'
import { normalizeScene } from './scene'

// A demo must survive the same checks as a stored scene: nothing it holds may be dropped.
describe('demo scenes', () => {
  for (const d of DEMOS) {
    it(`${d.id} loads whole`, () => {
      const scene = demoScene(d.id)
      expect(normalizeScene(JSON.parse(JSON.stringify(scene)))).toEqual(scene)
    })
  }

  it('start has three layers with oscillators and effects', () => {
    const s = demoScene('start')
    expect(s.layers).toHaveLength(3)
    const mods = s.layers.flatMap((l) => Object.values(l.perVisual).flatMap((v) => Object.values(v.mods).flat()))
    expect(mods.some((m) => m.source.kind === 'lfo')).toBe(true)
    expect(s.layers.some((l) => l.effects.length > 0)).toBe(true)
    expect(s.effects.length).toBeGreaterThan(0)
  })

  it('mods maps every shared modulator and keeps its knobs and variations', () => {
    const s = demoScene('mods')
    expect(s.modulators).toHaveLength(4)
    expect(s.modulators.every((m) => m.dests.length >= 2)).toBe(true)
    expect(s.knobs.filter((k) => k.dests.length > 0)).toHaveLength(3)
    expect(s.variations).toHaveLength(2)
  })

  it('live has named columns, clips on both sides and a crossfader knob', () => {
    const s = demoScene('live')
    expect(s.layers.map((l) => l.side)).toEqual(['a', 'b'])
    expect(s.layers.every((l) => l.clips.filter(Boolean).length === 4)).toBe(true)
    expect(s.columns.slice(0, 4)).toEqual(['Calma', 'Pulso', 'Caos', 'Final'])
    expect(s.layers.some((l) => l.clips.some((c) => c?.launch === 'beat'))).toBe(true)
    expect(s.knobs[0].dests[0].target.kind).toBe('crossfade')
  })
})
