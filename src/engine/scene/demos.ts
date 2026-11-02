import type { BandRef, BeatRef, Curve, LfoShape, ModSource, Modulation } from '../modulation/modulation'
import type { ModDest, ModTarget, SharedModulator } from '../modulation/shared'
import type { MessageKey } from '../../i18n'
import type { Params } from '../render/visual'
import { COMP, LEVEL_KNOBS, PANEL_KNOBS, emptyKnobs, type Knob, type KnobDest, type KnobTarget, type Variation } from './knobs'
import { CLIP_COLUMNS } from './limits'
import { defaultScene, newLayer, normalizeScene, type BlendMode, type Clip, type EffectState, type LayerState, type SceneState, type Side, type VisualSettings } from './scene'

// Scenes that show what the app does, loaded from the presets panel. Each one moves by itself
// (oscillators), so it can be tried without music, and reacts to the sound when there is any.
// Built from the same pieces as a saved scene and checked by the same normalization.

export const DEMOS = [
  { id: 'start', name: 'demo.start', hint: 'demo.start.hint' },
  { id: 'mods', name: 'demo.mods', hint: 'demo.mods.hint' },
  { id: 'live', name: 'demo.live', hint: 'demo.live.hint' },
] as const satisfies readonly { id: string; name: MessageKey; hint: MessageKey }[]

export type DemoId = (typeof DEMOS)[number]['id']

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
}

function layer(id: string, s: LayerSpec): LayerState {
  const base = newLayer(id, s.visual, s.side ?? null)
  return { ...base, blend: s.blend ?? 'normal', opacity: s.opacity ?? 1, effects: s.effects ?? [], perVisual: s.settings ? { [s.visual]: s.settings } : {}, clips: s.clips ?? base.clips }
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
function mods(): SceneState {
  const [a, b, c] = [uid('l'), uid('l'), uid('l')]
  const warp = param(c, 'starfield', 'warp')
  const bloom = fx(COMP, 'bloom', 'strength')
  const panel = knobs(PANEL_KNOBS, [
    knob('Color', 0.2, dest(param(a, 'plasma', 'hue')), dest(param(b, 'kaleido', 'hue'), 1, 0)),
    knob('Energía', 0.3, dest(warp), dest(bloom, 0.2, 1)),
    knob('Mezcla', 0.55, dest(opacity(b)), dest(opacity(c), 1, 0)),
  ])
  const variations: Variation[] = [
    { id: uid('v'), name: 'Calma', values: [0.2, 0.2, 0.8, 0, 0, 0, 0, 0], beats: 4 },
    { id: uid('v'), name: 'Intenso', values: [0.8, 0.9, 0.2, 0, 0, 0, 0, 0], beats: 4 },
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
      modulator('Respiración', lfo('sine', 0.25), [to(opacity(b), 0.3), to(param(a, 'plasma', 'scale'), 0.6)]),
      modulator('Pulso', beat('kick'), [to(bloom, 0.3), to(warp, 0.5)], 'linear', 40),
      modulator('Graves', band('bass'), [to(param(a, 'plasma', 'intensity'), 0.5), to(param(b, 'kaleido', 'sensitivity'), 0.2)], 'smooth'),
      modulator('Giro', lfo('saw', 0.25), [to(param(a, 'plasma', 'hue'), 1), to(param(b, 'kaleido', 'hue'), -1)]),
    ],
    knobs: panel,
    compKnobs: knobs(LEVEL_KNOBS, []),
    variations,
  })
}

// Two sides of the crossfader, each with a row of clips in named columns, some that wait for
// the beat, and a knob on the crossfader.
function live(): SceneState {
  const [a, b] = [uid('l'), uid('l')]
  const columns = ['Calma', 'Pulso', 'Caos', 'Final', '', '', '', '', '']
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
    knobs: knobs(PANEL_KNOBS, [knob('Crossfader', 0.5, dest({ kind: 'crossfade' }))]),
  })
}

export function demoScene(id: DemoId): SceneState {
  if (id === 'mods') return mods()
  if (id === 'live') return live()
  return start()
}
