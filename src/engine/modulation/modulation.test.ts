import { describe, expect, test } from 'vitest'
import { KICK, createFrame } from '../analysis/analyzer'
import { Modulator, applyCurve, lfo, type Modulation } from './modulation'

const mod = (patch: Partial<Modulation>): Modulation => ({ id: 'm', source: { kind: 'band', band: 'bass' }, amount: 1, curve: 'linear', smoothing: 0, ...patch })

describe('shapes and curves', () => {
  test('oscillator shapes over one cycle', () => {
    expect(lfo('sine', 0)).toBeCloseTo(0)
    expect(lfo('sine', 0.5)).toBeCloseTo(1)
    expect(lfo('triangle', 0.25)).toBeCloseTo(0.5)
    expect(lfo('saw', 0.75)).toBeCloseTo(0.75)
    expect(lfo('square', 0.2)).toBe(1)
    expect(lfo('square', 0.7)).toBe(0)
    expect(lfo('saw', 2.25)).toBeCloseTo(0.25)
  })

  test('curves keep 0 and 1 and bend the middle', () => {
    for (const c of ['linear', 'exp', 'log', 'smooth'] as const) {
      expect(applyCurve(c, 0)).toBe(0)
      expect(applyCurve(c, 1)).toBe(1)
    }
    expect(applyCurve('exp', 0.5)).toBeCloseTo(0.25)
    expect(applyCurve('log', 0.25)).toBeCloseTo(0.5)
    expect(applyCurve('linear', 2)).toBe(1)
  })
})

describe('modulator', () => {
  test('a band source follows the named band level, scaled by the amount', () => {
    const m = new Modulator()
    const f = createFrame()
    f.named[1] = 0.8
    m.advance(0, 1 / 60, f)
    expect(m.sum('k', [mod({ amount: 0.5 })])).toBeCloseTo(0.4)
    expect(m.sum('k', [mod({ amount: -1 })])).toBeCloseTo(-0.8)
  })

  test('contributions of several modulations add up', () => {
    const m = new Modulator()
    const f = createFrame()
    f.named[0] = 0.5
    f.named[1] = 0.25
    m.advance(0, 1 / 60, f)
    const sum = m.sum('k', [mod({ id: 'a', source: { kind: 'band', band: 'sub' } }), mod({ id: 'b' })])
    expect(sum).toBeCloseTo(0.75)
  })

  test('a beat envelope jumps on a new onset and decays with its time constant', () => {
    const m = new Modulator()
    const f = createFrame()
    const beat = mod({ source: { kind: 'beat', band: 'kick', decay: 100 } })
    m.advance(0, 0.01, f)
    expect(m.sum('k', [beat])).toBe(0)
    f.beats[KICK] = 1
    m.advance(0.01, 0.01, f)
    expect(m.sum('k', [beat])).toBe(1)
    m.advance(0.11, 0.1, f)
    expect(m.sum('k', [beat])).toBeCloseTo(Math.exp(-1), 5)
  })

  test('smoothing reaches the same value at any frame rate', () => {
    const run = (fps: number) => {
      const m = new Modulator()
      const f = createFrame()
      f.named[1] = 1
      let v = 0
      for (let i = 0; i < Math.round(fps * 0.3); i++) {
        m.advance(i / fps, 1 / fps, f)
        v = m.sum('k', [mod({ smoothing: 200 })])
      }
      return v
    }
    expect(run(30)).toBeCloseTo(run(150), 2)
  })

  test('a synced oscillator follows the beat phase', () => {
    const m = new Modulator()
    const f = createFrame()
    f.bpm = 120
    const saw = mod({ source: { kind: 'lfo', shape: 'saw', rate: 1, sync: true } })
    f.phase = 0.25
    m.advance(0, 1 / 60, f)
    expect(m.sum('k', [saw])).toBeCloseTo(0.25)
    f.phase = 0.9
    m.advance(0.1, 1 / 60, f)
    f.phase = 0.1
    m.advance(0.2, 1 / 60, f)
    expect(m.beats).toBeCloseTo(1.1)
    const half = mod({ id: 'h', source: { kind: 'lfo', shape: 'saw', rate: 0.5, sync: true } })
    expect(m.sum('k', [half])).toBeCloseTo(0.55)
  })

  test('a free oscillator runs on time', () => {
    const m = new Modulator()
    m.advance(0.25, 1 / 60, null)
    expect(m.sum('k', [mod({ source: { kind: 'lfo', shape: 'saw', rate: 2, sync: false } })])).toBeCloseTo(0.5)
  })

  test('without analysis a band source gives 0', () => {
    const m = new Modulator()
    m.advance(0, 1 / 60, null)
    expect(m.sum('k', [mod({})])).toBe(0)
  })
})
