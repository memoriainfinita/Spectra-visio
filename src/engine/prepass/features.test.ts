import { describe, expect, it } from 'vitest'
import { PREPASS_RATE, fitGrid, loudness, peak, roughTempo, sections, spectrum } from './features'

const R = PREPASS_RATE

function signal(seconds: number, fn: (t: number) => number): Float32Array {
  return Float32Array.from({ length: Math.round(seconds * R) }, (_, i) => fn(i / R))
}

// Deterministic noise.
function noise(seed = 1): () => number {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 2 ** 31 - 1
  }
}

function kicks(seconds: number, bpm: number, offset: number): Float32Array {
  const period = 60 / bpm
  return signal(seconds, (t) => {
    if (t < offset) return 0
    const k = (t - offset) % period
    return Math.sin(2 * Math.PI * (50 + 80 * Math.exp(-k * 30)) * k) * Math.exp(-k * 12) * 0.8
  })
}

describe('loudness', () => {
  it('reads a full-scale 997 Hz sine as -3 LUFS in one channel, 0 in two', () => {
    const sine = signal(5, (t) => Math.sin(2 * Math.PI * 997 * t))
    expect(loudness([sine], R)).toBeCloseTo(-3.01, 1)
    expect(loudness([sine, sine], R)).toBeCloseTo(0, 1)
  })

  it('drops 6 dB at half amplitude and ignores silence', () => {
    const quiet = signal(5, (t) => 0.5 * Math.sin(2 * Math.PI * 997 * t))
    const withSilence = new Float32Array(quiet.length * 2)
    withSilence.set(quiet)
    // The 400 ms blocks across the cut are partly silent but pass the relative gate.
    expect(Math.abs(loudness([withSilence], R) + 9.03)).toBeLessThan(0.15)
    expect(loudness([new Float32Array(R * 5)], R)).toBe(-Infinity)
  })
})

describe('peak', () => {
  it('reads the highest sample of any channel in dBFS', () => {
    const left = new Float32Array([0, 0.25, -0.5])
    const right = new Float32Array([0.1, -0.2, 0])
    expect(peak([left, right])).toBeCloseTo(-6.02, 2)
    expect(peak([new Float32Array(8)])).toBe(-Infinity)
  })
})

describe('beat grid', () => {
  it('finds the exact tempo and the first beat from a rough tempo', () => {
    const spec = spectrum([kicks(40, 124.3, 0.37)], R)
    const grid = fitGrid(spec, 124)!
    expect(grid.bpm).toBeCloseTo(124.3, 1)
    expect(Math.abs(grid.bpm - 124.3)).toBeLessThan(0.02)
    expect(Math.abs(grid.offset - 0.37)).toBeLessThan(0.02)
    expect(grid.strength).toBeGreaterThan(3)
  })

  it('estimates the tempo from the kicks, hi-hats between them included', () => {
    const n = noise(9)
    const k = kicks(60, 97, 0.2)
    const hats = signal(60, (t) => {
      const h = (t + 30 / 97) % (60 / 97)
      return n() * 0.3 * Math.exp(-h * 60)
    })
    const mix = k.map((v, i) => v + hats[i])
    expect(Math.abs(roughTempo(spectrum([mix], R))! - 97)).toBeLessThan(1)
    expect(roughTempo(spectrum([signal(30, () => n() * 0.3)], R))).toBeNull()
  })

  it('reports no strength on noise', () => {
    const n = noise()
    const spec = spectrum([signal(30, () => n() * 0.3)], R)
    expect(fitGrid(spec, 120)!.strength).toBeLessThan(1.5)
  })
})

describe('sections', () => {
  it('marks the changes between three different parts', () => {
    const n = noise(7)
    const audio = signal(60, (t) => {
      if (t < 20) return 0.4 * Math.sin(2 * Math.PI * 110 * t) + 0.02 * n()
      if (t < 40) return 0.3 * n()
      return 0.4 * Math.sin(2 * Math.PI * 1760 * t) + 0.02 * n()
    })
    const found = sections(spectrum([audio], R), null)
    expect(found).toHaveLength(2)
    expect(Math.abs(found[0] - 20)).toBeLessThan(1)
    expect(Math.abs(found[1] - 40)).toBeLessThan(1)
  })

  it('finds none in steady material', () => {
    expect(sections(spectrum([kicks(60, 120, 0)], R), null)).toEqual([])
    const n = noise(3)
    expect(sections(spectrum([signal(60, () => 0.3 * n())], R), null)).toEqual([])
  })

  it('moves each change onto the nearest beat of the grid', () => {
    const n = noise(5)
    const audio = signal(40, (t) => (t < 20.1 ? 0.4 * Math.sin(2 * Math.PI * 110 * t) : 0.3 * n()))
    const [at] = sections(spectrum([audio], R), { bpm: 120, offset: 0.25, strength: 5 })
    expect(Math.abs(at - 20.25)).toBeLessThan(0.51)
    expect(((at - 0.25) / 0.5) % 1).toBeCloseTo(0, 5)
  })
})
