import { describe, expect, test } from 'vitest'
import { DEFAULT_PERFORMANCE, FrameGate, QualityGovernor, effectiveCap, normalizePerformance } from './quality'

describe('FrameGate', () => {
  const count = (hz: number, cap: number, seconds = 2) => {
    const gate = new FrameGate()
    let n = 0
    for (let t = 0; t < seconds * 1000; t += 1000 / hz) if (gate.pass(t, cap)) n++
    return n / seconds
  }

  test('passes everything without a cap or at the display rate', () => {
    expect(count(60, 0)).toBe(60)
    expect(count(60, 60)).toBe(60)
  })

  test('halves a 60 Hz display at 30 and keeps the average on a fast one', () => {
    expect(Math.abs(count(60, 30) - 30)).toBeLessThanOrEqual(0.5)
    expect(count(144, 60)).toBeGreaterThanOrEqual(58)
    expect(count(144, 60)).toBeLessThanOrEqual(62)
  })
})

describe('QualityGovernor', () => {
  // Runs seconds of fps given by a function of the scale.
  const run = (g: QualityGovernor, seconds: number, fpsAt: (scale: number) => number, start = 0) => {
    for (let s = start; s < start + seconds; s++) g.update(fpsAt(g.scale), 60, s)
    return g.scale
  }

  test('steps down while fill rate is the limit and stays where it keeps up', () => {
    const g = new QualityGovernor()
    // GPU bound: fps grow with fewer pixels; 60 reached at 0.7.
    const fps = (scale: number) => Math.min(60, 30 / (scale * scale))
    expect(run(g, 20, fps)).toBe(0.7)
    // Spare fps at 0.7 try 0.85, which drops again and stays out for a while.
    expect(run(g, 30, fps, 20)).toBe(0.7)
  })

  test('undoes a step that brings nothing', () => {
    const g = new QualityGovernor()
    // Capped elsewhere at 32 whatever the resolution.
    expect(run(g, 10, () => 32)).toBe(1)
  })

  test('climbs back when there is room', () => {
    const g = new QualityGovernor()
    run(g, 6, (s) => (s === 1 ? 40 : 60))
    expect(g.scale).toBeLessThan(1)
    expect(run(g, 30, () => 60, 6)).toBe(1)
  })
})

test('settings and the cap in force', () => {
  expect(normalizePerformance(null)).toEqual(DEFAULT_PERFORMANCE)
  expect(normalizePerformance({ maxFps: 45, lowPower: true }).maxFps).toBe(0)
  expect(effectiveCap({ ...DEFAULT_PERFORMANCE, maxFps: 60 })).toBe(60)
  expect(effectiveCap({ ...DEFAULT_PERFORMANCE, maxFps: 60, lowPower: true })).toBe(30)
  expect(effectiveCap({ ...DEFAULT_PERFORMANCE, lowPower: true })).toBe(30)
})
