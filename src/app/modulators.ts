import { createStore } from '../core/store'
import type { Curve, ModSource, SourceKind } from '../engine/modulation/modulation'
import { MAX_MODULATORS, cleanModName, newSharedModulator, setDest, toggleDest, type ModTarget, type SharedModulator } from '../engine/modulation/shared'
import { newId } from '../engine/scene/scene'
import { sceneStore } from './scene'

// The shared modulators of the scene, and "Map": while one is mapping, every parameter that
// can take it is marked across the app and a click on one puts it on or takes it off.

// Id of the modulator mapping; null when none.
export const mappingStore = createStore<string | null>(null)

function edit(id: string, change: (m: SharedModulator) => SharedModulator): void {
  sceneStore.set((s) => (s.modulators.some((m) => m.id === id) ? { ...s, modulators: s.modulators.map((m) => (m.id === id ? change(m) : m)) } : s))
}

// The new one maps at once: making one is nearly always to put it somewhere.
export function addModulator(kind: SourceKind): void {
  if (sceneStore.get().modulators.length >= MAX_MODULATORS) return
  const m = newSharedModulator(newId('mod'), kind)
  sceneStore.set((s) => ({ ...s, modulators: [...s.modulators, m] }))
  mappingStore.set(m.id)
}

export function removeModulator(id: string): void {
  if (mappingStore.get() === id) mappingStore.set(null)
  sceneStore.set((s) => ({ ...s, modulators: s.modulators.filter((m) => m.id !== id) }))
}

export function renameModulator(id: string, name: string): void {
  edit(id, (m) => ({ ...m, name: cleanModName(name) }))
}

export function setModulatorSource(id: string, patch: { source?: ModSource; curve?: Curve; smoothing?: number }): void {
  edit(id, (m) => ({ ...m, ...patch }))
}

export function toggleModDest(id: string, target: ModTarget): void {
  edit(id, (m) => toggleDest(m, target))
}

export function setModDest(id: string, target: ModTarget, amount: number): void {
  edit(id, (m) => setDest(m, target, amount))
}

export function setModDestAmount(id: string, i: number, amount: number): void {
  edit(id, (m) => (m.dests[i] ? { ...m, dests: m.dests.map((d, j) => (j === i ? { ...d, amount: Math.max(-1, Math.min(1, amount)) } : d)) } : m))
}

export function removeModDest(id: string, i: number): void {
  edit(id, (m) => ({ ...m, dests: m.dests.filter((_, j) => j !== i) }))
}

// Pressing Map again, or on another modulator, ends or moves the mapping.
export function toggleMapping(id: string): void {
  mappingStore.set(mappingStore.get() === id ? null : id)
}

export function stopMapping(): void {
  mappingStore.set(null)
}
