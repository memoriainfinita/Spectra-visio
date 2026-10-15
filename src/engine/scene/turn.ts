import { getEffect } from '../effects/registry'
import { clampParam, getVisual, paramsOf } from '../render/registry'
import type { ParamDef } from '../render/visual'
import { COMP, destShare, type Knob, type KnobRef, type KnobTarget } from './knobs'
import { visualSettings, type EffectState, type LayerState, type SceneState } from './scene'

// Turning a knob: its value and every destination it sets, in one new scene.

export function knobAt(s: SceneState, ref: KnobRef): Knob | null {
  if (ref.bank === 'panel') return s.knobs[ref.i] ?? null
  if (ref.bank === 'comp') return s.compKnobs[ref.i] ?? null
  return s.layers.find((l) => l.id === ref.layer)?.knobs[ref.i] ?? null
}

export function withKnob(s: SceneState, ref: KnobRef, change: (k: Knob) => Knob): SceneState {
  const k = knobAt(s, ref)
  if (!k) return s
  const next = change(k)
  if (next === k) return s
  const swap = (list: Knob[]) => list.map((x, i) => (i === ref.i ? next : x))
  if (ref.bank === 'panel') return { ...s, knobs: swap(s.knobs) }
  if (ref.bank === 'comp') return { ...s, compKnobs: swap(s.compKnobs) }
  return { ...s, layers: s.layers.map((l) => (l.id === ref.layer ? { ...l, knobs: swap(l.knobs) } : l)) }
}

const fromShare = (p: ParamDef, share: number) => clampParam(p, p.min + (p.max - p.min) * share)

// The effect a target points at in a chain: the nth of its type.
function nthEffect(chain: EffectState[], type: string, nth: number): number {
  let seen = -1
  return chain.findIndex((e) => e.type === type && ++seen === nth)
}

function setEffectParam(chain: EffectState[], t: Extract<KnobTarget, { kind: 'effect' }>, share: number): EffectState[] {
  const i = nthEffect(chain, t.type, t.nth)
  const p = getEffect(t.type)?.params.find((x) => x.id === t.param)
  if (i < 0 || !p) return chain
  const next = [...chain]
  next[i] = { ...chain[i], params: { ...chain[i].params, [t.param]: fromShare(p, share) } }
  return next
}

function editLayer(s: SceneState, id: string, change: (l: LayerState) => LayerState): SceneState {
  const i = s.layers.findIndex((l) => l.id === id)
  if (i < 0) return s
  const layers = [...s.layers]
  layers[i] = change(layers[i])
  return { ...s, layers }
}

// Sets one destination to `share` of its range. Missing ones are left alone.
export function setTarget(s: SceneState, t: KnobTarget, share: number): SceneState {
  switch (t.kind) {
    case 'crossfade':
      return { ...s, crossfade: share }
    case 'opacity':
      return editLayer(s, t.layer, (l) => ({ ...l, opacity: share }))
    case 'effect':
      if (t.owner === COMP) return { ...s, effects: setEffectParam(s.effects, t, share) }
      return editLayer(s, t.owner, (l) => ({ ...l, effects: setEffectParam(l.effects, t, share) }))
    case 'param': {
      const def = getVisual(t.visual)
      const p = def && paramsOf(def).find((x) => x.id === t.param)
      if (!p) return s
      return editLayer(s, t.layer, (l) => {
        const v = visualSettings(l, t.visual)
        return { ...l, perVisual: { ...l.perVisual, [t.visual]: { ...v, params: { ...v.params, [t.param]: fromShare(p, share) } } } }
      })
    }
  }
}

// The knob at `value` (0–1) and its destinations where that puts them.
export function turnKnob(s: SceneState, ref: KnobRef, value: number): SceneState {
  const k = knobAt(s, ref)
  if (!k) return s
  const v = Math.max(0, Math.min(1, value))
  const turned = withKnob(s, ref, (x) => (x.value === v ? x : { ...x, value: v }))
  return k.dests.reduce((acc, d) => setTarget(acc, d.target, destShare(d, v)), turned)
}

// Every panel knob at once, as a variation does.
export function turnPanel(s: SceneState, values: readonly number[]): SceneState {
  return values.reduce((acc, v, i) => turnKnob(acc, { bank: 'panel', i }, v), s)
}
