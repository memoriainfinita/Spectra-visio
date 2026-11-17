import { describe, expect, it } from 'vitest'
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

  it('show has all the visualizations in named columns, with the rest of the app on them', () => {
    const s = demoScene('show')
    const clips = s.layers.flatMap((l) => l.clips.filter((c) => c !== null))
    const shown = new Set(clips.map((c) => c!.visual))
    const builtin = visualsStore.get().filter((v) => v.id !== INPUT_VISUAL && !v.id.startsWith('user:'))
    for (const v of builtin) expect(shown.has(v.id), v.id).toBe(true)
    expect(s.columns.filter(Boolean)).toHaveLength(8)
    expect(demoScene('show', 'en').columns[0]).toBe('Dawn')
    expect(s.layers.map((l) => l.side)).toEqual(['a', 'b', null])
    // Every effect that draws is in a clip or in the composition.
    const types = new Set([...clips.flatMap((c) => c!.effects.map((e) => e.type)), ...s.effects.map((e) => e.type)])
    for (const id of EFFECTS.map((e) => e.id).filter((id) => id !== 'inputMix')) expect(types.has(id), id).toBe(true)
    expect(clips.some((c) => c!.launch === 'beat')).toBe(true)
    const sources = new Set(allMods(s).map((m) => m.source.kind))
    expect(sources).toEqual(new Set(['band', 'beat', 'lfo']))
    expect(s.modulators.length).toBeGreaterThan(0)
    expect(s.knobs.filter((k) => k.dests.length > 0).length).toBeGreaterThan(0)
    expect(s.variations).toHaveLength(2)
    expect(s.panel.filter(Boolean)).toHaveLength(11)
    expect(s.transition).toBeGreaterThan(0)
    expect(s.effects.length).toBeGreaterThan(0)
  })

  it('each moment has a palette of its own, and the layers start on the first moment with its effects', () => {
    const s = demoScene('show')
    const palette = (col: number) => s.layers.map((l) => l.clips[col]?.effects.find((e) => e.type === 'palette')?.params.palette)
    const used = new Set<number>()
    // The last moment is the shader's own colors, with no palette on the shader.
    for (let col = 0; col < 7; col++) {
      const p = palette(col)
      expect(new Set(p).size, `column ${col}`).toBe(1)
      expect(p[0]).toBeDefined()
      used.add(p[0]!)
    }
    expect(used.size).toBe(7)
    for (const l of s.layers) expect(l.effects.some((e) => e.type === 'palette')).toBe(true)
  })
})
