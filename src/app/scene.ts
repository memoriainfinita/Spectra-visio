import { get, set } from 'idb-keyval'
import { createStore } from '../core/store'
import { newModulation, type Modulation, type SourceKind } from '../engine/modulation/modulation'
import { MAX_EFFECTS, getEffect } from '../engine/effects/registry'
import { clampParam, getVisual, paramsOf } from '../engine/render/registry'
import {
  defaultEffectParams,
  defaultScene,
  normalizeScene,
  visualSettings,
  type BlendMode,
  type EffectState,
  type SceneState,
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

type LayerIndex = 0 | 1

// Applies `change` to the current visualization's settings of one layer.
function editVisual(layer: LayerIndex, change: (v: VisualSettings) => VisualSettings): void {
  sceneStore.set((s) => {
    const l = s.layers[layer]
    const next = { ...l, perVisual: { ...l.perVisual, [l.visual]: change(visualSettings(l)) } }
    const layers: SceneState['layers'] = [...s.layers]
    layers[layer] = next
    return { ...s, layers }
  })
}

export function setVisual(layer: LayerIndex, visual: string): void {
  if (!getVisual(visual)) return
  sceneStore.set((s) => {
    const layers: SceneState['layers'] = [...s.layers]
    layers[layer] = { ...layers[layer], visual }
    return { ...s, layers }
  })
}

export function setParam(layer: LayerIndex, id: string, value: number): void {
  const def = getVisual(sceneStore.get().layers[layer].visual)
  const p = def && paramsOf(def).find((x) => x.id === id)
  if (!p) return
  editVisual(layer, (v) => ({ ...v, params: { ...v.params, [id]: clampParam(p, value) } }))
}

export function resetParams(layer: LayerIndex): void {
  sceneStore.set((s) => {
    const l = s.layers[layer]
    const perVisual = { ...l.perVisual }
    delete perVisual[l.visual]
    const layers: SceneState['layers'] = [...s.layers]
    layers[layer] = { ...l, perVisual }
    return { ...s, layers }
  })
}

export function addModulation(layer: LayerIndex, param: string, kind: SourceKind = 'band'): void {
  editVisual(layer, (v) => ({ ...v, mods: { ...v.mods, [param]: [...(v.mods[param] ?? []), newModulation(kind)] } }))
}

export function updateModulation(layer: LayerIndex, param: string, mod: Modulation): void {
  editVisual(layer, (v) => ({ ...v, mods: { ...v.mods, [param]: (v.mods[param] ?? []).map((m) => (m.id === mod.id ? mod : m)) } }))
}

export function removeModulation(layer: LayerIndex, param: string, id: string): void {
  editVisual(layer, (v) => ({ ...v, mods: withoutMod(v.mods, param, id) }))
}

export function setCrossfade(x: number): void {
  sceneStore.set((s) => ({ ...s, crossfade: Math.max(0, Math.min(1, x)) }))
}

export function setBlend(blend: BlendMode): void {
  sceneStore.set((s) => ({ ...s, blend }))
}

export function selectLayer(layer: LayerIndex): void {
  sceneStore.set((s) => ({ ...s, selected: layer }))
}

// --- Effect chain ---

let nextEffect = 0

export function addEffect(type: string): void {
  if (!getEffect(type) || sceneStore.get().effects.length >= MAX_EFFECTS) return
  nextEffect++
  const entry: EffectState = { id: `fx${Date.now().toString(36)}${nextEffect}`, type, enabled: true, params: defaultEffectParams(type), mods: {} }
  sceneStore.set((s) => ({ ...s, effects: [...s.effects, entry] }))
}

function editEffect(id: string, change: (e: EffectState) => EffectState): void {
  sceneStore.set((s) => ({ ...s, effects: s.effects.map((e) => (e.id === id ? change(e) : e)) }))
}

export function removeEffect(id: string): void {
  sceneStore.set((s) => ({ ...s, effects: s.effects.filter((e) => e.id !== id) }))
}

export function moveEffect(id: string, by: -1 | 1): void {
  sceneStore.set((s) => {
    const i = s.effects.findIndex((e) => e.id === id)
    const j = i + by
    if (i < 0 || j < 0 || j >= s.effects.length) return s
    const effects = [...s.effects]
    ;[effects[i], effects[j]] = [effects[j], effects[i]]
    return { ...s, effects }
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
