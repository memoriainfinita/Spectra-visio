// Knobs as Ableton macros or Resolume dashboards: a value 0–1 that sets one or more
// destinations, each over a range of its own (inverted when the range runs backwards).
// The panel has eight, the composition and every layer four. Variations keep the eight
// of the panel and bring them back, cut or fading over a number of beats.

export const PANEL_KNOBS = 8
export const LEVEL_KNOBS = 4
export const MAX_DESTS = 16
export const MAX_VARIATIONS = 8
export const NAME_MAX = 30
// Beats a variation takes to reach its values; 0 cuts. Not bars: the app does not know
// where a bar starts, nor its metre.
export const VARIATION_BEATS = [0, 1, 2, 4, 8, 16] as const
export type VariationBeats = (typeof VARIATION_BEATS)[number]
// Without a tempo a beat lasts as at 120 BPM, so a variation still fades.
export const FALLBACK_BPM = 120

// What a knob sets. A layer by its id and a visualization's parameter by the visualization:
// a layer showing another one is not touched. An effect by its place in a chain, the nth of
// its type: effect ids change whenever a clip is launched.
export type KnobTarget =
  | { kind: 'param'; layer: string; visual: string; param: string }
  | { kind: 'effect'; owner: string; type: string; nth: number; param: string }
  | { kind: 'opacity'; layer: string }
  | { kind: 'crossfade' }

// The chain an effect target points at: 'comp' or a layer id.
export const COMP = 'comp'

export interface KnobDest {
  target: KnobTarget
  // Share of the destination's range at the knob's 0 and at its 1.
  from: number
  to: number
}

export interface Knob {
  // Empty: the interface shows its number.
  name: string
  value: number
  dests: KnobDest[]
}

export interface Variation {
  id: string
  name: string
  // One per panel knob.
  values: number[]
  beats: VariationBeats
}

// Where a knob is: on the panel, on the composition or on a layer (by id).
export type KnobRef = { bank: 'panel'; i: number } | { bank: 'comp'; i: number } | { bank: 'layer'; layer: string; i: number }

export const emptyKnob = (): Knob => ({ name: '', value: 0, dests: [] })
export const emptyKnobs = (n: number): Knob[] => Array.from({ length: n }, emptyKnob)

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

export function sameTarget(a: KnobTarget, b: KnobTarget): boolean {
  if (a.kind !== b.kind) return false
  switch (a.kind) {
    case 'param': {
      const o = b as typeof a
      return a.layer === o.layer && a.visual === o.visual && a.param === o.param
    }
    case 'effect': {
      const o = b as typeof a
      return a.owner === o.owner && a.type === o.type && a.nth === o.nth && a.param === o.param
    }
    case 'opacity':
      return a.layer === (b as typeof a).layer
    case 'crossfade':
      return true
  }
}

// The share of its range a destination takes at knob value `v`.
export const destShare = (d: KnobDest, v: number): number => clamp01(d.from + (d.to - d.from) * v)

// A knob with `target` added over its whole range; the same knob unchanged when it is
// already there or full.
export function withDest(k: Knob, target: KnobTarget): Knob {
  if (k.dests.length >= MAX_DESTS || k.dests.some((d) => sameTarget(d.target, target))) return k
  return { ...k, dests: [...k.dests, { target, from: 0, to: 1 }] }
}

// Values of the panel knobs `p` of the way (0–1) from `from` to `to`.
export function blend(from: readonly number[], to: readonly number[], p: number): number[] {
  const x = clamp01(p)
  return to.map((v, i) => (from[i] ?? v) + (v - (from[i] ?? v)) * x)
}

export function variationMs(beats: VariationBeats, bpm: number | null): number {
  return (beats * 60000) / (bpm && bpm > 0 ? bpm : FALLBACK_BPM)
}

export const cleanName = (s: string): string => s.replace(/\s+/g, ' ').trim().slice(0, NAME_MAX)

// --- Normalization of stored data ---

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const str = (v: unknown): v is string => typeof v === 'string' && v.length > 0
const num01 = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? clamp01(v) : fallback)

export function normalizeTarget(raw: unknown): KnobTarget | null {
  if (!isObj(raw)) return null
  if (raw.kind === 'param' && str(raw.layer) && str(raw.visual) && str(raw.param)) return { kind: 'param', layer: raw.layer, visual: raw.visual, param: raw.param }
  if (raw.kind === 'effect' && str(raw.owner) && str(raw.type) && str(raw.param) && typeof raw.nth === 'number' && Number.isInteger(raw.nth) && raw.nth >= 0)
    return { kind: 'effect', owner: raw.owner, type: raw.type, nth: raw.nth, param: raw.param }
  if (raw.kind === 'opacity' && str(raw.layer)) return { kind: 'opacity', layer: raw.layer }
  if (raw.kind === 'crossfade') return { kind: 'crossfade' }
  return null
}

// `layers`: ids of the layers there are; destinations on others go.
export function normalizeKnob(raw: unknown, layers: ReadonlySet<string>): Knob {
  if (!isObj(raw)) return emptyKnob()
  const dests: KnobDest[] = []
  for (const d of Array.isArray(raw.dests) ? raw.dests : []) {
    if (!isObj(d)) continue
    const target = normalizeTarget(d.target)
    if (!target || dests.some((x) => sameTarget(x.target, target))) continue
    if ((target.kind === 'param' || target.kind === 'opacity') && !layers.has(target.layer)) continue
    if (target.kind === 'effect' && target.owner !== COMP && !layers.has(target.owner)) continue
    dests.push({ target, from: num01(d.from, 0), to: num01(d.to, 1) })
    if (dests.length === MAX_DESTS) break
  }
  return { name: typeof raw.name === 'string' ? cleanName(raw.name) : '', value: num01(raw.value, 0), dests }
}

export function normalizeKnobs(raw: unknown, n: number, layers: ReadonlySet<string>): Knob[] {
  const list = Array.isArray(raw) ? raw : []
  return Array.from({ length: n }, (_, i) => normalizeKnob(list[i], layers))
}

export function normalizeVariations(raw: unknown): Variation[] {
  const out: Variation[] = []
  for (const v of Array.isArray(raw) ? raw : []) {
    if (!isObj(v) || !str(v.id) || out.some((x) => x.id === v.id)) continue
    const values = Array.isArray(v.values) ? v.values : []
    out.push({
      id: v.id,
      name: typeof v.name === 'string' ? cleanName(v.name) : '',
      values: Array.from({ length: PANEL_KNOBS }, (_, i) => num01(values[i], 0)),
      beats: (VARIATION_BEATS as readonly unknown[]).includes(v.beats) ? (v.beats as VariationBeats) : 4,
    })
    if (out.length === MAX_VARIATIONS) break
  }
  return out
}

// Destinations on a layer that is gone.
export function withoutLayer(k: Knob, layer: string): Knob {
  const dests = k.dests.filter((d) => {
    const t = d.target
    return !((t.kind === 'param' || t.kind === 'opacity') && t.layer === layer) && !(t.kind === 'effect' && t.owner === layer)
  })
  return dests.length === k.dests.length ? k : { ...k, dests }
}
