import type { BandRef, BeatRef, Curve, LfoShape, ModSource, Modulation } from '../modulation/modulation'
import type { ModDest, ModTarget, SharedModulator } from '../modulation/shared'
import type { Lang, MessageKey } from '../../i18n'
import type { Params } from '../render/visual'
import { COMP, PANEL_KNOBS, emptyKnobs, type Knob, type KnobDest, type KnobTarget, type Variation } from './knobs'
import { CLIP_COLUMNS } from './limits'
import { defaultScene, newLayer, normalizeScene, type BlendMode, type Clip, type EffectState, type LayerState, type SceneState, type Side, type VisualSettings } from './scene'

// The scene that shows what the app does, loaded from the presets panel: three layers by
// family, a column for each moment with a look of its own (a palette per column) and one thing
// to learn from it, effects, oscillators and beats on the clips, shared modulators, knobs,
// variations, the crossfader and my panel. Every visualization is in it. It moves by itself
// (oscillators), so it can be tried without music, and reacts to the sound when there is any.
// Built from the same pieces as a saved scene and checked by the same normalization. The names
// it carries (columns, knobs, modulators) come in the language of the app. More scenes can be
// added to the list.

export const DEMOS = [{ id: 'show', name: 'demo.show', hint: 'demo.show.hint' }] as const satisfies readonly { id: string; name: MessageKey; hint: MessageKey }[]

export type DemoId = (typeof DEMOS)[number]['id']

// The names a demo gives to what it holds.
const NAMES = {
  es: {
    calm: 'Calma', pulse: 'Pulso', intense: 'Intenso', breath: 'Respiración', bass: 'Graves',
    color: 'Color', energy: 'Energía', mix: 'Mezcla',
    intro: 'Amanecer', flow: 'Flujo', burst: 'Estallido', geometry: 'Geometría', fractal: 'Fractal', cosmos: 'Cosmos', milkdrop: 'Milkdrop',
  },
  en: {
    calm: 'Calm', pulse: 'Pulse', intense: 'Intense', breath: 'Breath', bass: 'Bass',
    color: 'Color', energy: 'Energy', mix: 'Mix',
    intro: 'Dawn', flow: 'Flow', burst: 'Burst', geometry: 'Geometry', fractal: 'Fractal', cosmos: 'Cosmos', milkdrop: 'Milkdrop',
  },
} as const
type Names = (typeof NAMES)[Lang]

// Rows of the palette effect (src/engine/effects/palettes.ts).
const PALETTE = { fire: 0, ice: 1, neon: 2, sunset: 3, forest: 4, ocean: 5, mono: 6, rainbow: 7 } as const

let seq = 0
// Ids are unique in a scene; a counter keeps loading the same demo twice apart.
const uid = (prefix: string) => `${prefix}${Date.now().toString(36)}${++seq}`

const lfo = (shape: LfoShape, rate: number): ModSource => ({ kind: 'lfo', shape, rate, sync: true })
const beat = (band: BeatRef = 'kick', decay = 250): ModSource => ({ kind: 'beat', band, decay })
const band = (b: BandRef): ModSource => ({ kind: 'band', band: b })
const mod = (source: ModSource, amount: number, curve: Curve = 'linear', smoothing = 0): Modulation => ({ id: uid('m'), source, amount, curve, smoothing })

const settings = (params: Params = {}, mods: Record<string, Modulation[]> = {}): VisualSettings => ({ params, mods })
const effect = (type: string, params: Params = {}, mods: Record<string, Modulation[]> = {}): EffectState => ({ id: uid('e'), type, enabled: true, ...settings(params, mods) })
const clip = (visual: string, s: VisualSettings = settings(), extra: Partial<Clip> = {}): Clip => ({ visual, settings: s, effects: [], ...extra })
const row = (...list: Clip[]): (Clip | null)[] => Array.from({ length: CLIP_COLUMNS }, (_, i) => list[i] ?? null)

interface LayerSpec {
  visual: string
  blend?: BlendMode
  opacity?: number
  side?: Side | null
  settings?: VisualSettings
  effects?: EffectState[]
  clips?: (Clip | null)[]
  // Column of the clip it starts on.
  active?: number
}

function layer(id: string, s: LayerSpec): LayerState {
  const base = newLayer(id, s.visual, s.side ?? null)
  return { ...base, blend: s.blend ?? 'normal', opacity: s.opacity ?? 1, effects: s.effects ?? [], perVisual: s.settings ? { [s.visual]: s.settings } : {}, clips: s.clips ?? base.clips, active: s.active ?? null }
}

const fx = (owner: string, type: string, p: string, nth = 0): ModTarget => ({ kind: 'effect', owner, type, nth, param: p })
const opacity = (layerId: string): ModTarget => ({ kind: 'opacity', layer: layerId })
const dest = (target: KnobTarget, from = 0, to = 1): KnobDest => ({ target, from, to })
const knobs = (n: number, list: Knob[]): Knob[] => [...list, ...emptyKnobs(n)].slice(0, n)
const knob = (name: string, value: number, ...dests: KnobDest[]): Knob => ({ name, value, dests })
const to = (target: ModTarget, amount: number): ModDest => ({ target, amount })
const modulator = (name: string, source: ModSource, dests: ModDest[], curve: Curve = 'linear', smoothing = 0): SharedModulator => ({ id: uid('s'), name, source, curve, smoothing, dests })

function build(parts: Partial<SceneState> & { layers: LayerState[] }): SceneState {
  return normalizeScene({ ...defaultScene(), ...parts })
}

// A palette for a clip: the visualization is drawn in its colors, and the palette drifts slowly.
const tint = (palette: number): EffectState => effect('palette', { palette, amount: 1 }, { offset: [mod(lfo('sine', 0.125), 0.15)] })

// A whole set in one scene: three layers by family (spectrum on side A, shapes and fractals on
// side B, space and shader across both), and a column for each moment that launches one
// visualization on every layer. Each moment has its own palette, and shows one thing:
//   Dawn      three layers blended, oscillators on parameters
//   Pulse     a beat of the kick moves the parameters, and a bloom
//   Flow      a band of the spectrum with smoothing, trails
//   Burst     clips that wait for the beat to launch
//   Geometry  the mirror effect
//   Fractal   the kaleidoscope effect turning on its own
//   Cosmos    feedback
//   Milkdrop  a presets visualization and a color effect on its own
function show(n: Names): SceneState {
  const [a, b, c] = [uid('l'), uid('l'), uid('l')]
  const moments: { name: string; a: Clip; b: Clip; c: Clip }[] = [
    {
      name: n.intro,
      a: { ...clip('oscilloscope', settings({ thickness: 2 })), effects: [tint(PALETTE.ocean)] },
      b: { ...clip('kaleido', settings({ intensity: 1.3 }, { segments: [mod(lfo('triangle', 0.125), 0.5)] })), effects: [tint(PALETTE.ocean)] },
      c: { ...clip('starfield', settings({ warp: 1.2 })), effects: [tint(PALETTE.ocean)] },
    },
    {
      name: n.pulse,
      a: { ...clip('bars', settings({ bars: 40 })), effects: [tint(PALETTE.neon)] },
      b: { ...clip('tunnel', settings({ rings: 16, intensity: 1.4 }, { twist: [mod(lfo('sine', 0.25), 0.8)], rings: [mod(beat('kick', 400), 0.3)] })), effects: [tint(PALETTE.neon), effect('bloom', { threshold: 0.35, strength: 0.9 }, { strength: [mod(beat('kick'), 0.5)] })] },
      c: { ...clip('orbitals', settings({ particles: 220 }, { speed: [mod(beat('kick', 300), 0.5)] })), effects: [tint(PALETTE.neon)] },
    },
    {
      name: n.flow,
      a: { ...clip('ribbons', settings({ rows: 7 }, { amplitude: [mod(lfo('sine', 0.5), 0.5)] })), effects: [tint(PALETTE.sunset), effect('trails', { length: 1.3 })] },
      b: { ...clip('gridWarp', settings({}, { warp: [mod(band('bass'), 0.6, 'smooth', 150)] })), effects: [tint(PALETTE.sunset)] },
      c: { ...clip('plasma', settings({ scale: 1.6 }, { scale: [mod(lfo('sine', 0.125), 0.4)] })), effects: [tint(PALETTE.sunset)] },
    },
    {
      name: n.burst,
      a: { ...clip('radialBars'), effects: [tint(PALETTE.fire)] },
      b: { ...clip('polygons', settings({ sides: 5 }, { rings: [mod(lfo('triangle', 0.5), 0.5)] })), launch: 'beat', effects: [tint(PALETTE.fire)] },
      c: { ...clip('fireworks'), launch: 'beat', effects: [tint(PALETTE.fire), effect('bloom', { threshold: 0.4, strength: 1.4 }, { strength: [mod(beat('kick'), 0.5)] })] },
    },
    {
      name: n.geometry,
      a: { ...clip('lissajous'), effects: [tint(PALETTE.ice)] },
      b: { ...clip('cells'), effects: [tint(PALETTE.ice), effect('mirror', { mode: 2 })] },
      c: { ...clip('warpTunnel'), effects: [tint(PALETTE.ice)] },
    },
    {
      name: n.fractal,
      a: { ...clip('radialWave'), effects: [tint(PALETTE.forest)] },
      b: { ...clip('julia'), effects: [tint(PALETTE.forest), effect('kaleido', { segments: 8 }, { rotation: [mod(lfo('saw', 0.25), 1)] })] },
      c: { ...clip('terrain'), effects: [tint(PALETTE.forest)] },
    },
    {
      name: n.cosmos,
      a: { ...clip('spectrogram'), effects: [tint(PALETTE.rainbow)] },
      b: { ...clip('kifs', settings({ intensity: 0.7 })), effects: [tint(PALETTE.rainbow)] },
      c: { ...clip('strobeBloom', settings({ flash: 0.4 })), launch: 'beat', effects: [tint(PALETTE.rainbow), effect('feedback', { length: 0.7, zoom: 0.15, rotation: 10, hueShift: 20 })] },
    },
    {
      name: n.milkdrop,
      a: { ...clip('bars', settings({}, { sensitivity: [mod(band('bass'), 0.4)] })), effects: [tint(PALETTE.mono)] },
      b: { ...clip('kaleido'), effects: [effect('color', { saturation: 1.3 }, { hue: [mod(lfo('saw', 0.125), 1)] })] },
      c: clip('milkdrop'),
    },
  ]
  const col = (k: 'a' | 'b' | 'c') => row(...moments.map((m) => m[k]))
  // The layers start on the first moment, with its effects.
  const first = (k: 'a' | 'b' | 'c') => moments[0][k].effects.map((e) => ({ ...e, id: uid('e') }))
  const bloom = fx(COMP, 'bloom', 'strength')
  const hue = fx(COMP, 'color', 'hue')
  const panel = knobs(PANEL_KNOBS, [
    knob(n.color, 0, dest(hue, 0, 1)),
    knob(n.energy, 0.3, dest(bloom, 0.2, 1), dest(opacity(c), 0.2, 0.9)),
    knob(n.mix, 0.5, dest({ kind: 'crossfade' })),
  ])
  const variations: Variation[] = [
    { id: uid('v'), name: n.calm, values: [0, 0.2, 0.3, 0, 0, 0, 0, 0], beats: 4 },
    { id: uid('v'), name: n.intense, values: [0.3, 0.9, 0.7, 0, 0, 0, 0, 0], beats: 4 },
  ]
  return build({
    layers: [
      layer(a, { visual: 'oscilloscope', side: 'a', clips: col('a'), active: 0, settings: moments[0].a.settings, effects: first('a') }),
      layer(b, { visual: 'kaleido', side: 'b', blend: 'add', opacity: 0.9, clips: col('b'), active: 0, settings: moments[0].b.settings, effects: first('b') }),
      layer(c, { visual: 'starfield', blend: 'screen', opacity: 0.6, clips: col('c'), active: 0, settings: moments[0].c.settings, effects: first('c') }),
    ],
    crossfade: 0.5,
    selected: 0,
    transition: 1.5,
    columns: [...moments.map((m) => m.name), ''],
    effects: [effect('bloom', { threshold: 0.6, strength: 0.7 }, { strength: [mod(beat('kick'), 0.3)] }), effect('color', { saturation: 1.15 })],
    modulators: [
      modulator(n.breath, lfo('sine', 0.25), [to(opacity(b), 0.3), to(opacity(c), 0.3)]),
      modulator(n.pulse, beat('kick'), [to(bloom, 0.3)], 'linear', 40),
      modulator(n.bass, band('bass'), [to(hue, 0.1)], 'smooth'),
    ],
    knobs: panel,
    variations,
    panel: [
      { kind: 'knob', ref: { bank: 'panel', i: 0 } },
      { kind: 'knob', ref: { bank: 'panel', i: 1 } },
      { kind: 'knob', ref: { bank: 'panel', i: 2 } },
      { kind: 'action', id: 'variation1' },
      { kind: 'action', id: 'variation2' },
      { kind: 'action', id: 'blackout' },
      { kind: 'action', id: 'freeze' },
      { kind: 'action', id: 'strobe' },
      { kind: 'action', id: 'crossA' },
      { kind: 'action', id: 'crossSwap' },
      { kind: 'action', id: 'crossB' },
      ...Array.from({ length: 5 }, () => null),
    ],
  })
}

export function demoScene(_id: DemoId, lang: Lang = 'es'): SceneState {
  return show(NAMES[lang])
}
