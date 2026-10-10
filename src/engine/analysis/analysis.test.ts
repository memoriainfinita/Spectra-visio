import { describe, expect, test } from 'vitest'
import { Analyzer, FFT_SIZE, KICK, createFrame } from './analyzer'
import { bandPower, binWeights, logEdges } from './bands'
import { BeatDetector } from './beat'
import { DelayLine } from './delay'
import { AutoLevel, dbToLevel, follow, smoothCoefficients } from './level'
import { stereoStats } from './stereo'
import { TapTempo, beatPhase, estimateTempo } from './tempo'

describe('bands', () => {
  test('log edges grow by a constant ratio from min to max', () => {
    const e = logEdges(4, 20, 320)
    expect(Array.from(e).map((x) => Math.round(x))).toEqual([20, 40, 80, 160, 320])
  })

  test('bin weights add up to 1 and cover the band', () => {
    const w = binWeights(100, 400, 48000, 4096)
    const sum = w.weights.reduce((a, b) => a + b, 0)
    expect(sum).toBeCloseTo(1, 6)
    const binHz = 48000 / 4096
    expect(w.start).toBe(Math.round(100 / binHz))
    expect(w.start + w.weights.length - 1).toBe(Math.round(400 / binHz))
  })

  test('a band narrower than one bin reads the bin it sits in', () => {
    const w = binWeights(20, 24, 48000, 4096)
    const power = new Float32Array(2048)
    power[2] = 5
    expect(bandPower(power, w)).toBeCloseTo(5, 5)
  })

  test('a band above Nyquist is empty', () => {
    expect(binWeights(30000, 40000, 44100, 4096).weights.length).toBe(0)
  })
})

describe('levels and smoothing', () => {
  test('decibels map onto 0–1 below the reference', () => {
    expect(dbToLevel(-30, -30)).toBe(1)
    expect(dbToLevel(-60, -30)).toBeCloseTo(0.5)
    expect(dbToLevel(-120, -30)).toBe(0)
    expect(dbToLevel(0, -30)).toBe(1)
  })

  test('auto level jumps up at once and falls slowly, never below its floor', () => {
    const a = new AutoLevel()
    expect(a.update(-10, 0.016)).toBe(-10)
    expect(a.update(-40, 1)).toBeCloseTo(-13)
    for (let i = 0; i < 100; i++) a.update(-100, 1)
    expect(a.reference).toBe(-60)
  })

  test('smoothing reaches the same value at any frame rate', () => {
    const run = (fps: number) => {
      let v = 0
      for (let i = 0; i < fps * 0.2; i++) v = follow(v, 1, smoothCoefficients(0.6, 1 / fps))
      return v
    }
    expect(run(30)).toBeCloseTo(run(144), 3)
  })

  test('smoothing 0 passes the input through', () => {
    expect(follow(0.2, 0.9, smoothCoefficients(0, 0.016))).toBeCloseTo(0.9, 12)
  })
})

// A level that sits at `base` and jumps to `peak` for 80 ms at every beat.
function pulses(fps: number, seconds: number, periodMs: number, base = 0.35, peak = 0.85) {
  const frames: { t: number; level: number }[] = []
  let seed = 1
  const noise = () => ((seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5) * 0.03
  for (let i = 0; i < fps * seconds; i++) {
    const t = (i * 1000) / fps
    const into = t % periodMs
    const level = into < 20 ? base + ((peak - base) * into) / 20 : into < 80 ? peak : base
    frames.push({ t, level: level + noise() })
  }
  return frames
}

describe('beat detector', () => {
  test.each([30, 60, 144])('finds every pulse at %i fps', (fps) => {
    const d = new BeatDetector()
    const hits = pulses(fps, 6, 500)
      .filter((f) => d.update(f.level, 1 / fps, f.t))
      .map((f) => f.t)
    // 12 pulses in 6 s; the first one is caught too, from the baseline of the frame before.
    expect(hits.length).toBe(12)
    for (let i = 1; i < hits.length; i++) expect(hits[i] - hits[i - 1]).toBeGreaterThan(450)
  })

  test('steady noise gives no beats', () => {
    const d = new BeatDetector()
    let seed = 7
    let hits = 0
    for (let i = 0; i < 600; i++) {
      const level = 0.5 + ((seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5) * 0.03
      if (d.update(level, 1 / 60, (i * 1000) / 60)) hits++
    }
    expect(hits).toBe(0)
  })
})

describe('tempo', () => {
  const beats = (bpm: number, count: number, jitter = 0) => {
    let seed = 3
    return Array.from({ length: count }, (_, i) => (i * 60000) / bpm + ((seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5) * jitter)
  }

  test.each([80, 100, 120, 128, 174])('estimates %i BPM from steady onsets', (bpm) => {
    const e = estimateTempo(beats(bpm, 16, 20))
    expect(e?.bpm).toBeCloseTo(bpm, 0)
    expect(e!.confidence).toBeGreaterThan(0.5)
  })

  test('missing and extra onsets do not move the estimate', () => {
    const on = beats(120, 20).filter((_, i) => i % 5 !== 3)
    on.push(1250, 3740)
    on.sort((a, b) => a - b)
    expect(estimateTempo(on)?.bpm).toBeCloseTo(120, 0)
  })

  test('too few onsets give no estimate', () => {
    expect(estimateTempo([0, 500, 1000])).toBeNull()
  })

  test('beat phase wraps every period', () => {
    expect(beatPhase(1250, 1000, 120)).toBeCloseTo(0.5)
    expect(beatPhase(500, 1000, 120)).toBeCloseTo(0)
    expect(beatPhase(875, 1000, 120)).toBeCloseTo(0.75)
  })

  test('tap tempo uses the median interval and restarts after a pause', () => {
    const tap = new TapTempo()
    expect(tap.tap(0)).toBeNull()
    tap.tap(500)
    tap.tap(1000)
    expect(tap.tap(1700)).toBeCloseTo(120)
    expect(tap.tap(5000)).toBeNull()
    expect(tap.tap(5600)).toBeCloseTo(100)
  })
})

describe('stereo', () => {
  const sine = (phase: number, amp = 1) => Float32Array.from({ length: 1024 }, (_, i) => amp * Math.sin((i / 32) * Math.PI + phase))

  test('identical channels are centred and fully correlated', () => {
    const s = stereoStats(sine(0), sine(0), { rmsL: 0, rmsR: 0, balance: 0, correlation: 0 })
    expect(s.balance).toBeCloseTo(0)
    expect(s.correlation).toBeCloseTo(1)
  })

  test('opposite phase correlates at -1; a louder side moves the balance', () => {
    const out = { rmsL: 0, rmsR: 0, balance: 0, correlation: 0 }
    expect(stereoStats(sine(0), sine(Math.PI), out).correlation).toBeCloseTo(-1)
    expect(stereoStats(sine(0, 0.2), sine(0, 0.6), out).balance).toBeCloseTo(0.5)
  })

  test('silence gives zeros, not NaN', () => {
    const z = new Float32Array(1024)
    expect(stereoStats(z, z, { rmsL: 0, rmsR: 0, balance: 0, correlation: 0 })).toEqual({ rmsL: 0, rmsR: 0, balance: 0, correlation: 0 })
  })
})

describe('delay line', () => {
  test('reads the newest frame at least the delay old, or the oldest kept', () => {
    const line = new DelayLine(4, () => ({ time: 0 }))
    expect(line.read(0, 0)).toBeNull()
    for (const t of [0, 10, 20, 30, 40, 50]) line.next().time = t
    expect(line.read(50, 0)?.time).toBe(50)
    expect(line.read(50, 15)?.time).toBe(30)
    // 0 and 10 were overwritten: the oldest left is 20.
    expect(line.read(50, 45)?.time).toBe(20)
  })
})

describe('analyzer', () => {
  // A spectrum with energy only around 60 Hz at `db`, the rest at -140 dB.
  function input(db: number) {
    const spec = new Float32Array(FFT_SIZE / 2).fill(-140)
    spec[5] = spec[6] = db
    const wave = new Float32Array(FFT_SIZE)
    return { specL: spec, specR: spec, waveL: wave, waveR: wave, sampleRate: 48000 }
  }

  test('kick pulses at 120 BPM give onsets, a tempo and a beat phase', () => {
    const a = new Analyzer()
    const frame = createFrame()
    const opts = { bands: 32, smoothing: 0.3, autoLevel: true }
    for (let i = 0; i < 60 * 12; i++) {
      const t = (i * 1000) / 60
      a.process(input(t % 500 < 80 ? -20 : -45), t, opts, frame)
    }
    expect(frame.beats[KICK]).toBeGreaterThan(20)
    expect(frame.bpm).toBeCloseTo(120, 0)
    expect(frame.bandCount).toBe(32)
    // 60 Hz falls in band 5 of 32 (20 Hz to 16 kHz).
    expect(frame.bands[5]).toBeGreaterThan(frame.bands[30])
  })

  test('taps override the estimate until switched back', () => {
    const a = new Analyzer()
    for (const t of [0, 600, 1200, 1800]) a.tap(t)
    expect(a.tempoMode).toBe('tap')
    expect(a.bpm()).toBeCloseTo(100)
    a.useAutoTempo()
    expect(a.bpm()).toBeNull()
  })
})
