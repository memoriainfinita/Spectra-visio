// Tempo from onset times (live estimate) or from taps.

export const MIN_BPM = 70
export const MAX_BPM = 180
const STEP_BPM = 0.5
// Onsets older than this leave the estimate.
export const ONSET_WINDOW_MS = 10000
// Intervals considered between any two onsets, not only neighbours: a missed or extra
// onset then still leaves most of the pattern intact.
const MAX_INTERVAL_MS = 3000
const MAX_MULTIPLE = 4
// Timing jitter tolerated, as a share of the beat period.
const JITTER = 0.06
const MIN_ONSETS = 6

export interface TempoEstimate {
  bpm: number
  // 0–1: share of onset pairs that fit the tempo.
  confidence: number
}

// Every BPM candidate in range scores the onset pairs whose interval is a whole multiple
// of its period, the nearest multiples counting most. Double and half tempo also fit some
// pairs, but fewer and at larger multiples, so the true tempo scores highest.
export function estimateTempo(onsets: readonly number[]): TempoEstimate | null {
  if (onsets.length < MIN_ONSETS) return null
  const intervals: number[] = []
  for (let i = 0; i < onsets.length; i++) {
    for (let j = i + 1; j < onsets.length; j++) {
      const d = onsets[j] - onsets[i]
      if (d > MAX_INTERVAL_MS) break
      intervals.push(d)
    }
  }
  if (intervals.length === 0) return null
  let best = 0
  let bestScore = 0
  const scores: number[] = []
  for (let bpm = MIN_BPM; bpm <= MAX_BPM; bpm += STEP_BPM) {
    const period = 60000 / bpm
    const sigma = period * JITTER
    let score = 0
    for (const d of intervals) {
      const k = Math.round(d / period)
      if (k < 1 || k > MAX_MULTIPLE) continue
      const off = (d - k * period) / sigma
      score += Math.exp(-0.5 * off * off) / k
    }
    scores.push(score)
    if (score > bestScore) {
      bestScore = score
      best = scores.length - 1
    }
  }
  if (bestScore <= 0) return null
  // Parabolic interpolation between grid steps.
  let shift = 0
  if (best > 0 && best < scores.length - 1) {
    const [a, b, c] = [scores[best - 1], scores[best], scores[best + 1]]
    const denom = a - 2 * b + c
    if (denom < 0) shift = (0.5 * (a - c)) / denom
  }
  // The best possible score gives every pair weight 1/k with k from its own interval.
  let ideal = 0
  const period = 60000 / (MIN_BPM + best * STEP_BPM)
  for (const d of intervals) {
    const k = Math.round(d / period)
    if (k >= 1 && k <= MAX_MULTIPLE) ideal += 1 / k
  }
  return {
    bpm: MIN_BPM + (best + shift) * STEP_BPM,
    confidence: ideal > 0 ? Math.min(1, bestScore / ideal) * Math.min(1, intervals.length / 30) : 0,
  }
}

// Beat phase 0–1 at `time`, counted from an onset on the grid.
export function beatPhase(time: number, anchor: number, bpm: number): number {
  const period = 60000 / bpm
  const p = ((time - anchor) / period) % 1
  return p < 0 ? p + 1 : p
}

const TAP_RESET_MS = 2000
const TAP_KEEP = 8

// Tempo from the median interval of the last taps; a pause longer than TAP_RESET_MS starts over.
export class TapTempo {
  private taps: number[] = []

  tap(now: number): number | null {
    const last = this.taps.at(-1)
    if (last !== undefined && now - last > TAP_RESET_MS) this.taps = []
    this.taps.push(now)
    if (this.taps.length > TAP_KEEP) this.taps.shift()
    return this.bpm()
  }

  bpm(): number | null {
    if (this.taps.length < 2) return null
    const intervals = this.taps.slice(1).map((t, i) => t - this.taps[i]).sort((a, b) => a - b)
    const mid = intervals.length >> 1
    const median = intervals.length % 2 ? intervals[mid] : (intervals[mid - 1] + intervals[mid]) / 2
    return 60000 / median
  }

  get last(): number | null {
    return this.taps.at(-1) ?? null
  }
}
