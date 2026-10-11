import { createStore } from '../core/store'
import { AutoClock, pickNext, type AutoTrigger } from '../engine/auto/auto'
import { visualsStore } from '../engine/render/registry'
import { applyPreset } from '../engine/scene/preset'
import { analysis, inputs, player } from './engine'
import { favoritesStore } from './library'
import { presetsStore } from './presets'
import { sceneStore, setCrossfade, setVisual } from './scene'
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
// Crossfader move of the alternate mode, in progress.
let fade: { from: number; to: number; start: number; ms: number; set: number } | null = null

export function setAuto(on: boolean): void {
  if (on === autoStore.get().enabled) return
  cancelAnimationFrame(raf)
  fade = null
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
  stepFade(now)
  const p = player.state.get()
  const trackId = p.status === 'playing' && inputs.state.get().kind === 'player' ? p.currentId : null
  const why = clock.tick({ now, settings: settingsStore.get().auto, frame: analysis.frame(now), trackId })
  if (why && change(now)) autoStore.set((s) => ({ ...s, last: why }))
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
function change(now: number): boolean {
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
  if (alternate) {
    const to = hiddenSide === 'b' ? 1 : 0
    if (scene.transition > 0) fade = { from: scene.crossfade, to, start: now, ms: scene.transition * 1000, set: scene.crossfade }
    else setCrossfade(to)
  }
  return true
}

// Moves the crossfader along a smooth curve; moving it by hand takes over.
function stepFade(now: number): void {
  if (!fade) return
  if (sceneStore.get().crossfade !== fade.set) {
    fade = null
    return
  }
  const x = Math.min(1, (now - fade.start) / fade.ms)
  const v = fade.from + (fade.to - fade.from) * x * x * (3 - 2 * x)
  setCrossfade(v)
  fade.set = sceneStore.get().crossfade
  if (x >= 1) fade = null
}
