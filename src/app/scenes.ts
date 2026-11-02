import { get, set } from 'idb-keyval'
import { createStore } from '../core/store'
import { translate } from '../i18n'
import { cleanName } from '../engine/scene/preset'
import { normalizeSavedScenes, type SavedScene } from '../engine/scene/savedScenes'
import { notify } from './notices'
import { sceneStore } from './scene'
import { settingsStore } from './settings'

const KEY = 'scenes'

export const scenesStore = createStore<SavedScene[]>([])

export async function initScenes(): Promise<void> {
  try {
    scenesStore.set(normalizeSavedScenes(await get(KEY)))
  } catch {
    // IndexedDB unavailable: scenes last for this visit only.
  }
  scenesStore.subscribe(() => {
    set(KEY, scenesStore.get()).catch(() => {})
  })
}

let next = 0
const newId = () => `s${Date.now().toString(36)}${++next}`

// Saves the whole composition under a name. False without a name.
export function saveScene(name: string): boolean {
  const clean = cleanName(name)
  if (!clean) return false
  const scene = structuredClone(sceneStore.get())
  scenesStore.set((list) => [...list, { id: newId(), name: clean, created: Date.now(), scene }])
  return true
}

// Replaces the scene with a saved one. The overlays stay; Ctrl Z brings the scene back.
export function loadSavedScene(id: string): void {
  const found = scenesStore.get().find((x) => x.id === id)
  if (!found) return
  sceneStore.set((s) => ({ ...structuredClone(found.scene), overlays: s.overlays }))
  notify(translate(settingsStore.get().lang, 'demo.loaded', { name: found.name }))
}

export function deleteScene(id: string): void {
  scenesStore.set((list) => list.filter((x) => x.id !== id))
}

// Scenes of a backup are added to the ones here, skipping those already present.
export function mergeScenes(raw: unknown): number {
  const ids = new Set(scenesStore.get().map((x) => x.id))
  const fresh = normalizeSavedScenes(raw).filter((x) => !ids.has(x.id))
  if (fresh.length) scenesStore.set((list) => [...list, ...fresh])
  return fresh.length
}
