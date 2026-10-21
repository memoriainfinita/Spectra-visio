import { createStore } from '../core/store'
import { AutoClock, pickNext, type AutoTrigger } from '../engine/auto/auto'
import { visualsStore } from '../engine/render/registry'
import { applyPreset } from '../engine/scene/preset'
import { moveCrossfader, stopCrossfader } from './crossfader'
import { withoutHistory } from './history'
import { analysis, inputs, player } from './engine'
import { favoritesStore } from './library'
import { presetsStore } from './presets'
import { sceneStore, setVisual } from './scene'
import { settingsStore } from './settings'
import { visualInputStore } from './visualInput'

// Automatic mode. Off on every visit; its settings are kept with the app's.

export interface AutoState {
  enabled: boolean
  // What fired the last change.
  last: AutoTrigger | null
}

export const autoStore = createStore<AutoState>({ enabled: false, last: null })

const clock = new AutoClock()
let raf = 0
// The preset last put on each layer, by layer id, so the next pick is a different one.
const lastPreset = new Map<string, string>()

export function setAuto(on: boolean): void {
  if (on === autoStore.get().enabled) return
  cancelAnimationFrame(raf)
  stopCrossfader()
  if (on) {
    clock.reset(performance.now())
    raf = requestAnimationFrame(loop)
  }
  autoStore.set({ enabled: on, last: null })
}

export function toggleAuto(): void {
  setAuto(!autoStore.get().enabled)
}

function loop(now: number): void {
  raf = requestAnimationFrame(loop)
  const p = player.state.get()
  const trackId = p.status === 'playing' && inputs.state.get().kind === 'player' ? p.currentId : null
  const why = clock.tick({ now, settings: settingsStore.get().auto, frame: analysis.frame(now), trackId })
  if (!why) return
  // The auto mode's changes are not edits to undo.
  let changed = false
  withoutHistory(() => (changed = change()))
  if (changed) autoStore.set((s) => ({ ...s, last: why }))
}

// Visualizations of the chosen pool; the visual input one only while there is an input.
function visualPool(): string[] {
  const s = settingsStore.get().auto
  const favorites = favoritesStore.get()
  const hasInput = visualInputStore.get().kind !== 'none'
  return visualsStore
    .get()
    .filter((v) => (v.category !== 'media' || hasInput) && (s.pool !== 'favorites' || favorites.includes(v.id)) && (s.pool !== 'category' || v.category === s.category))
    .map((v) => v.id)
}

// False when the pool offers nothing new.
function change(): boolean {
  const s = settingsStore.get().auto
  const scene = sceneStore.get()
  // Alternate: the top layer of the side the crossfader hides; without one, the selected
  // layer and the crossfader stays.
  const hiddenSide = scene.crossfade < 0.5 ? 'b' : 'a'
  const sideLayer = scene.layers.findLastIndex((l) => l.side === hiddenSide)
  const alternate = s.target === 'alternate' && sideLayer >= 0
  const layer = alternate ? sideLayer : scene.selected
  const layerId = scene.layers[layer].id
  if (s.pool === 'presets') {
    const presets = presetsStore.get()
    const last = lastPreset.get(layerId) ?? null
    const id = pickNext(presets.map((p) => p.id), last)
    const preset = presets.find((p) => p.id === id)
    // A single choice is only worth applying again on the hidden layer.
    if (!preset || (preset.id === last && !alternate)) return false
    lastPreset.set(layerId, preset.id)
    sceneStore.set((sc) => applyPreset(sc, layer, preset))
  } else {
    const id = pickNext(visualPool(), scene.layers[layer].visual)
    if (!id || (id === scene.layers[layer].visual && !alternate)) return false
    setVisual(layer, id)
  }
  if (alternate) moveCrossfader(hiddenSide === 'b' ? 1 : 0, scene.transition * 1000, true)
  return true
}

