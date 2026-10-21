import { COMP, sameTarget, type KnobTarget } from '../scene/knobs'
import { CURVES, SMOOTHING_MAX, defaultSource, normalizeSource, type Curve, type ModSource, type SourceKind } from './modulation'

// Shared modulators, as in Bitwig: made once in the Modulators dock and mapped onto any
// number of parameters, each with an amount of its own. One phase and one envelope for all
// of them, unlike the modulations a parameter keeps for itself.

export const MAX_MODULATORS = 8
export const MAX_MOD_DESTS = 32
export const MOD_NAME_MAX = 30
// What a click while mapping gives a parameter: half its range at full source.
export const MAP_AMOUNT = 0.5

// The parameters a modulator can move: a visualization's on a layer, or an effect's.
export type ModTarget = Extract<KnobTarget, { kind: 'param' | 'effect' }>

export interface ModDest {
  target: ModTarget
  // -1 to 1: share of the parameter's range added at full source.
  amount: number
}

export interface SharedModulator {
  id: string
  // Empty: the interface names it by its source and number.
  name: string
  source: ModSource
  curve: Curve
  // Time constant in ms; 0 follows the source.
  smoothing: number
  dests: ModDest[]
}

export const isModTarget = (t: KnobTarget): t is ModTarget => t.kind === 'param' || t.kind === 'effect'

export function newSharedModulator(id: string, kind: SourceKind): SharedModulator {
  return { id, name: '', source: defaultSource(kind), curve: 'linear', smoothing: 0, dests: [] }
}

export const destIndex = (m: SharedModulator, target: ModTarget) => m.dests.findIndex((d) => sameTarget(d.target, target))

// Mapping a parameter that is already there takes it off.
export function toggleDest(m: SharedModulator, target: ModTarget, amount = MAP_AMOUNT): SharedModulator {
  const i = destIndex(m, target)
  if (i >= 0) return { ...m, dests: m.dests.filter((_, j) => j !== i) }
  if (m.dests.length >= MAX_MOD_DESTS) return m
  return { ...m, dests: [...m.dests, { target, amount }] }
}

// Destinations on a layer that is gone.
export function withoutLayer(m: SharedModulator, layer: string): SharedModulator {
  const dests = m.dests.filter((d) => (d.target.kind === 'param' ? d.target.layer : d.target.owner) !== layer)
  return dests.length === m.dests.length ? m : { ...m, dests }
}

// The key the renderer finds a destination by: a layer's visualization parameter, or an
// effect's by its id (the nth of its type in its chain, resolved by the caller).
export const paramKey = (layer: string, visual: string, param: string) => `p:${layer}:${visual}:${param}`
export const effectKey = (effectId: string, param: string) => `e:${effectId}:${param}`

// --- Normalization of stored data ---

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const str = (v: unknown): v is string => typeof v === 'string' && v.length > 0

export const cleanModName = (s: string): string => s.replace(/\s+/g, ' ').trim().slice(0, MOD_NAME_MAX)

function normalizeTarget(raw: unknown, layers: ReadonlySet<string>): ModTarget | null {
  if (!isObj(raw)) return null
  if (raw.kind === 'param' && str(raw.layer) && str(raw.visual) && str(raw.param) && layers.has(raw.layer)) return { kind: 'param', layer: raw.layer, visual: raw.visual, param: raw.param }
  if (raw.kind === 'effect' && str(raw.owner) && str(raw.type) && str(raw.param) && typeof raw.nth === 'number' && Number.isInteger(raw.nth) && raw.nth >= 0 && (raw.owner === COMP || layers.has(raw.owner)))
    return { kind: 'effect', owner: raw.owner, type: raw.type, nth: raw.nth, param: raw.param }
  return null
}

// `layers`: ids of the layers there are; destinations on others go.
export function normalizeModulators(raw: unknown, layers: ReadonlySet<string>): SharedModulator[] {
  const out: SharedModulator[] = []
  for (const r of Array.isArray(raw) ? raw : []) {
    if (!isObj(r) || !str(r.id) || out.some((m) => m.id === r.id)) continue
    const source = normalizeSource(r.source)
    if (!source) continue
    const dests: ModDest[] = []
    for (const d of Array.isArray(r.dests) ? r.dests : []) {
      if (!isObj(d)) continue
      const target = normalizeTarget(d.target, layers)
      if (!target || dests.some((x) => sameTarget(x.target, target))) continue
      const amount = typeof d.amount === 'number' && Number.isFinite(d.amount) ? Math.max(-1, Math.min(1, d.amount)) : MAP_AMOUNT
      dests.push({ target, amount })
      if (dests.length === MAX_MOD_DESTS) break
    }
    out.push({
      id: r.id,
      name: typeof r.name === 'string' ? cleanModName(r.name) : '',
      source,
      curve: (CURVES as readonly unknown[]).includes(r.curve) ? (r.curve as Curve) : 'linear',
      smoothing: typeof r.smoothing === 'number' && Number.isFinite(r.smoothing) ? Math.max(0, Math.min(SMOOTHING_MAX, r.smoothing)) : 0,
      dests,
    })
    if (out.length === MAX_MODULATORS) break
  }
  return out
}
