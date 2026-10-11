import { get, set } from 'idb-keyval'
import { createStore } from '../core/store'
import { newModulation, type Modulation, type SourceKind } from '../engine/modulation/modulation'
import { MAX_EFFECTS, getEffect } from '../engine/effects/registry'
import { clampParam, getVisual, paramsOf } from '../engine/render/registry'
import {
  CLIP_COLUMNS,
  MAX_LAYERS,
  applyClip,
  clipOf,
  defaultEffectParams,
  defaultScene,
  newId,
  newLayer,
  normalizeScene,
  visualSettings,
  TRANSITION_MAX,
  type BlendMode,
  type EffectState,
  type LayerState,
  type SceneState,
  type Side,
  type VisualSettings,
} from '../engine/scene/scene'

const KEY = 'scene'
// Sliders change the scene many times a second; one write per pause is enough.
const SAVE_DELAY_MS = 400

export const sceneStore = createStore<SceneState>(defaultScene())

export async function initScene(): Promise<void> {
  try {
    sceneStore.set(normalizeScene(await get(KEY)))
  } catch {
    // IndexedDB unavailable: start from the default scene.
  }
  let timer = 0
  sceneStore.subscribe(() => {
    clearTimeout(timer)
    timer = window.setTimeout(() => {
      set(KEY, sceneStore.get()).catch(() => {})
    }, SAVE_DELAY_MS)
  })
}

function editLayer(i: number, change: (l: LayerState) => LayerState): void {
  sceneStore.set((s) => {
    if (!s.layers[i]) return s
    const layers = [...s.layers]
    layers[i] = change(layers[i])
    return { ...s, layers }
  })
}

// Applies `change` to the current visualization's settings of one layer.
function editVisual(layer: number, change: (v: VisualSettings) => VisualSettings): void {
  editLayer(layer, (l) => ({ ...l, perVisual: { ...l.perVisual, [l.visual]: change(visualSettings(l)) } }))
}

export function setVisual(layer: number, visual: string): void {
  if (!getVisual(visual)) return
  editLayer(layer, (l) => (l.visual === visual ? l : { ...l, visual, active: null }))
}

export function setParam(layer: number, id: string, value: number): void {
  const def = getVisual(sceneStore.get().layers[layer]?.visual ?? '')
  const p = def && paramsOf(def).find((x) => x.id === id)
  if (!p) return
  editVisual(layer, (v) => ({ ...v, params: { ...v.params, [id]: clampParam(p, value) } }))
}

export function resetParams(layer: number): void {
  editLayer(layer, (l) => {
    const perVisual = { ...l.perVisual }
    delete perVisual[l.visual]
    return { ...l, perVisual }
  })
}

export function addModulation(layer: number, param: string, kind: SourceKind = 'band'): void {
  editVisual(layer, (v) => ({ ...v, mods: { ...v.mods, [param]: [...(v.mods[param] ?? []), newModulation(kind)] } }))
}

export function updateModulation(layer: number, param: string, mod: Modulation): void {
  editVisual(layer, (v) => ({ ...v, mods: { ...v.mods, [param]: (v.mods[param] ?? []).map((m) => (m.id === mod.id ? mod : m)) } }))
}

export function removeModulation(layer: number, param: string, id: string): void {
  editVisual(layer, (v) => ({ ...v, mods: withoutMod(v.mods, param, id) }))
}

export function setCrossfade(x: number): void {
  sceneStore.set((s) => ({ ...s, crossfade: Math.max(0, Math.min(1, x)) }))
}

export function setTransition(seconds: number): void {
  sceneStore.set((s) => ({ ...s, transition: Math.max(0, Math.min(TRANSITION_MAX, seconds)) }))
}

export function selectLayer(layer: number): void {
  sceneStore.set((s) => (s.layers[layer] && s.selected !== layer ? { ...s, selected: layer } : s))
}

// --- Layer stack ---

// A new layer on top, selected. Off the crossfader and blended with "add", so the layers
// below still show.
export function addLayer(): void {
  sceneStore.set((s) => {
    if (s.layers.length >= MAX_LAYERS) return s
    const layer: LayerState = { ...newLayer(newId('l')), blend: 'add' }
    return { ...s, layers: [...s.layers, layer], selected: s.layers.length }
  })
}

// The last layer stays.
export function removeLayer(i: number): void {
  sceneStore.set((s) => {
    if (s.layers.length <= 1 || !s.layers[i]) return s
    const layers = s.layers.filter((_, j) => j !== i)
    const selected = s.selected > i || s.selected === layers.length ? s.selected - 1 : s.selected
    return { ...s, layers, selected: Math.max(0, selected) }
  })
}

// +1 is up, towards the top of the stack. The selection follows the layer.
export function moveLayer(i: number, by: -1 | 1): void {
  sceneStore.set((s) => {
    const j = i + by
    if (!s.layers[i] || !s.layers[j]) return s
    const layers = [...s.layers]
    ;[layers[i], layers[j]] = [layers[j], layers[i]]
    const selected = s.selected === i ? j : s.selected === j ? i : s.selected
    return { ...s, layers, selected }
  })
}

export function setLayerOpacity(i: number, opacity: number): void {
  editLayer(i, (l) => ({ ...l, opacity: Math.max(0, Math.min(1, opacity)) }))
}

export function setLayerBlend(i: number, blend: BlendMode): void {
  editLayer(i, (l) => ({ ...l, blend }))
}

export function setLayerBypass(i: number, bypass: boolean): void {
  editLayer(i, (l) => ({ ...l, bypass }))
}

export function setLayerSolo(i: number, solo: boolean): void {
  editLayer(i, (l) => ({ ...l, solo }))
}

export function setLayerSide(i: number, side: Side | null): void {
  editLayer(i, (l) => ({ ...l, side }))
}

// --- Clips ---

// Stores what the layer shows in one of its cells.
export function saveClip(layer: number, column: number): void {
  if (column < 0 || column >= CLIP_COLUMNS) return
  editLayer(layer, (l) => {
    const clips = [...l.clips]
    clips[column] = clipOf(l)
    return { ...l, clips, active: column }
  })
}

export function clearClip(layer: number, column: number): void {
  editLayer(layer, (l) => {
    const clips = [...l.clips]
    clips[column] = null
    return { ...l, clips, active: l.active === column ? null : l.active }
  })
}

export function launchClip(layer: number, column: number): void {
  sceneStore.set((s) => {
    const clip = s.layers[layer]?.clips[column]
    return clip ? applyClip(s, layer, clip, column) : s
  })
}

// One clip per layer from the column; layers with an empty cell keep what they show.
export function launchColumn(column: number): void {
  sceneStore.set((s) => s.layers.reduce((acc, l, i) => (l.clips[column] ? applyClip(acc, i, l.clips[column], column) : acc), s))
}

// --- Effect chains: the composition's and one per layer ---

// 'comp' or a layer index.
export type EffectTarget = 'comp' | number

export function chainOf(s: SceneState, target: EffectTarget): EffectState[] {
  return target === 'comp' ? s.effects : (s.layers[target]?.effects ?? [])
}

// Applies `change` to the chain holding effect `id`, wherever it is.
function editChain(id: string, change: (list: EffectState[]) => EffectState[]): void {
  sceneStore.set((s) => {
    if (s.effects.some((e) => e.id === id)) return { ...s, effects: change(s.effects) }
    const i = s.layers.findIndex((l) => l.effects.some((e) => e.id === id))
    if (i < 0) return s
    const layers = [...s.layers]
    layers[i] = { ...layers[i], effects: change(layers[i].effects) }
    return { ...s, layers }
  })
}

export function addEffect(type: string, target: EffectTarget): void {
  if (!getEffect(type) || chainOf(sceneStore.get(), target).length >= MAX_EFFECTS) return
  const entry: EffectState = { id: newId('fx'), type, enabled: true, params: defaultEffectParams(type), mods: {} }
  if (target === 'comp') sceneStore.set((s) => ({ ...s, effects: [...s.effects, entry] }))
  else editLayer(target, (l) => ({ ...l, effects: [...l.effects, entry] }))
}

function editEffect(id: string, change: (e: EffectState) => EffectState): void {
  editChain(id, (list) => list.map((e) => (e.id === id ? change(e) : e)))
}

export function removeEffect(id: string): void {
  editChain(id, (list) => list.filter((e) => e.id !== id))
}

export function moveEffect(id: string, by: -1 | 1): void {
  editChain(id, (list) => {
    const i = list.findIndex((e) => e.id === id)
    const j = i + by
    if (i < 0 || j < 0 || j >= list.length) return list
    const effects = [...list]
    ;[effects[i], effects[j]] = [effects[j], effects[i]]
    return effects
  })
}

export function setEffectEnabled(id: string, enabled: boolean): void {
  editEffect(id, (e) => ({ ...e, enabled }))
}

export function resetEffect(id: string): void {
  editEffect(id, (e) => ({ ...e, params: defaultEffectParams(e.type), mods: {} }))
}

export function setEffectParam(id: string, param: string, value: number): void {
  editEffect(id, (e) => {
    const p = getEffect(e.type)?.params.find((x) => x.id === param)
    return p ? { ...e, params: { ...e.params, [param]: clampParam(p, value) } } : e
  })
}

export function addEffectModulation(id: string, param: string): void {
  editEffect(id, (e) => ({ ...e, mods: { ...e.mods, [param]: [...(e.mods[param] ?? []), newModulation('band')] } }))
}

export function updateEffectModulation(id: string, param: string, mod: Modulation): void {
  editEffect(id, (e) => ({ ...e, mods: { ...e.mods, [param]: (e.mods[param] ?? []).map((m) => (m.id === mod.id ? mod : m)) } }))
}

export function removeEffectModulation(id: string, param: string, modId: string): void {
  editEffect(id, (e) => ({ ...e, mods: withoutMod(e.mods, param, modId) }))
}

function withoutMod(mods: Record<string, Modulation[]>, param: string, id: string): Record<string, Modulation[]> {
  const list = (mods[param] ?? []).filter((m) => m.id !== id)
  const next = { ...mods }
  if (list.length) next[param] = list
  else delete next[param]
  return next
}
