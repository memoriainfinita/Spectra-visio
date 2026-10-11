import { describe, expect, it } from 'vitest'
import { SECTION, createFrame } from '../analysis/analyzer'
import { AutoClock, DEFAULT_AUTO, MIN_GAP_MS, normalizeAuto, pickNext, type AutoSettings } from './auto'

const settings = (patch: Partial<AutoSettings>): AutoSettings => ({ ...DEFAULT_AUTO, seconds: 0, bars: 0, onSection: false, onTrack: false, ...patch })

// Runs the clock at 60 fps for `ms`, with a steady tempo; returns the times it fired.
function run(clock: AutoClock, s: AutoSettings, ms: number, opts: { bpm?: number; from?: number; section?: (t: number) => number; track?: (t: number) => string | null } = {}) {
  const frame = createFrame()
  const fired: { t: number; why: string }[] = []
  for (let t = opts.from ?? 0; t < (opts.from ?? 0) + ms; t += 1000 / 60) {
    frame.bpm = opts.bpm ?? 0
    frame.phase = opts.bpm ? ((t / 1000) * opts.bpm) / 60 % 1 : 0
    frame.beats[SECTION] = opts.section?.(t) ?? 0
    const why = clock.tick({ now: t, settings: s, frame, trackId: opts.track?.(t) ?? 'a' })
    if (why) fired.push({ t, why })
  }
  return fired
}

describe('auto clock', () => {
  it('fires every N seconds', () => {
    const fired = run(new AutoClock(), settings({ seconds: 10 }), 35000)
    expect(fired.map((f) => Math.round(f.t / 1000))).toEqual([10, 20, 30])
  })

  it('fires every N bars, on the beat', () => {
    const fired = run(new AutoClock(), settings({ bars: 4 }), 17000, { bpm: 120 })
    // 16 beats at 120 BPM: every 8 s.
    expect(fired.map((f) => f.why)).toEqual(['bars', 'bars'])
    for (const f of fired) expect(((f.t / 1000) * 2) % 1).toBeLessThan(0.05)
    expect(Math.round(fired[0].t / 1000)).toBe(8)
  })

  it('fires on section changes and new tracks, not on the first track', () => {
    const s = settings({ onSection: true, onTrack: true })
    // Nothing plays for a moment while the next track loads.
    const fired = run(new AutoClock(), s, 30000, { section: (t) => (t > 5000 ? 1 : 0), track: (t) => (t < 14800 ? 'a' : t < 15000 ? null : 'b') })
    expect(fired.map((f) => [f.why, Math.round(f.t / 1000)])).toEqual([
      ['section', 5],
      ['track', 15],
    ])
  })

  it('drops triggers right after a change', () => {
    const s = settings({ onSection: true, onTrack: true })
    const fired = run(new AutoClock(), s, 10000, { section: (t) => (t > 3000 ? 1 : 0), track: (t) => (t < 3000 + MIN_GAP_MS / 2 ? 'a' : 'b') })
    expect(fired.map((f) => f.why)).toEqual(['section'])
  })

  it('counts again from a reset', () => {
    const clock = new AutoClock()
    clock.reset(5000)
    const fired = run(clock, settings({ seconds: 10 }), 12000, { from: 5000 })
    expect(fired.map((f) => Math.round(f.t / 1000))).toEqual([15])
  })
})

describe('auto settings and choice', () => {
  it('keeps valid fields and replaces the rest', () => {
    expect(normalizeAuto({ seconds: 15, bars: 7, pool: 'presets', target: 'nope' })).toEqual({ ...DEFAULT_AUTO, seconds: 15, pool: 'presets' })
    expect(normalizeAuto(null)).toEqual(DEFAULT_AUTO)
  })

  it('never repeats the current one when there is a choice', () => {
    for (let i = 0; i < 20; i++) expect(pickNext(['a', 'b', 'c'], 'b')).not.toBe('b')
    expect(pickNext(['a'], 'a')).toBe('a')
    expect(pickNext([], null)).toBeNull()
    expect(pickNext(['a', 'b'], 'a', () => 0.99)).toBe('b')
  })
})
