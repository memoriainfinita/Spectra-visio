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
import { clampParam, defaultParams, getVisual, paramsOf } from '../render/registry'
import type { Params } from '../render/visual'

// What is on screen: two layers, the crossfader between them and how they blend.

export const BLEND_MODES = ['normal', 'add', 'screen', 'multiply', 'difference', 'lighten'] as const
export type BlendMode = (typeof BLEND_MODES)[number]

export const SCENE_VERSION = 1

// Tweaks per visualization, kept when the layer switches away and back.
export interface VisualSettings {
  params: Params
  // Parameter id → modulations.
  mods: Record<string, Modulation[]>
}

export interface LayerState {
  visual: string
  perVisual: Record<string, VisualSettings>
}

export interface SceneState {
  version: typeof SCENE_VERSION
  layers: [LayerState, LayerState]
  // 0 shows A only, 1 B only.
  crossfade: number
  blend: BlendMode
  // Layer whose parameters the panel shows.
  selected: 0 | 1
}

export function defaultScene(): SceneState {
  return {
    version: SCENE_VERSION,
    layers: [
      { visual: 'kaleido', perVisual: {} },
      { visual: 'tunnel', perVisual: {} },
    ],
    crossfade: 0,
    blend: 'normal',
    selected: 0,
  }
}

export function visualSettings(layer: LayerState): VisualSettings {
  const saved = layer.perVisual[layer.visual]
  if (saved) return saved
  const def = getVisual(layer.visual)
  return { params: def ? defaultParams(def) : {}, mods: {} }
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

function normalizeVisualSettings(visualId: string, raw: unknown): VisualSettings | null {
  const def = getVisual(visualId)
  if (!def || !isObj(raw)) return null
  const params = defaultParams(def)
  const mods: Record<string, Modulation[]> = {}
  const rawParams = isObj(raw.params) ? raw.params : {}
  const rawMods = isObj(raw.mods) ? raw.mods : {}
  for (const p of paramsOf(def)) {
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
  return { visual, perVisual }
}

export function normalizeScene(raw: unknown): SceneState {
  const d = defaultScene()
  if (!isObj(raw)) return d
  const layers = Array.isArray(raw.layers) ? raw.layers : []
  return {
    version: SCENE_VERSION,
    layers: [normalizeLayer(layers[0], d.layers[0]), normalizeLayer(layers[1], d.layers[1])],
    crossfade: num(raw.crossfade, 0, 1, d.crossfade),
    blend: oneOf(raw.blend, BLEND_MODES, d.blend),
    selected: raw.selected === 1 ? 1 : 0,
  }
}

