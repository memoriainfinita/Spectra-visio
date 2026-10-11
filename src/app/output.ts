import { createStore } from '../core/store'
import { actionForKey } from '../engine/live/live'
import { BRIDGE_KEY, OUTPUT_PARAM, type OutputBridge } from '../engine/output/bridge'
import { formatPixels } from '../engine/output/format'
import { visualSource } from '../engine/render/visualInput'
import { analysis, renderer } from './engine'
import { liveOutput, runAction } from './live'
import { controlValue } from './midi'
import { overlayData } from './overlays'
import { recordStore } from './record'
import { sceneStore } from './scene'
import { settingsStore } from './settings'
import { shadersStore } from './shaders'

// The output window, for a projector: the same app in output mode, opened from here and
// reading this window's state through the bridge.

export interface OutputWindowState {
  open: boolean
  // Keep drawing here too; off saves the GPU the second render.
  preview: boolean
  // The browser blocked the popup.
  blocked: boolean
}

export const outputStore = createStore<OutputWindowState>({ open: false, preview: true, blocked: false })

const WINDOW_NAME = 'spectravisio-output'
const CLOSED_POLL_MS = 1000
let win: Window | null = null
let poll = 0

export function initOutput(): void {
  const bridge: OutputBridge & { attach(w: Window): void } = {
    scene: () => sceneStore.get(),
    frame: () => analysis.frame(performance.now()),
    output: (frame) => liveOutput(performance.now(), frame),
    control: controlValue,
    overlay: overlayData,
    visual: visualSource,
    shaders: () => shadersStore.get(),
    size: () => renderer.fixedSize,
    key: (combo) => {
      const action = actionForKey(settingsStore.get().live.keys, combo)
      if (action) runAction(action)
    },
    // An output window still open from before this window reloaded comes back.
    attach: (w) => track(w),
  }
  ;(window as unknown as Record<string, unknown>)[BRIDGE_KEY] = bridge
  // A recording takes this window's canvas, so it keeps drawing.
  const pause = () => {
    const s = outputStore.get()
    renderer.paused = s.open && !s.preview && recordStore.get().status === 'idle'
  }
  outputStore.subscribe(pause)
  recordStore.subscribe(pause)
  // A recording fixes the size itself and sets it back when it ends.
  const format = () => {
    if (recordStore.get().status === 'idle') renderer.setFixedSize(formatPixels(settingsStore.get().format))
  }
  settingsStore.subscribe(format)
  format()
}

function track(w: Window): void {
  win = w
  clearInterval(poll)
  poll = window.setInterval(() => {
    if (win && !win.closed) return
    clearInterval(poll)
    win = null
    outputStore.set((s) => ({ ...s, open: false }))
  }, CLOSED_POLL_MS)
  outputStore.set((s) => ({ ...s, open: true, blocked: false }))
}

export function openOutput(): void {
  if (win && !win.closed) {
    win.focus()
    return
  }
  const url = new URL(location.href)
  url.search = `?${OUTPUT_PARAM}`
  url.hash = ''
  const w = window.open(url.href, WINDOW_NAME, 'popup,width=1280,height=720')
  if (!w) {
    outputStore.set((s) => ({ ...s, blocked: true }))
    return
  }
  track(w)
}

export function closeOutput(): void {
  win?.close()
}

export function setPreview(preview: boolean): void {
  outputStore.set((s) => ({ ...s, preview }))
}
