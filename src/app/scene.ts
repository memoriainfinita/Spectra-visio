import { get, set } from 'idb-keyval'
import { createStore } from '../core/store'
import { newModulation, type Modulation, type SourceKind } from '../engine/modulation/modulation'
import { MAX_EFFECTS, getEffect } from '../engine/effects/registry'
import { clampParam, getVisual, paramsOf } from '../engine/render/registry'
import {
  CLIP_COLUMNS,
  MAX_LAYERS,
  applyClip,
  cleanClipName,
  clipOf,
  defaultEffectParams,
  defaultScene,
  newId,
  newLayer,
  normalizeScene,
  visualSettings,
  TRANSITION_MAX,
  type BlendMode,
  type Clip,
  type EffectState,
  type LaunchMode,
  type LayerState,
  type SceneState,
  type Side,
  type VisualSettings,
} from '../engine/scene/scene'
import { withoutLayer, type Knob } from '../engine/scene/knobs'
import { LaunchQueue } from '../engine/scene/launch'

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
  const gone = sceneStore.get().layers[i]
  if (gone && sceneStore.get().layers.length > 1) unqueue(gone.id)
  sceneStore.set((s) => {
    if (s.layers.length <= 1 || !s.layers[i]) return s
    // Knobs drop what they set on it.
    const id = s.layers[i].id
    const prune = (list: Knob[]) => list.map((k) => withoutLayer(k, id))
    const layers = s.layers.filter((_, j) => j !== i).map((l) => ({ ...l, knobs: prune(l.knobs) }))
    const selected = s.selected > i || s.selected === layers.length ? s.selected - 1 : s.selected
    return { ...s, layers, selected: Math.max(0, selected), knobs: prune(s.knobs), compKnobs: prune(s.compKnobs) }
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

// Clips set to launch on the beat, waiting for it.
const queue = new LaunchQueue()
// Layer id → column waiting, for the grid to show.
export const queuedStore = createStore<ReadonlyMap<string, number>>(new Map())
const publishQueue = () => queuedStore.set(new Map(queue.pending()))

// The clip copied last, for "Paste" in the clip menu. Kept for the visit only.
export const clipboardStore = createStore<Clip | null>(null)

export function copyClip(layer: number, column: number): void {
  const clip = sceneStore.get().layers[layer]?.clips[column]
  if (clip) clipboardStore.set(clip)
}

// The copied clip, with its name and launch mode, over whatever the cell holds.
export function pasteClip(layer: number, column: number): void {
  const clip = clipboardStore.get()
  const l = sceneStore.get().layers[layer]
  if (!clip || !l || column < 0 || column >= CLIP_COLUMNS) return
  unqueue(l.id, column)
  editLayer(layer, (l) => {
    const clips = [...l.clips]
    clips[column] = clip
    return { ...l, clips, active: l.active === column ? null : l.active }
  })
}

// An empty name goes back to the visualization's.
export function renameClip(layer: number, column: number, name: string): void {
  const clean = cleanClipName(name)
  editClip(layer, column, ({ name: _, ...c }) => (clean ? { ...c, name: clean } : c))
}

export function renameColumn(column: number, name: string): void {
  if (column < 0 || column >= CLIP_COLUMNS) return
  sceneStore.set((s) => {
    const columns = [...s.columns]
    columns[column] = cleanClipName(name)
    return { ...s, columns }
  })
}

// Stores what the layer shows in one of its cells. A clip saved over keeps its launch mode;
// its name goes, since it named what was there.
export function saveClip(layer: number, column: number): void {
  if (column < 0 || column >= CLIP_COLUMNS) return
  editLayer(layer, (l) => {
    const clips = [...l.clips]
    const launch = l.clips[column]?.launch
    clips[column] = launch ? { ...clipOf(l), launch } : clipOf(l)
    return { ...l, clips, active: column }
  })
}

export function clearClip(layer: number, column: number): void {
  const l = sceneStore.get().layers[layer]
  if (l) unqueue(l.id, column)
  editLayer(layer, (l) => {
    const clips = [...l.clips]
    clips[column] = null
    return { ...l, clips, active: l.active === column ? null : l.active }
  })
}

function unqueue(layerId: string, column?: number): void {
  const before = queue.size
  queue.cancel(layerId, column)
  if (queue.size !== before) publishQueue()
}

// The clips of `launches` (layer index, column) that wait for the beat go to the queue,
// unless there is no tempo; the rest, and those already waiting, launch now.
function launch(launches: [number, number][]): void {
  const s = sceneStore.get()
  const now: [number, number][] = []
  let queued = false
  for (const [i, c] of launches) {
    const l = s.layers[i]
    const clip = l?.clips[c]
    if (!clip) continue
    if (clip.launch === 'beat' && queue.tempo && queue.pending().get(l.id) !== c) {
      queue.add(l.id, c)
      queued = true
    } else {
      queue.cancel(l.id)
      now.push([i, c])
    }
  }
  if (now.length) sceneStore.set((st) => now.reduce((acc, [i, c]) => (acc.layers[i]?.clips[c] ? applyClip(acc, i, acc.layers[i].clips[c]!, c) : acc), st))
  if (queued || now.length) publishQueue()
}

// Clicking a clip that already waits launches it at once.
export function launchClip(layer: number, column: number): void {
  launch([[layer, column]])
}

// One clip per layer from the column; layers with an empty cell keep what they show.
export function launchColumn(column: number): void {
  launch(sceneStore.get().layers.map((_, i) => [i, column]))
}

// Once a frame, with the beat phase or null without a tempo: launches what is due.
export function tickLaunches(phase: number | null): void {
  const due = queue.tick(phase)
  if (!due.length) return
  sceneStore.set((s) =>
    due.reduce((acc, [id, c]) => {
      const i = acc.layers.findIndex((l) => l.id === id)
      const clip = acc.layers[i]?.clips[c]
      return clip ? applyClip(acc, i, clip, c) : acc
    }, s),
  )
  publishQueue()
}

function editClip(layer: number, column: number, change: (c: Clip) => Clip): void {
  editLayer(layer, (l) => {
    const clip = l.clips[column]
    if (!clip) return l
    const clips = [...l.clips]
    clips[column] = change(clip)
    return { ...l, clips }
  })
}

export function setClipLaunch(layer: number, column: number, mode: LaunchMode): void {
  editClip(layer, column, ({ launch: _, ...c }) => (mode === 'beat' ? { ...c, launch: 'beat' } : c))
  if (mode === 'press') {
    const l = sceneStore.get().layers[layer]
    if (l) unqueue(l.id, column)
  }
}

// Changes the settings a clip keeps. While the layer plays that clip, the layer changes too.
function editClipSettings(layer: number, column: number, change: (v: VisualSettings) => VisualSettings): void {
  editLayer(layer, (l) => {
    const clip = l.clips[column]
    if (!clip) return l
    const clips = [...l.clips]
    clips[column] = { ...clip, settings: change(clip.settings) }
    if (l.active !== column || l.visual !== clip.visual) return { ...l, clips }
    return { ...l, clips, perVisual: { ...l.perVisual, [l.visual]: change(visualSettings(l)) } }
  })
}

export function setClipParam(layer: number, column: number, id: string, value: number): void {
  const clip = sceneStore.get().layers[layer]?.clips[column]
  const def = clip && getVisual(clip.visual)
  const p = def && paramsOf(def).find((x) => x.id === id)
  if (!p) return
  editClipSettings(layer, column, (v) => ({ ...v, params: { ...v.params, [id]: clampParam(p, value) } }))
}

export function addClipModulation(layer: number, column: number, param: string): void {
  // The same one in the clip and in the layer, so later edits find it in both.
  const mod = newModulation('band')
  editClipSettings(layer, column, (v) => ({ ...v, mods: { ...v.mods, [param]: [...(v.mods[param] ?? []), mod] } }))
}

export function updateClipModulation(layer: number, column: number, param: string, mod: Modulation): void {
  editClipSettings(layer, column, (v) => ({ ...v, mods: { ...v.mods, [param]: (v.mods[param] ?? []).map((m) => (m.id === mod.id ? mod : m)) } }))
}

export function removeClipModulation(layer: number, column: number, param: string, id: string): void {
  editClipSettings(layer, column, (v) => ({ ...v, mods: withoutMod(v.mods, param, id) }))
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
