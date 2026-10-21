import { isAction, type ActionId } from '../live/live'
import { getVisual, paramsOf, toUnit } from '../render/registry'
import { getEffect } from '../effects/registry'
import { COMP, LEVEL_KNOBS, PANEL_KNOBS, normalizeTarget, sameTarget, type KnobRef, type KnobTarget } from './knobs'
import type { SceneState } from './scene'

// My panel: 8 × 2 cells where any control of the app can go, for a show at hand. A cell
// holds an action (a button), a knob, or what a knob can set (a parameter, an effect's
// parameter, a layer's opacity, the crossfader), as a slider.

export const PANEL_COLUMNS = 8
export const PANEL_CELLS = PANEL_COLUMNS * 2

export type PanelControl = { kind: 'action'; id: ActionId } | { kind: 'knob'; ref: KnobRef } | KnobTarget

export function sameControl(a: PanelControl, b: PanelControl): boolean {
  if (a.kind === 'action') return b.kind === 'action' && a.id === b.id
  if (a.kind === 'knob') return b.kind === 'knob' && a.ref.bank === b.ref.bank && a.ref.i === b.ref.i && (a.ref.bank !== 'layer' || (b.ref.bank === 'layer' && a.ref.layer === b.ref.layer))
  return b.kind !== 'action' && b.kind !== 'knob' && sameTarget(a, b)
}

export const emptyPanel = (): (PanelControl | null)[] => new Array(PANEL_CELLS).fill(null)

// In the first empty cell, unless it is there already or the panel is full.
export function withControl(panel: readonly (PanelControl | null)[], c: PanelControl): (PanelControl | null)[] {
  if (panel.some((x) => x && sameControl(x, c))) return [...panel]
  const i = panel.indexOf(null)
  if (i < 0) return [...panel]
  const next = [...panel]
  next[i] = c
  return next
}

export function withoutControl(panel: readonly (PanelControl | null)[], c: PanelControl): (PanelControl | null)[] {
  return panel.map((x) => (x && sameControl(x, c) ? null : x))
}

// Controls on a layer that is gone leave their cell empty.
export function panelWithoutLayer(panel: readonly (PanelControl | null)[], layer: string): (PanelControl | null)[] {
  return panel.map((c) => (c && onLayer(c) === layer ? null : c))
}

function onLayer(c: PanelControl): string | null {
  if (c.kind === 'param' || c.kind === 'opacity') return c.layer
  if (c.kind === 'effect') return c.owner === COMP ? null : c.owner
  if (c.kind === 'knob') return c.ref.bank === 'layer' ? c.ref.layer : null
  return null
}

// Where a knob target is now, 0–1 of its range; null when it is not there.
export function targetShare(s: SceneState, t: KnobTarget): number | null {
  switch (t.kind) {
    case 'crossfade':
      return s.crossfade
    case 'opacity':
      return s.layers.find((l) => l.id === t.layer)?.opacity ?? null
    case 'param': {
      const l = s.layers.find((x) => x.id === t.layer)
      const def = getVisual(t.visual)
      const p = def && paramsOf(def).find((x) => x.id === t.param)
      if (!l || !p) return null
      return toUnit(p, l.perVisual[t.visual]?.params[t.param] ?? p.default)
    }
    case 'effect': {
      const chain = t.owner === COMP ? s.effects : s.layers.find((l) => l.id === t.owner)?.effects
      let seen = -1
      const e = chain?.find((x) => x.type === t.type && ++seen === t.nth)
      const p = getEffect(t.type)?.params.find((x) => x.id === t.param)
      if (!e || !p) return null
      return toUnit(p, e.params[t.param] ?? p.default)
    }
  }
}

// --- Normalization of stored data ---

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const index = (v: unknown, n: number) => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < n

function normalizeControl(raw: unknown, layers: ReadonlySet<string>): PanelControl | null {
  if (!isObj(raw)) return null
  if (raw.kind === 'action') return isAction(raw.id) ? { kind: 'action', id: raw.id } : null
  if (raw.kind === 'knob') {
    const r = isObj(raw.ref) ? raw.ref : {}
    if (r.bank === 'panel' && index(r.i, PANEL_KNOBS)) return { kind: 'knob', ref: { bank: 'panel', i: r.i as number } }
    if (r.bank === 'comp' && index(r.i, LEVEL_KNOBS)) return { kind: 'knob', ref: { bank: 'comp', i: r.i as number } }
    if (r.bank === 'layer' && index(r.i, LEVEL_KNOBS) && typeof r.layer === 'string' && layers.has(r.layer)) return { kind: 'knob', ref: { bank: 'layer', layer: r.layer, i: r.i as number } }
    return null
  }
  const t = normalizeTarget(raw)
  if (!t) return null
  const layer = onLayer(t)
  return layer && !layers.has(layer) ? null : t
}

// `layers`: ids of the layers there are; controls on others go.
export function normalizePanel(raw: unknown, layers: ReadonlySet<string>): (PanelControl | null)[] {
  const list = Array.isArray(raw) ? raw : []
  const out = emptyPanel()
  for (let i = 0; i < PANEL_CELLS; i++) {
    const c = normalizeControl(list[i], layers)
    if (c && !out.some((x) => x && sameControl(x, c))) out[i] = c
  }
  return out
}
