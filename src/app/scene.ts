import { get, set } from 'idb-keyval'
import { createStore } from '../core/store'
import { newModulation, type Modulation, type SourceKind } from '../engine/modulation/modulation'
import { clampParam, getVisual, paramsOf } from '../engine/render/registry'
import { defaultScene, normalizeScene, visualSettings, type BlendMode, type SceneState, type VisualSettings } from '../engine/scene/scene'

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
  editVisual(layer, (v) => {
    const list = (v.mods[param] ?? []).filter((m) => m.id !== id)
    const mods = { ...v.mods }
    if (list.length) mods[param] = list
    else delete mods[param]
    return { ...v, mods }
  })
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
