import {
  BAND_REFS,
  BEAT_REFS,
  CURVES,
  DECAY_MAX,
  DECAY_MIN,
  LFO_RATE_MAX,
  LFO_RATE_MIN,
  LFO_SHAPES,
  SMOOTHING_MAX,
  SYNC_RATES,
  type ModSource,
  type Modulation,
} from '../modulation/modulation'
import { MAX_EFFECTS, getEffect } from '../effects/registry'
import { isControl } from '../midi/midi'
import { CLIP_COLUMNS, MAX_LAYERS } from './limits'
import { defaultOverlays, normalizeOverlays, type OverlaySettings } from '../overlay/settings'
import { clampParam, defaultParams, getVisual, paramsOf } from '../render/registry'
import type { ParamDef, Params } from '../render/visual'

// What is on screen, as in a VJ composition: a stack of layers, each blended onto the ones
// below with its opacity, the crossfader between the layers of side A and side B, and the
// effects applied to the result. Each layer keeps a row of clips to launch.

export const BLEND_MODES = ['normal', 'add', 'screen', 'multiply', 'difference', 'lighten'] as const
export type BlendMode = (typeof BLEND_MODES)[number]

// 2 added the effect chain, 3 the overlays, 4 the layer stack and the clips. Older scenes
// load as two layers, A and B, with the old blend on B.
export const SCENE_VERSION = 4

export { CLIP_COLUMNS, MAX_LAYERS } from './limits'
export const SIDES = ['a', 'b'] as const
export type Side = (typeof SIDES)[number]
export const DEFAULT_VISUAL = 'kaleido'

// Tweaks per visualization, kept when the layer switches away and back.
export interface VisualSettings {
  params: Params
  // Parameter id → modulations.
  mods: Record<string, Modulation[]>
}

// One entry of an effect chain. `id` tells two entries of the same effect apart, in the
// whole scene.
export interface EffectState extends VisualSettings {
  id: string
  type: string
  enabled: boolean
}

// What a clip holds, and a preset too: a visualization with its settings and the layer's effects.
export interface Clip {
  visual: string
  settings: VisualSettings
  effects: EffectState[]
  // 'beat' waits for the next beat; missing launches at once. Presets leave it out.
  launch?: LaunchMode
}

export const LAUNCH_MODES = ['press', 'beat'] as const
export type LaunchMode = (typeof LAUNCH_MODES)[number]

export interface LayerState {
  // Stable while layers are added, removed and moved.
  id: string
  visual: string
  perVisual: Record<string, VisualSettings>
  opacity: number
  // How the layer is drawn onto the layers below.
  blend: BlendMode
  // Off: not drawn.
  bypass: boolean
  // While any layer is solo, only solo layers are drawn.
  solo: boolean
  // Side of the crossfader; null: the crossfader does not touch it.
  side: Side | null
  // Applied to this layer before it is blended.
  effects: EffectState[]
  // CLIP_COLUMNS cells; null is empty.
  clips: (Clip | null)[]
  // Column of the clip last launched on this layer; null after a change by hand.
  active: number | null
}

export interface SceneState {
  version: typeof SCENE_VERSION
  // Bottom first.
  layers: LayerState[]
  // 0: side A at full and B hidden; 0.5: both at full; 1: B at full and A hidden.
  crossfade: number
  // Index of the layer the panels edit.
  selected: number
  // Composition effects, applied in order after the layers are blended.
  effects: EffectState[]
  // Seconds a layer takes to fade from one visualization to the next; 0 cuts.
  transition: number
  overlays: OverlaySettings
}

export const TRANSITION_MAX = 10

let seq = 0
// Unique enough across visits: time plus a counter.
export const newId = (prefix: string) => `${prefix}${Date.now().toString(36)}${++seq}`

export function newLayer(id: string, visual = DEFAULT_VISUAL, side: Side | null = null): LayerState {
  return { id, visual, perVisual: {}, opacity: 1, blend: 'normal', bypass: false, solo: false, side, effects: [], clips: new Array(CLIP_COLUMNS).fill(null), active: null }
}

export function defaultScene(): SceneState {
  return {
    version: SCENE_VERSION,
    layers: [newLayer('l1', 'kaleido', 'a'), newLayer('l2', 'tunnel', 'b')],
    crossfade: 0,
    selected: 0,
    effects: [],
    transition: 1.5,
    overlays: defaultOverlays(),
  }
}

// How much of the layer is drawn, 0 to 1: opacity, bypass, solo and the crossfader.
export function layerAmount(scene: SceneState, i: number): number {
  const l = scene.layers[i]
  if (!l || l.bypass || (!l.solo && scene.layers.some((x) => x.solo))) return 0
  const x = scene.crossfade
  const side = l.side === 'a' ? Math.min(1, 2 * (1 - x)) : l.side === 'b' ? Math.min(1, 2 * x) : 1
  return l.opacity * side
}

// Settings of `visual` in this layer: the current one unless told otherwise.
export function visualSettings(layer: LayerState, visual = layer.visual): VisualSettings {
  const saved = layer.perVisual[visual]
  if (saved) return saved
  const def = getVisual(visual)
  return { params: def ? defaultParams(def) : {}, mods: {} }
}

export function clipOf(layer: LayerState): Clip {
  return { visual: layer.visual, settings: visualSettings(layer), effects: layer.effects }
}

// Puts a clip on a layer. Its effects get new ids, so the same clip on two layers keeps
// two histories. `column` marks the layer as playing that cell.
export function applyClip(scene: SceneState, i: number, clip: Clip, column: number | null = null): SceneState {
  const l = scene.layers[i]
  if (!l || !getVisual(clip.visual)) return scene
  const layers = [...scene.layers]
  layers[i] = {
    ...l,
    visual: clip.visual,
    perVisual: { ...l.perVisual, [clip.visual]: clip.settings },
    effects: clip.effects.map((e) => ({ ...e, id: newId('fx') })),
    active: column,
  }
  return { ...scene, layers }
}

// --- Normalization of stored data ---

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const num = (v: unknown, min: number, max: number, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : fallback)
const oneOf = <T>(v: unknown, list: readonly T[], fallback: T): T => (list.includes(v as T) ? (v as T) : fallback)

function normalizeSource(raw: unknown): ModSource | null {
  if (!isObj(raw)) return null
  if (raw.kind === 'band') return { kind: 'band', band: oneOf(raw.band, BAND_REFS, 'bass') }
  if (raw.kind === 'beat') return { kind: 'beat', band: oneOf(raw.band, BEAT_REFS, 'kick'), decay: num(raw.decay, DECAY_MIN, DECAY_MAX, 250) }
  if (raw.kind === 'lfo') {
    const sync = raw.sync === true
    const rate = sync ? oneOf(raw.rate, SYNC_RATES, 1) : num(raw.rate, LFO_RATE_MIN, LFO_RATE_MAX, 1)
    return { kind: 'lfo', shape: oneOf(raw.shape, LFO_SHAPES, 'sine'), rate, sync }
  }
  if (raw.kind === 'midi') return { kind: 'midi', control: isControl(raw.control) ? raw.control : null }
  return null
}

export function normalizeModulation(raw: unknown): Modulation | null {
  if (!isObj(raw) || typeof raw.id !== 'string') return null
  const source = normalizeSource(raw.source)
  if (!source) return null
  return {
    id: raw.id,
    source,
    amount: num(raw.amount, -1, 1, 0.5),
    curve: oneOf(raw.curve, CURVES, 'linear'),
    smoothing: num(raw.smoothing, 0, SMOOTHING_MAX, 0),
  }
}

// Parameters clamped to their ranges and modulations checked, against `defs`.
function normalizeSettings(defs: ParamDef[], raw: Record<string, unknown>): VisualSettings {
  const params: Params = Object.fromEntries(defs.map((p) => [p.id, p.default]))
  const mods: Record<string, Modulation[]> = {}
  const rawParams = isObj(raw.params) ? raw.params : {}
  const rawMods = isObj(raw.mods) ? raw.mods : {}
  for (const p of defs) {
    const v = rawParams[p.id]
    if (typeof v === 'number' && Number.isFinite(v)) params[p.id] = clampParam(p, v)
    const list = rawMods[p.id]
    if (Array.isArray(list)) {
      const valid = list.map(normalizeModulation).filter((m): m is Modulation => m !== null)
      if (valid.length) mods[p.id] = valid
    }
  }
  return { params, mods }
}

export function normalizeVisualSettings(visualId: string, raw: unknown): VisualSettings | null {
  const def = getVisual(visualId)
  if (!def || !isObj(raw)) return null
  return normalizeSettings(paramsOf(def), raw)
}

export function normalizeEffect(raw: unknown): EffectState | null {
  if (!isObj(raw) || typeof raw.id !== 'string' || typeof raw.type !== 'string') return null
  const def = getEffect(raw.type)
  if (!def) return null
  return { id: raw.id, type: raw.type, enabled: raw.enabled !== false, ...normalizeSettings(def.params, raw) }
}

// Unknown effects and repeated ids are dropped.
export function normalizeEffects(raw: unknown): EffectState[] {
  if (!Array.isArray(raw)) return []
  const out: EffectState[] = []
  for (const r of raw) {
    const e = normalizeEffect(r)
    if (e && !out.some((x) => x.id === e.id)) out.push(e)
    if (out.length === MAX_EFFECTS) break
  }
  return out
}

export function defaultEffectParams(type: string): Params {
  const def = getEffect(type)
  return def ? Object.fromEntries(def.params.map((p) => [p.id, p.default])) : {}
}

function normalizeClip(raw: unknown): Clip | null {
  if (!isObj(raw) || typeof raw.visual !== 'string') return null
  const settings = normalizeVisualSettings(raw.visual, isObj(raw.settings) ? raw.settings : {})
  if (!settings) return null
  const clip: Clip = { visual: raw.visual, settings, effects: normalizeEffects(raw.effects) }
  if (raw.launch === 'beat') clip.launch = 'beat'
  return clip
}

function normalizeLayer(raw: unknown, fallback: LayerState): LayerState {
  if (!isObj(raw)) return fallback
  const visual = typeof raw.visual === 'string' && getVisual(raw.visual) ? raw.visual : fallback.visual
  const perVisual: Record<string, VisualSettings> = {}
  if (isObj(raw.perVisual)) {
    for (const [id, v] of Object.entries(raw.perVisual)) {
      const s = normalizeVisualSettings(id, v)
      if (s) perVisual[id] = s
    }
  }
  const rawClips = Array.isArray(raw.clips) ? raw.clips : []
  const clips = Array.from({ length: CLIP_COLUMNS }, (_, c) => normalizeClip(rawClips[c]))
  const active = typeof raw.active === 'number' && Number.isInteger(raw.active) && clips[raw.active] ? raw.active : null
  return {
    id: fallback.id,
    visual,
    perVisual,
    opacity: num(raw.opacity, 0, 1, fallback.opacity),
    blend: oneOf(raw.blend, BLEND_MODES, fallback.blend),
    bypass: raw.bypass === true,
    solo: raw.solo === true,
    side: raw.side === 'a' || raw.side === 'b' ? raw.side : raw.side === null ? null : fallback.side,
    effects: normalizeEffects(raw.effects),
    clips,
    active,
  }
}

// Scenes before version 4 had two layers, A and B, and one blend mode between them.
function legacyLayers(raw: Record<string, unknown>): LayerState[] {
  const d = defaultScene().layers
  const old = Array.isArray(raw.layers) ? raw.layers : []
  const a = normalizeLayer(isObj(old[0]) ? { ...old[0], side: 'a', blend: 'normal' } : null, d[0])
  const b = normalizeLayer(isObj(old[1]) ? { ...old[1], side: 'b', blend: raw.blend } : null, d[1])
  return [a, b]
}

export function normalizeScene(raw: unknown): SceneState {
  const d = defaultScene()
  if (!isObj(raw)) return d
  let layers: LayerState[]
  if (raw.version === SCENE_VERSION) {
    const list = Array.isArray(raw.layers) ? raw.layers.slice(0, MAX_LAYERS) : []
    const ids = new Set<string>()
    layers = []
    list.forEach((r, i) => {
      // Missing or repeated ids get a fresh one.
      let id = isObj(r) && typeof r.id === 'string' && r.id && !ids.has(r.id) ? r.id : `l${i + 1}`
      while (ids.has(id)) id += 'x'
      ids.add(id)
      layers.push(normalizeLayer(r, { ...newLayer(id), side: null }))
    })
    if (!layers.length) layers = d.layers
  } else {
    layers = legacyLayers(raw)
  }
  const selected = typeof raw.selected === 'number' && Number.isInteger(raw.selected) ? Math.max(0, Math.min(layers.length - 1, raw.selected)) : 0
  return {
    version: SCENE_VERSION,
    layers,
    crossfade: num(raw.crossfade, 0, 1, d.crossfade),
    selected,
    effects: normalizeEffects(raw.effects),
    transition: num(raw.transition, 0, TRANSITION_MAX, d.transition),
    overlays: normalizeOverlays(raw.overlays),
  }
}
