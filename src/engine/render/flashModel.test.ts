import { describe, expect, it } from 'vitest'
import { RISE_LUMINANCE_PER_S, RISE_RED_PER_S, allowedLevel, maxFlashesPerSecond, relativeLuminance } from './flashModel'

const FPS = 60
const SECONDS = 6

// A series of `fn(t)` at 60 fps, and the same after the limiter.
function run(fn: (t: number) => number, rise: number): { times: number[]; raw: number[]; limited: number[] } {
  const times: number[] = []
  const raw: number[] = []
  const limited: number[] = []
  let prev = 0
  for (let i = 0; i < FPS * SECONDS; i++) {
    const t = i / FPS
    const m = fn(t)
    const a = allowedLevel(prev, m, rise / FPS, i === 0)
    times.push(t)
    raw.push(m)
    limited.push(a)
    prev = a
  }
  return { times, raw, limited }
}

const square = (hz: number) => (t: number) => (Math.floor(t * hz * 2) % 2 === 0 ? 0 : 1)
const saw = (hz: number) => (t: number) => (t * hz) % 1
const sine = (hz: number) => (t: number) => 0.5 + 0.5 * Math.sin(2 * Math.PI * hz * t)

describe('flash counter', () => {
  it('counts the flashes of a square wave', () => {
    const { times, raw } = run(square(5), 1)
    expect(maxFlashesPerSecond(times, raw, 0.1)).toBeGreaterThan(3)
  })
  it('does not count small changes', () => {
    const { times, raw } = run((t) => 0.5 + 0.04 * Math.sin(20 * t), 1)
    expect(maxFlashesPerSecond(times, raw, 0.1)).toBe(0)
  })
})

describe('luminance limiter', () => {
  for (const hz of [1, 2, 3, 4, 5, 6, 8, 10, 15, 30]) {
    for (const [name, fn] of [['square', square(hz)], ['saw', saw(hz)], ['sine', sine(hz)]] as const) {
      it(`keeps ${name} at ${hz} Hz to 3 flashes a second`, () => {
        const { times, limited } = run(fn, RISE_LUMINANCE_PER_S)
        expect(maxFlashesPerSecond(times, limited, 0.1)).toBeLessThanOrEqual(3)
      })
    }
  }
  it('lets a single flash through, slowed', () => {
    const { limited } = run((t) => (t > 1 && t < 1.2 ? 1 : 0), RISE_LUMINANCE_PER_S)
    expect(Math.max(...limited)).toBeLessThan(0.1)
  })
  it('does not change what falls or rises slowly', () => {
    const { raw, limited } = run((t) => 1 - Math.min(1, t / 3), RISE_LUMINANCE_PER_S)
    expect(limited).toEqual(raw.map((v, i) => (i === 0 ? v : Math.min(v, limited[i - 1]! + RISE_LUMINANCE_PER_S / FPS))))
  })
})

describe('red limiter', () => {
  for (const hz of [2, 4, 6, 10]) {
    it(`keeps saturated red at ${hz} Hz to 3 flashes a second`, () => {
      const { times, limited } = run(square(hz), RISE_RED_PER_S)
      // (R − G − B) changes by 0.0625 or more.
      expect(maxFlashesPerSecond(times, limited, 0.0625)).toBeLessThanOrEqual(3)
    })
  }
})

describe('relative luminance', () => {
  it('goes from 0 to 1', () => {
    expect(relativeLuminance(0, 0, 0)).toBe(0)
    expect(relativeLuminance(1, 1, 1)).toBeCloseTo(1, 5)
  })
})
