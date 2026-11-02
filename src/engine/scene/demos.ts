import type { BandRef, BeatRef, Curve, LfoShape, ModSource, Modulation } from '../modulation/modulation'
import type { ModDest, ModTarget, SharedModulator } from '../modulation/shared'
import type { Lang, MessageKey } from '../../i18n'
import type { Params } from '../render/visual'
import { COMP, LEVEL_KNOBS, PANEL_KNOBS, emptyKnobs, type Knob, type KnobDest, type KnobTarget, type Variation } from './knobs'
import { CLIP_COLUMNS } from './limits'
import { defaultScene, newLayer, normalizeScene, type BlendMode, type Clip, type EffectState, type LayerState, type SceneState, type Side, type VisualSettings } from './scene'

// Scenes that show what the app does, loaded from the presets panel: layers and blend modes,
// every kind of modulation source, shared modulators and knobs, every effect, clips, the
// crossfader, my panel and every visualization. Each one moves by itself (oscillators), so it
// can be tried without music, and reacts to the sound when there is any. Built from the same
// pieces as a saved scene and checked by the same normalization. The names they carry (columns,
// knobs, modulators) come in the language of the app.

export const DEMOS = [
  { id: 'start', name: 'demo.start', hint: 'demo.start.hint' },
  { id: 'sources', name: 'demo.sources', hint: 'demo.sources.hint' },
  { id: 'mods', name: 'demo.mods', hint: 'demo.mods.hint' },
  { id: 'fx', name: 'demo.fx', hint: 'demo.fx.hint' },
  { id: 'live', name: 'demo.live', hint: 'demo.live.hint' },
  { id: 'gallery', name: 'demo.gallery', hint: 'demo.gallery.hint' },
  { id: 'show', name: 'demo.show', hint: 'demo.show.hint' },
] as const satisfies readonly { id: string; name: MessageKey; hint: MessageKey }[]

export type DemoId = (typeof DEMOS)[number]['id']

// The names a demo gives to what it holds.
const NAMES = {
  es: {
    calm: 'Calma', pulse: 'Pulso', chaos: 'Caos', end: 'Final', intense: 'Intenso',
    breath: 'Respiración', bass: 'Graves', spin: 'Giro', color: 'Color', energy: 'Energía', mix: 'Mezcla', crossfader: 'Crossfader',
    glow: 'Brillo', feedback: 'Realimentación', kaleido: 'Caleidoscopio', mirror: 'Espejo', palette: 'Paleta', tone: 'Color', trails: 'Estelas', all: 'Todo junto',
    intro: 'Intro', flow: 'Flujo', burst: 'Estallido', geometry: 'Geometría', fractal: 'Fractal', cosmos: 'Cosmos', milkdrop: 'Milkdrop',
  },
  en: {
    calm: 'Calm', pulse: 'Pulse', chaos: 'Chaos', end: 'End', intense: 'Intense',
    breath: 'Breath', bass: 'Bass', spin: 'Spin', color: 'Color', energy: 'Energy', mix: 'Mix', crossfader: 'Crossfader',
    glow: 'Glow', feedback: 'Feedback', kaleido: 'Kaleidoscope', mirror: 'Mirror', palette: 'Palette', tone: 'Color', trails: 'Trails', all: 'All together',
    intro: 'Intro', flow: 'Flow', burst: 'Burst', geometry: 'Geometry', fractal: 'Fractal', cosmos: 'Cosmos', milkdrop: 'Milkdrop',
  },
} as const
type Names = (typeof NAMES)[Lang]

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

const param = (layerId: string, visual: string, p: string): ModTarget => ({ kind: 'param', layer: layerId, visual, param: p })
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

// Three layers blended on top of each other, oscillators on parameters, effects on a layer
// and on the whole composition.
function start(): SceneState {
  const [a, b, c] = [uid('l'), uid('l'), uid('l')]
  return build({
    layers: [
      layer(a, { visual: 'plasma', opacity: 0.35, settings: settings({ scale: 1.4 }, { hue: [mod(lfo('saw', 0.25), 1)] }) }),
      layer(b, {
        visual: 'tunnel',
        blend: 'add',
        opacity: 0.8,
        settings: settings({ rings: 20, twist: 1.5 }, { twist: [mod(lfo('sine', 0.5), 0.6)] }),
        effects: [effect('kaleido', { segments: 8 }, { rotation: [mod(lfo('saw', 0.25), 1)] })],
      }),
      layer(c, { visual: 'orbitals', blend: 'screen', opacity: 0.9, settings: settings({ particles: 220 }, { speed: [mod(lfo('triangle', 0.25), 0.5)] }) }),
    ],
    selected: 1,
    effects: [effect('bloom', { threshold: 0.6, strength: 0.9 }, { strength: [mod(beat('kick'), 0.4)] }), effect('color', { saturation: 1.2 })],
  })
}

// Shared modulators mapped onto several parameters at once, and knobs that move a group of
// them, with two variations to jump between.
function mods(n: Names): SceneState {
  const [a, b, c] = [uid('l'), uid('l'), uid('l')]
  const warp = param(c, 'starfield', 'warp')
  const bloom = fx(COMP, 'bloom', 'strength')
  const panel = knobs(PANEL_KNOBS, [
    knob(n.color, 0.2, dest(param(a, 'plasma', 'hue')), dest(param(b, 'kaleido', 'hue'), 1, 0)),
    knob(n.energy, 0.3, dest(warp), dest(bloom, 0.2, 1)),
    knob(n.mix, 0.55, dest(opacity(b)), dest(opacity(c), 1, 0)),
  ])
  const variations: Variation[] = [
    { id: uid('v'), name: n.calm, values: [0.2, 0.2, 0.8, 0, 0, 0, 0, 0], beats: 4 },
    { id: uid('v'), name: n.intense, values: [0.8, 0.9, 0.2, 0, 0, 0, 0, 0], beats: 4 },
  ]
  return build({
    layers: [
      layer(a, { visual: 'plasma', opacity: 0.4, settings: settings({ scale: 1.2 }) }),
      layer(b, { visual: 'kaleido', blend: 'screen', opacity: 0.55, settings: settings({ intensity: 0.45, sensitivity: 0.6 }) }),
      layer(c, { visual: 'starfield', blend: 'screen', opacity: 0.6 }),
    ],
    selected: 1,
    effects: [effect('bloom', { threshold: 0.7, strength: 0.4 })],
    modulators: [
      modulator(n.breath, lfo('sine', 0.25), [to(opacity(b), 0.3), to(param(a, 'plasma', 'scale'), 0.6)]),
      modulator(n.pulse, beat('kick'), [to(bloom, 0.3), to(warp, 0.5)], 'linear', 40),
      modulator(n.bass, band('bass'), [to(param(a, 'plasma', 'intensity'), 0.5), to(param(b, 'kaleido', 'sensitivity'), 0.2)], 'smooth'),
      modulator(n.spin, lfo('saw', 0.25), [to(param(a, 'plasma', 'hue'), 1), to(param(b, 'kaleido', 'hue'), -1)]),
    ],
    knobs: panel,
    compKnobs: knobs(LEVEL_KNOBS, []),
    variations,
  })
}

// Two sides of the crossfader, each with a row of clips in named columns, some that wait for
// the beat, and a knob on the crossfader.
function live(n: Names): SceneState {
  const [a, b] = [uid('l'), uid('l')]
  const columns = [n.calm, n.pulse, n.chaos, n.end, '', '', '', '', '']
  const sideA = row(
    clip('tunnel', settings({ rings: 14 }, { twist: [mod(lfo('sine', 0.25), 0.8)] })),
    clip('kaleido', settings(), { launch: 'beat' }),
    clip('polygons', settings({ sides: 5 }, { rings: [mod(lfo('triangle', 0.5), 0.5)] }), { launch: 'beat' }),
    clip('plasma', settings({ scale: 2 })),
  )
  const sideB = row(
    clip('orbitals', settings({ particles: 160 })),
    clip('starfield', settings({ warp: 1.6 }), { launch: 'beat' }),
    clip('fireworks', settings(), { launch: 'beat' }),
    clip('ribbons', settings({ rows: 7 }, { amplitude: [mod(lfo('sine', 0.5), 0.5)] })),
  )
  sideA[3] = { ...sideA[3]!, effects: [effect('mirror', { mode: 2 })] }
  sideB[0] = { ...sideB[0]!, effects: [effect('trails', { length: 1.2 })] }
  const layers = [
    layer(a, { visual: 'tunnel', side: 'a', settings: sideA[0]!.settings, clips: sideA }),
    layer(b, { visual: 'orbitals', side: 'b', blend: 'add', settings: sideB[0]!.settings, clips: sideB, effects: [effect('trails', { length: 1.2 })] }),
  ]
  return build({
    layers,
    crossfade: 0.5,
    selected: 0,
    columns,
    effects: [effect('bloom', { threshold: 0.6, strength: 0.7 })],
    knobs: knobs(PANEL_KNOBS, [knob(n.crossfader, 0.5, dest({ kind: 'crossfade' }))]),
    transition: 1.5,
    panel: [
      { kind: 'action', id: 'blackout' },
      { kind: 'action', id: 'freeze' },
      { kind: 'action', id: 'strobe' },
      { kind: 'action', id: 'crossA' },
      { kind: 'action', id: 'crossSwap' },
      { kind: 'action', id: 'crossB' },
      { kind: 'knob', ref: { bank: 'panel', i: 0 } },
      { kind: 'crossfade' },
      ...Array.from({ length: 8 }, () => null),
    ],
  })
}

// One layer for each kind of modulation source and each oscillator shape, on its own
// parameters: a band of the spectrum with a curve and smoothing, a beat of a band with its
// decay, and oscillators that follow the tempo or run free.
function sources(): SceneState {
  const [a, b, c, d] = [uid('l'), uid('l'), uid('l'), uid('l')]
  const freeSine: ModSource = { kind: 'lfo', shape: 'sine', rate: 0.2, sync: false }
  return build({
    layers: [
      layer(a, { visual: 'plasma', opacity: 0.45, settings: settings({ scale: 1.4 }, { hue: [mod(lfo('saw', 0.25), 1)], scale: [mod(freeSine, 0.5)], intensity: [mod(band('bass'), 0.6, 'exp', 150)] }) }),
      layer(b, { visual: 'tunnel', blend: 'add', opacity: 0.8, settings: settings({ rings: 16 }, { twist: [mod(lfo('triangle', 0.5), 0.6)], rings: [mod(beat('kick', 400), 0.4)] }) }),
      layer(c, { visual: 'orbitals', blend: 'screen', opacity: 0.85, settings: settings({ particles: 200 }, { speed: [mod(band('presence'), 0.5, 'log')] }) }),
      layer(d, { visual: 'polygons', blend: 'screen', opacity: 0.7, settings: settings({ sides: 5 }, { sides: [mod(lfo('square', 0.25), 0.3)], rings: [mod(beat('highMid', 200), 0.5)] }) }),
    ],
    selected: 0,
    effects: [effect('bloom', { threshold: 0.6, strength: 0.6 })],
  })
}

// Every effect on its own, one in each column, and three chained in the last: launch a
// column to see it. Oscillators move some of their parameters.
function effects(n: Names): SceneState {
  const [a, b] = [uid('l'), uid('l')]
  const base = () => settings({ rings: 18 }, { twist: [mod(lfo('sine', 0.25), 0.8)] })
  const chains = (): EffectState[][] => [
    [effect('bloom', { threshold: 0.4, strength: 1.4 }, { strength: [mod(beat('kick'), 0.5)] })],
    [effect('feedback', { length: 1.2, zoom: 0.3, rotation: 20, hueShift: 30 })],
    [effect('kaleido', { segments: 8 }, { rotation: [mod(lfo('saw', 0.25), 1)] })],
    [effect('mirror', { mode: 2 })],
    [effect('palette', { palette: 1, amount: 1 }, { offset: [mod(lfo('sine', 0.25), 1)] })],
    [effect('color', { saturation: 1.6, contrast: 1.2 }, { hue: [mod(lfo('saw', 0.25), 1)] })],
    [effect('trails', { length: 1.5 })],
    [effect('kaleido', { segments: 6 }), effect('bloom', { threshold: 0.5, strength: 1 }), effect('color', { saturation: 1.3 })],
  ]
  const clips = row(...chains().map((fxs) => ({ ...clip('tunnel', base()), effects: fxs })))
  return build({
    layers: [
      layer(a, { visual: 'plasma', opacity: 0.3 }),
      layer(b, { visual: 'tunnel', blend: 'add', opacity: 0.9, settings: base(), clips, active: 0, effects: chains()[0] }),
    ],
    selected: 1,
    columns: [n.glow, n.feedback, n.kaleido, n.mirror, n.palette, n.tone, n.trails, n.all, ''],
  })
}

// All the visualizations as clips, in three layers by family: pick a layer and launch a
// clip, or let the crossfader move between the two sides. Layers fade from one clip to the next.
function gallery(): SceneState {
  const [a, b, c] = [uid('l'), uid('l'), uid('l')]
  const spectrum = ['bars', 'radialBars', 'oscilloscope', 'spectrogram', 'ribbons', 'lissajous', 'radialWave']
  const shapes = ['kaleido', 'tunnel', 'polygons', 'cells', 'gridWarp', 'julia', 'kifs']
  const space = ['starfield', 'orbitals', 'fireworks', 'strobeBloom', 'terrain', 'warpTunnel', 'plasma', 'milkdrop']
  const rowOf = (ids: string[]) => row(...ids.map((id) => clip(id)))
  return build({
    layers: [
      layer(a, { visual: spectrum[0], side: 'a', clips: rowOf(spectrum), active: 0 }),
      layer(b, { visual: shapes[0], side: 'b', blend: 'add', opacity: 0.9, clips: rowOf(shapes), active: 0 }),
      layer(c, { visual: space[0], blend: 'screen', opacity: 0.6, clips: rowOf(space), active: 0 }),
    ],
    crossfade: 0.5,
    selected: 0,
    transition: 1.5,
  })
}

// A whole set in one scene: the gallery's three layers by family, now with a column for each
// moment (a visualization from every layer launched together), effects and oscillators on the
// clips, some that wait for the beat, shared modulators, knobs, two variations, the crossfader,
// a transition and my panel with all of it at hand. Every visualization is in it.
function show(n: Names): SceneState {
  const [a, b, c] = [uid('l'), uid('l'), uid('l')]
  // Spectrum on side A, shapes and fractals on side B, space and shader across both.
  const moments: { name: string; a: Clip; b: Clip; c: Clip }[] = [
    {
      name: n.intro,
      a: { ...clip('oscilloscope'), effects: [effect('palette', { palette: 2, amount: 1 }, { offset: [mod(lfo('sine', 0.25), 1)] })] },
      b: clip('kaleido', settings({}, { hue: [mod(lfo('saw', 0.25), 1)] })),
      c: clip('starfield', settings({ warp: 1.2 })),
    },
    {
      name: n.pulse,
      a: clip('bars'),
      b: { ...clip('tunnel', settings({ rings: 16 }, { twist: [mod(lfo('sine', 0.25), 0.8)] })), effects: [effect('color', { saturation: 1.4 })] },
      c: clip('orbitals', settings({ particles: 200 }, { speed: [mod(beat('kick', 300), 0.5)] })),
    },
    {
      name: n.flow,
      a: { ...clip('ribbons', settings({ rows: 7 }, { amplitude: [mod(lfo('sine', 0.5), 0.5)] })), effects: [effect('trails', { length: 1.3 })] },
      b: clip('gridWarp'),
      c: clip('plasma', settings({ scale: 1.6 }, { hue: [mod(lfo('saw', 0.25), 1)] })),
    },
    {
      name: n.burst,
      a: clip('radialBars'),
      b: { ...clip('polygons', settings({ sides: 5 }, { rings: [mod(lfo('triangle', 0.5), 0.5)] })), launch: 'beat' },
      c: { ...clip('fireworks'), launch: 'beat', effects: [effect('bloom', { threshold: 0.4, strength: 1.4 }, { strength: [mod(beat('kick'), 0.5)] })] },
    },
    {
      name: n.geometry,
      a: clip('lissajous'),
      b: { ...clip('cells'), effects: [effect('mirror', { mode: 2 })] },
      c: clip('warpTunnel'),
    },
    {
      name: n.fractal,
      a: clip('radialWave'),
      b: { ...clip('julia'), effects: [effect('kaleido', { segments: 8 }, { rotation: [mod(lfo('saw', 0.25), 1)] })] },
      c: clip('terrain'),
    },
    {
      name: n.cosmos,
      a: clip('spectrogram'),
      b: clip('kifs'),
      c: { ...clip('strobeBloom'), launch: 'beat', effects: [effect('feedback', { length: 1.2, zoom: 0.3, rotation: 20, hueShift: 30 })] },
    },
    { name: n.milkdrop, a: clip('bars', settings({}, { sensitivity: [mod(band('bass'), 0.4)] })), b: clip('kaleido'), c: clip('milkdrop') },
  ]
  const col = (k: 'a' | 'b' | 'c') => row(...moments.map((m) => m[k]))
  const bloom = fx(COMP, 'bloom', 'strength')
  const tint = fx(COMP, 'color', 'hue')
  const panel = knobs(PANEL_KNOBS, [
    knob(n.color, 0.2, dest(tint, 0, 1), dest(opacity(b), 0.4, 1)),
    knob(n.energy, 0.3, dest(bloom, 0.2, 1), dest(opacity(c), 0.2, 0.9)),
    knob(n.mix, 0.55, dest({ kind: 'crossfade' })),
  ])
  const variations: Variation[] = [
    { id: uid('v'), name: n.calm, values: [0.2, 0.2, 0.3, 0, 0, 0, 0, 0], beats: 4 },
    { id: uid('v'), name: n.intense, values: [0.8, 0.9, 0.7, 0, 0, 0, 0, 0], beats: 4 },
  ]
  return build({
    layers: [
      layer(a, { visual: 'oscilloscope', side: 'a', clips: col('a'), active: 0, effects: moments[0].a.effects.map((e) => ({ ...e, id: uid('e') })) }),
      layer(b, { visual: 'kaleido', side: 'b', blend: 'add', opacity: 0.9, clips: col('b'), active: 0, settings: moments[0].b.settings }),
      layer(c, { visual: 'starfield', blend: 'screen', opacity: 0.6, clips: col('c'), active: 0, settings: moments[0].c.settings }),
    ],
    crossfade: 0.5,
    selected: 0,
    transition: 1.5,
    columns: [...moments.map((m) => m.name), ''],
    effects: [effect('bloom', { threshold: 0.6, strength: 0.7 }, { strength: [mod(beat('kick'), 0.3)] }), effect('color', { saturation: 1.15 })],
    modulators: [
      modulator(n.breath, lfo('sine', 0.25), [to(opacity(b), 0.3), to(opacity(c), 0.3)]),
      modulator(n.pulse, beat('kick'), [to(bloom, 0.3)], 'linear', 40),
      modulator(n.bass, band('bass'), [to(tint, 0.2)], 'smooth'),
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

export function demoScene(id: DemoId, lang: Lang = 'es'): SceneState {
  const n = NAMES[lang]
  if (id === 'sources') return sources()
  if (id === 'mods') return mods(n)
  if (id === 'fx') return effects(n)
  if (id === 'live') return live(n)
  if (id === 'gallery') return gallery()
  if (id === 'show') return show(n)
  return start()
}
