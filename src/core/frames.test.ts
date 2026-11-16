import { describe, expect, it } from 'vitest'
import { createFrames, type FrameEnv } from './frames'

// A window that can be hidden, with its animation frames and its worker timer by hand.
function fakeEnv() {
  const e = {
    visible: true,
    time: 0,
    rafs: new Map<number, (now: number) => void>(),
    nextRaf: 1,
    ticks: null as (() => void) | null,
    tickStarts: 0,
    listeners: [] as (() => void)[],
  }
  const env: FrameEnv = {
    visible: () => e.visible,
    raf: (cb) => (e.rafs.set(e.nextRaf, cb), e.nextRaf++),
    cancelRaf: (id) => void e.rafs.delete(id),
    now: () => e.time,
    startTicks: (cb) => {
      e.ticks = cb
      e.tickStarts++
    },
    stopTicks: () => {
      e.ticks = null
    },
    onVisibility: (cb) => void e.listeners.push(cb),
  }
  return {
    env,
    state: e,
    frame(now: number) {
      const batch = [...e.rafs.values()]
      e.rafs.clear()
      for (const cb of batch) cb(now)
    },
    tick(now: number) {
      e.time = now
      e.ticks?.()
    },
    setVisible(v: boolean) {
      e.visible = v
      for (const l of e.listeners) l()
    },
  }
}

describe('frames', () => {
  it('runs callbacks on animation frames while the window is visible', () => {
    const w = fakeEnv()
    const f = createFrames(w.env)
    const seen: number[] = []
    const loop = (now: number) => {
      seen.push(now)
      f.request(loop)
    }
    f.request(loop)
    w.frame(10)
    w.frame(26)
    expect(seen).toEqual([10, 26])
    expect(w.state.ticks).toBeNull()
  })

  it('goes on with the worker timer when the window hides, and back to frames when it shows', () => {
    const w = fakeEnv()
    const f = createFrames(w.env)
    const seen: number[] = []
    const loop = (now: number) => {
      seen.push(now)
      f.request(loop)
    }
    f.request(loop)
    w.frame(10)
    w.setVisible(false)
    expect(w.state.rafs.size).toBe(0)
    w.tick(30)
    w.tick(46)
    expect(seen).toEqual([10, 30, 46])
    w.setVisible(true)
    expect(w.state.ticks).toBeNull()
    expect(w.state.rafs.size).toBe(1)
    w.frame(60)
    expect(seen).toEqual([10, 30, 46, 60])
  })

  it('a request made while hidden starts the timer, and an empty queue stops it', () => {
    const w = fakeEnv()
    w.setVisible(false)
    const f = createFrames(w.env)
    let runs = 0
    f.request(() => runs++)
    expect(w.state.tickStarts).toBe(1)
    w.tick(16)
    expect(runs).toBe(1)
    w.tick(32)
    expect(w.state.ticks).toBeNull()
  })

  it('cancel stops a pending callback and, with nothing left, the timer', () => {
    const w = fakeEnv()
    const f = createFrames(w.env)
    w.setVisible(false)
    let runs = 0
    const id = f.request(() => runs++)
    f.cancel(id)
    expect(w.state.ticks).toBeNull()
    w.tick(16)
    expect(runs).toBe(0)
  })

  it('a callback that throws does not stop the others, and its error still surfaces', () => {
    const w = fakeEnv()
    const f = createFrames(w.env)
    const surfaced: (() => void)[] = []
    const real = globalThis.queueMicrotask
    globalThis.queueMicrotask = (fn) => void surfaced.push(fn)
    try {
      let ran = false
      f.request(() => {
        throw new Error('boom')
      })
      f.request(() => {
        ran = true
      })
      w.frame(1)
      expect(ran).toBe(true)
      expect(surfaced).toHaveLength(1)
      expect(surfaced[0]).toThrow('boom')
    } finally {
      globalThis.queueMicrotask = real
    }
  })
})
