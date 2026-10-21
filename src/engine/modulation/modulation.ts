import { KICK, SECTION, type AnalysisFrame } from '../analysis/analyzer'
import { NAMED_BANDS, type NamedBand } from '../analysis/bands'
import { isControl } from '../midi/midi'

// Modulation: source → transformation (amount, curve, smoothing) → parameter.
// Sources give 0–1; contributions are added to the parameter's position in its range.

export type BandRef = NamedBand | 'all'
// 'section': a change of section in a file analysed beforehand.
export type BeatRef = NamedBand | 'kick' | 'section'
export const BAND_REFS: readonly BandRef[] = [...NAMED_BANDS, 'all']
export const BEAT_REFS: readonly BeatRef[] = [...NAMED_BANDS, 'kick', 'section']

export const LFO_SHAPES = ['sine', 'triangle', 'saw', 'square'] as const
export type LfoShape = (typeof LFO_SHAPES)[number]
export const CURVES = ['linear', 'exp', 'log', 'smooth'] as const
export type Curve = (typeof CURVES)[number]
// Cycles per beat when an oscillator follows the tempo.
export const SYNC_RATES = [0.25, 0.5, 1, 2, 4] as const

export const LFO_RATE_MIN = 0.01
export const LFO_RATE_MAX = 10
export const DECAY_MIN = 20
export const DECAY_MAX = 2000
export const SMOOTHING_MAX = 1000

export type ModSource =
  | { kind: 'band'; band: BandRef }
  // Jumps to 1 on each onset and falls back with `decay` ms time constant.
  | { kind: 'beat'; band: BeatRef; decay: number }
  // Free: `rate` in Hz. Synced: `rate` in cycles per beat (one of SYNC_RATES).
  | { kind: 'lfo'; shape: LfoShape; rate: number; sync: boolean }
  // A MIDI control's value; `control` as engine/midi writes it, null until learned.
  | { kind: 'midi'; control: string | null }

export type SourceKind = ModSource['kind']

export interface Modulation {
  id: string
  source: ModSource
  // -1 to 1: share of the parameter's range added at full source.
  amount: number
  curve: Curve
  // Time constant in ms; 0 follows the source directly.
  smoothing: number
}

export function defaultSource(kind: SourceKind): ModSource {
  if (kind === 'band') return { kind, band: 'bass' }
  if (kind === 'beat') return { kind, band: 'kick', decay: 250 }
  if (kind === 'midi') return { kind, control: null }
  return { kind, shape: 'sine', rate: 1, sync: true }
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const num = (v: unknown, min: number, max: number, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : fallback)
const oneOf = <T>(v: unknown, list: readonly T[], fallback: T): T => (list.includes(v as T) ? (v as T) : fallback)

// A stored source checked; null when it is not one.
export function normalizeSource(raw: unknown): ModSource | null {
  if (!isObj(raw)) return null
  if (raw.kind === 'band') return { kind: 'band', band: oneOf(raw.band, BAND_REFS, 'bass') }
  if (raw.kind === 'beat') return { kind: 'beat', band: oneOf(raw.band, BEAT_REFS, 'kick'), decay: num(raw.decay, DECAY_MIN, DECAY_MAX, 250) }
  if (raw.kind === 'lfo') {
    const sync = raw.sync === true
    const rate = sync ? oneOf(raw.rate, SYNC_RATES, 1) : num(raw.rate, LFO_RATE_MIN, LFO_RATE_MAX, 1)
    return { kind: 'lfo', shape: oneOf(raw.shape, LFO_SHAPES, 'sine'), rate, sync }
  }
  if (raw.kind === 'midi') return { kind: 'midi', control: isControl(raw.control) ? raw.control : null }
  return null
}

let nextId = 0
export function newModulation(kind: SourceKind = 'band'): Modulation {
  nextId++
  return { id: `m${Date.now().toString(36)}${nextId}`, source: defaultSource(kind), amount: 0.5, curve: 'linear', smoothing: 0 }
}

// One cycle per unit of phase, 0–1, starting at 0.
export function lfo(shape: LfoShape, phase: number): number {
  const p = phase - Math.floor(phase)
  if (shape === 'sine') return 0.5 - 0.5 * Math.cos(2 * Math.PI * p)
  if (shape === 'triangle') return 1 - Math.abs(2 * p - 1)
  if (shape === 'saw') return p
  return p < 0.5 ? 1 : 0
}

export function applyCurve(curve: Curve, x: number): number {
  const v = x < 0 ? 0 : x > 1 ? 1 : x
  if (curve === 'exp') return v * v
  if (curve === 'log') return Math.sqrt(v)
  if (curve === 'smooth') return v * v * (3 - 2 * v)
  return v
}

interface State {
  value: number
  env: number
  seen: number
  started: boolean
}

const BEAT_SLOT: Record<BeatRef, number> = { ...Object.fromEntries(NAMED_BANDS.map((b, i) => [b, i])), kick: KICK, section: SECTION } as Record<BeatRef, number>
const FALLBACK_BPM = 120

// Evaluates modulations once per rendered frame. State (smoothing, beat envelopes) is kept
// per key, so the same modulation on two layers runs independently.
export class Modulator {
  private readonly states = new Map<string, State>()
  private time = 0
  private dt = 0
  private frame: AnalysisFrame | null = null
  // Beats elapsed, continuous: synced oscillators read it. Follows the beat phase while the
  // tempo is known, runs at 120 BPM otherwise.
  beats = 0
  // Current value of a MIDI control, 0–1; set by the app.
  controls: (id: string) => number = () => 0
  // Frames advanced, so a shared modulator is worked out once per frame.
  private tick = 0
  private readonly sharedTick = new Map<string, number>()

  advance(time: number, dt: number, frame: AnalysisFrame | null): void {
    this.time = time
    this.dt = dt
    this.frame = frame
    this.tick++
    if (frame && frame.bpm > 0) {
      let next = Math.floor(this.beats) + frame.phase
      if (next < this.beats - 0.5) next += 1
      this.beats = next
    } else {
      this.beats += (dt * FALLBACK_BPM) / 60
    }
  }

  // Sum of the contributions, in units of the parameter's range.
  sum(key: string, mods: readonly Modulation[]): number {
    let total = 0
    for (const m of mods) total += m.amount * this.output(`${key}:${m.id}`, m)
    return total
  }

  // A shared modulator's output this frame, 0–1, the same wherever it is read.
  shared(id: string, m: Pick<Modulation, 'source' | 'curve' | 'smoothing'>): number {
    const key = `shared:${id}`
    if (this.sharedTick.get(key) === this.tick) return this.states.get(key)?.value ?? 0
    this.sharedTick.set(key, this.tick)
    return this.output(key, m)
  }

  private output(key: string, m: Pick<Modulation, 'source' | 'curve' | 'smoothing'>): number {
    let s = this.states.get(key)
    if (!s) {
      s = { value: 0, env: 0, seen: 0, started: false }
      this.states.set(key, s)
    }
    const x = applyCurve(m.curve, this.source(s, m.source))
    s.value = m.smoothing > 0 ? s.value + (x - s.value) * (1 - Math.exp((-this.dt * 1000) / m.smoothing)) : x
    return s.value
  }

  private source(s: State, src: ModSource): number {
    const f = this.frame
    if (src.kind === 'lfo') return lfo(src.shape, src.sync ? this.beats * src.rate : this.time * src.rate)
    if (src.kind === 'midi') return src.control ? this.controls(src.control) : 0
    if (src.kind === 'band') {
      if (!f) return 0
      if (src.band === 'all') {
        let sum = 0
        for (let i = 0; i < f.named.length; i++) sum += f.named[i]
        return sum / f.named.length
      }
      return f.named[NAMED_BANDS.indexOf(src.band)]
    }
    const count = f ? f.beats[BEAT_SLOT[src.band]] : s.seen
    if (!s.started) {
      s.started = true
      s.seen = count
    }
    if (count !== s.seen) {
      s.seen = count
      s.env = 1
    } else {
      s.env *= Math.exp((-this.dt * 1000) / src.decay)
    }
    return s.env
  }
}
