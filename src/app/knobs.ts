import { createStore } from '../core/store'
import {
  MAX_VARIATIONS,
  PANEL_KNOBS,
  blend,
  cleanName,
  emptyKnob,
  variationMs,
  withDest,
  type KnobRef,
  type KnobTarget,
  type Variation,
  type VariationBeats,
} from '../engine/scene/knobs'
import { newId } from '../engine/scene/scene'
import { knobAt, turnKnob, turnPanel, withKnob } from '../engine/scene/turn'
import { analysis } from './engine'
import { sceneStore } from './scene'

// The knobs of the panel, of the composition and of each layer, and the variations of the
// panel. All of it lives in the scene and is stored with it.

// The variation last launched, and whether it is still on its way.
export interface VariationState {
  active: string | null
  moving: boolean
}

export const variationStore = createStore<VariationState>({ active: null, moving: false })

let run = 0

function stopRun(): void {
  if (!run) return
  cancelAnimationFrame(run)
  run = 0
  variationStore.set((s) => ({ ...s, moving: false }))
}

// Turning a panel knob by hand stops a variation on its way.
export function turnKnobTo(ref: KnobRef, value: number): void {
  if (ref.bank === 'panel') stopRun()
  sceneStore.set((s) => turnKnob(s, ref, value))
}

export function renameKnob(ref: KnobRef, name: string): void {
  sceneStore.set((s) => withKnob(s, ref, (k) => ({ ...k, name: cleanName(name) })))
}

// The new destination starts where the knob puts it, over its whole range.
export function addKnobDest(ref: KnobRef, target: KnobTarget): boolean {
  const before = knobAt(sceneStore.get(), ref)
  sceneStore.set((s) => withKnob(s, ref, (k) => withDest(k, target)))
  const after = knobAt(sceneStore.get(), ref)
  if (!before || !after || after === before) return false
  sceneStore.set((s) => turnKnob(s, ref, after.value))
  return true
}

export function setDestRange(ref: KnobRef, index: number, from: number, to: number): void {
  const c = (v: number) => Math.max(0, Math.min(1, v))
  sceneStore.set((s) => withKnob(s, ref, (k) => ({ ...k, dests: k.dests.map((d, i) => (i === index ? { ...d, from: c(from), to: c(to) } : d)) })))
  const k = knobAt(sceneStore.get(), ref)
  if (k) sceneStore.set((s) => turnKnob(s, ref, k.value))
}

export function removeKnobDest(ref: KnobRef, index: number): void {
  sceneStore.set((s) => withKnob(s, ref, (k) => ({ ...k, dests: k.dests.filter((_, i) => i !== index) })))
}

export function clearKnob(ref: KnobRef): void {
  sceneStore.set((s) => withKnob(s, ref, () => emptyKnob()))
}

// --- Variations ---

export function saveVariation(): void {
  if (sceneStore.get().variations.length >= MAX_VARIATIONS) return
  const id = newId('v')
  sceneStore.set((s) => ({ ...s, variations: [...s.variations, { id, name: '', values: s.knobs.map((k) => k.value), beats: 4 }] }))
  variationStore.set((v) => ({ ...v, active: id }))
}

function editVariation(id: string, change: (v: Variation) => Variation): void {
  sceneStore.set((s) => ({ ...s, variations: s.variations.map((v) => (v.id === id ? change(v) : v)) }))
}

export function updateVariation(id: string): void {
  const values = sceneStore.get().knobs.map((k) => k.value)
  editVariation(id, (v) => ({ ...v, values }))
}

export function renameVariation(id: string, name: string): void {
  editVariation(id, (v) => ({ ...v, name: cleanName(name) }))
}

export function setVariationBeats(id: string, beats: VariationBeats): void {
  editVariation(id, (v) => ({ ...v, beats }))
}

export function deleteVariation(id: string): void {
  sceneStore.set((s) => ({ ...s, variations: s.variations.filter((v) => v.id !== id) }))
  if (variationStore.get().active === id) {
    stopRun()
    variationStore.set({ active: null, moving: false })
  }
}

// From where the panel knobs are now to the variation, over its beats at the current tempo.
export function launchVariation(id: string): void {
  const v = sceneStore.get().variations.find((x) => x.id === id)
  if (!v) return
  stopRun()
  variationStore.set({ active: id, moving: false })
  const ms = variationMs(v.beats, analysis.tempo.get().bpm)
  if (ms <= 0) {
    sceneStore.set((s) => turnPanel(s, v.values))
    return
  }
  const from = sceneStore.get().knobs.map((k) => k.value)
  const start = performance.now()
  variationStore.set({ active: id, moving: true })
  const step = (now: number) => {
    const p = Math.min(1, (now - start) / ms)
    sceneStore.set((s) => turnPanel(s, blend(from, v.values, p)))
    if (p < 1) run = requestAnimationFrame(step)
    else {
      run = 0
      variationStore.set((s) => ({ ...s, moving: false }))
    }
  }
  run = requestAnimationFrame(step)
}

// For keys and MIDI: the nth variation in the list.
export function launchVariationAt(index: number): void {
  const v = sceneStore.get().variations[index]
  if (v) launchVariation(v.id)
}

export const panelRef = (i: number): KnobRef => ({ bank: 'panel', i })
export const PANEL = Array.from({ length: PANEL_KNOBS }, (_, i) => i)
