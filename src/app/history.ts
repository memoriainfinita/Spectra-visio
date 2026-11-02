import { createStore } from '../core/store'
import { describeChange, type Change } from '../engine/scene/changed'
import type { SceneState } from '../engine/scene/scene'
import { sceneStore } from './scene'

// Undo and redo over the scene: parameters, effects, layers, clips, knobs and modulators.
// Changes closer together than BURST_MS are one step, so a slider dragged, a crossfader on
// its way or a variation fading undo at once. Choosing a layer is not a step.

const BURST_MS = 600
const MAX_STEPS = 100

let past: SceneState[] = []
let future: SceneState[] = []
// The scene before the change being watched.
let last: SceneState | null = null
let lastAt = -Infinity
// Set while the scene changes by undo or redo, or by something that is not an edit.
let quiet = false

export const historyStore = createStore({ canUndo: false, canRedo: false })
const publish = () => {
  const next = { canUndo: past.length > 0, canRedo: future.length > 0 }
  const now = historyStore.get()
  if (now.canUndo !== next.canUndo || now.canRedo !== next.canRedo) historyStore.set(next)
}

export function initHistory(): void {
  last = sceneStore.get()
  sceneStore.subscribe(() => {
    const now = sceneStore.get()
    const before = last
    last = now
    if (quiet || !before || before === now) return
    if (sameButSelection(before, now)) return
    const t = performance.now()
    // A new burst: the scene before it is a step back.
    if (t - lastAt > BURST_MS) {
      past.push(before)
      if (past.length > MAX_STEPS) past.shift()
      future = []
    }
    lastAt = t
    publish()
  })
}

// Equal but for the layer chosen.
function sameButSelection(a: SceneState, b: SceneState): boolean {
  if (a.selected === b.selected) return false
  for (const k of Object.keys(b) as (keyof SceneState)[]) if (k !== 'selected' && a[k] !== b[k]) return false
  return true
}

// A change that is not an edit of the user's (the auto mode): no step of its own. An undo
// afterwards still goes back to before it, to the last edit.
export function withoutHistory(change: () => void): void {
  const was = quiet
  quiet = true
  try {
    change()
  } finally {
    quiet = was
  }
}

// What an undo or redo did: null when there was nothing to go to; `change` is what moved,
// when it is one thing.
export interface Went {
  change: Change | null
}

function go(from: SceneState[], to: SceneState[]): Went | null {
  const target = from.pop()
  if (!target) return null
  const now = sceneStore.get()
  to.push(now)
  // The layer chosen stays when it is still there.
  const selected = now.selected < target.layers.length ? now.selected : target.selected
  withoutHistory(() => sceneStore.set({ ...target, selected }))
  // The next change starts a step of its own.
  lastAt = -Infinity
  publish()
  return { change: describeChange(now, target) }
}

export const undo = () => go(past, future)
export const redo = () => go(future, past)
