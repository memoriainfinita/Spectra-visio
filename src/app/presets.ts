import { get, set } from 'idb-keyval'
import { createStore } from '../core/store'
import { applyPreset, cleanName, exportPresets, normalizePresets, parsePresets, presetFrom, type Preset } from '../engine/scene/preset'
import { sceneStore } from './scene'

const KEY = 'presets'

export const presetsStore = createStore<Preset[]>([])

export async function initPresets(): Promise<void> {
  try {
    presetsStore.set(normalizePresets(await get(KEY)))
  } catch {
    // IndexedDB unavailable: presets last for this visit only.
  }
  presetsStore.subscribe(() => {
    set(KEY, presetsStore.get()).catch(() => {})
  })
}

let next = 0
const newId = () => `p${Date.now().toString(36)}${++next}`

// Saves the selected layer's visualization and the effect chain. False without a name.
export function savePreset(name: string): boolean {
  if (!cleanName(name)) return false
  const scene = sceneStore.get()
  presetsStore.set((list) => [...list, presetFrom(scene, scene.selected, name, newId(), Date.now())])
  return true
}

export function loadPreset(id: string): void {
  const p = presetsStore.get().find((x) => x.id === id)
  if (p) sceneStore.set((s) => applyPreset(s, s.selected, p))
}

export function deletePreset(id: string): void {
  presetsStore.set((list) => list.filter((p) => p.id !== id))
}

function download(text: string, name: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const fileName = (name: string) => `${name.replace(/[^\p{L}\p{N}_-]+/gu, '-').replace(/^-+|-+$/g, '') || 'preset'}.spectravisio.json`

// One preset, or all of them when `id` is missing.
export function downloadPresets(id?: string): void {
  const list = presetsStore.get().filter((p) => id === undefined || p.id === id)
  if (!list.length) return
  download(exportPresets(list), fileName(list.length === 1 ? list[0].name : 'spectravisio-presets'))
}

export interface ImportResult {
  added: number
  rejected: number
  // The file is not a preset export at all.
  invalid: boolean
}

// Imported presets get new ids, so importing the same file twice keeps both copies.
export async function importPresets(file: File): Promise<ImportResult> {
  try {
    const { presets, rejected } = parsePresets(await file.text())
    presetsStore.set((list) => [...list, ...presets.map((p) => ({ ...p, id: newId() }))])
    return { added: presets.length, rejected, invalid: false }
  } catch {
    return { added: 0, rejected: 0, invalid: true }
  }
}
