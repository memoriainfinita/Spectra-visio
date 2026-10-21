import { withoutHistory } from './history'
import { sceneStore, setCrossfade } from './scene'

// Crossfader moves over time, for the automatic mode and the live actions. Moving the
// crossfader by hand during a move stops it there.

// `quiet`: a move of the auto mode, not an edit to undo.
let move: { from: number; to: number; start: number; ms: number; set: number; quiet: boolean } | null = null
let raf = 0

function step(now: number): void {
  raf = 0
  if (!move) return
  if (sceneStore.get().crossfade !== move.set) {
    move = null
    return
  }
  const x = Math.max(0, Math.min(1, (now - move.start) / move.ms))
  const m = move
  const set = () => setCrossfade(m.from + (m.to - m.from) * x * x * (3 - 2 * x))
  if (m.quiet) withoutHistory(set)
  else set()
  move.set = sceneStore.get().crossfade
  if (x >= 1) move = null
  else raf = requestAnimationFrame(step)
}

// Moves to `to` along a smooth curve in `ms`; at once when `ms` is 0.
export function moveCrossfader(to: number, ms: number, quiet = false): void {
  stopCrossfader()
  const from = sceneStore.get().crossfade
  if (ms <= 0 || from === to) {
    if (quiet) withoutHistory(() => setCrossfade(to))
    else setCrossfade(to)
    return
  }
  move = { from, to, start: performance.now(), ms, set: from, quiet }
  raf = requestAnimationFrame(step)
}

export function stopCrossfader(): void {
  cancelAnimationFrame(raf)
  raf = 0
  move = null
}
