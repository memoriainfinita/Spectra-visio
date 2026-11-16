// A frame clock for the work that has to go on while the window is hidden.
//
// requestAnimationFrame stops in a hidden window (another tab in front, or minimized), and
// the analysis, the feed to OBS, the crossfader, the variations, the auto mode and the video
// spans all ran on it: with the main window out of sight the output window stopped hearing
// the music and OBS stopped receiving. `requestFrame` and `cancelFrame` take the place of
// the two animation-frame calls. While the window is visible they are those calls; hidden,
// a timer in a worker drives the same callbacks, because a worker's timer is not slowed down
// with the page. The drawing itself (renderer, UI) stays on requestAnimationFrame: nobody
// needs it drawn while nobody sees it.

export interface FrameEnv {
  visible(): boolean
  raf(cb: (now: number) => void): number
  cancelRaf(id: number): void
  now(): number
  // A repeating timer that keeps its pace in a hidden window.
  startTicks(cb: () => void): void
  stopTicks(): void
  onVisibility(cb: () => void): void
}

export interface Frames {
  request(cb: FrameRequestCallback): number
  cancel(id: number): void
}

export function createFrames(env: FrameEnv): Frames {
  let nextId = 1
  const pending = new Map<number, FrameRequestCallback>()
  let raf = 0
  let ticking = false

  const stopTicks = () => {
    if (!ticking) return
    ticking = false
    env.stopTicks()
  }

  const run = (now: number) => {
    const batch = [...pending.values()]
    pending.clear()
    for (const cb of batch) {
      try {
        cb(now)
      } catch (err) {
        // One callback failing does not stop the others; the error still surfaces.
        queueMicrotask(() => {
          throw err
        })
      }
    }
  }

  const onRaf = (now: number) => {
    raf = 0
    run(now)
    arm()
  }

  const onTick = () => {
    if (!pending.size) return stopTicks()
    run(env.now())
  }

  const arm = () => {
    if (!pending.size) return
    if (env.visible()) {
      if (!raf) raf = env.raf(onRaf)
    } else if (!ticking) {
      ticking = true
      env.startTicks(onTick)
    }
  }

  env.onVisibility(() => {
    if (env.visible()) stopTicks()
    else if (raf) {
      env.cancelRaf(raf)
      raf = 0
    }
    arm()
  })

  return {
    request(cb) {
      const id = nextId++
      pending.set(id, cb)
      arm()
      return id
    },
    cancel(id) {
      pending.delete(id)
      if (!pending.size) stopTicks()
    },
  }
}

const TICK_MS = 16

// The browser's: animation frames while visible, a worker's interval while hidden.
function browserEnv(): FrameEnv {
  let worker: Worker | null = null
  let fallback: ReturnType<typeof setInterval> | undefined
  let onTick: (() => void) | null = null
  return {
    visible: () => document.visibilityState === 'visible',
    raf: (cb) => requestAnimationFrame(cb),
    cancelRaf: (id) => cancelAnimationFrame(id),
    now: () => performance.now(),
    startTicks(cb) {
      onTick = cb
      try {
        worker ??= new Worker(new URL('./tickWorker.ts', import.meta.url), { type: 'module' })
        worker.onmessage = () => onTick?.()
        worker.postMessage({ every: TICK_MS })
      } catch {
        // No worker (blocked by the page's policy): the page's own timer, which a hidden
        // window slows down, is better than none.
        fallback = setInterval(() => onTick?.(), TICK_MS)
      }
    },
    stopTicks() {
      onTick = null
      worker?.postMessage({ every: 0 })
      clearInterval(fallback)
      fallback = undefined
    },
    onVisibility: (cb) => document.addEventListener('visibilitychange', cb),
  }
}

// Created on first use, so importing this in a test does not need a document.
let frames: Frames | null = null
const shared = () => (frames ??= createFrames(browserEnv()))

export const requestFrame = (cb: FrameRequestCallback): number => shared().request(cb)
export const cancelFrame = (id: number): void => shared().cancel(id)
