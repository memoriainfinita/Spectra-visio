import { SECTION, type AnalysisFrame } from '../analysis/analyzer'
import { CATEGORIES, type VisualCategory } from '../render/visual'

// Automatic mode: changes the visualization when one of its triggers fires.

export const AUTO_POOLS = ['all', 'favorites', 'category', 'presets'] as const
export type AutoPool = (typeof AUTO_POOLS)[number]
export const AUTO_TARGETS = ['layer', 'alternate'] as const
// 'layer': the selected layer, with the scene's transition. 'alternate': the layer the
// crossfader hides, then the crossfader moves over to it.
export type AutoTarget = (typeof AUTO_TARGETS)[number]
// 0 turns the trigger off.
export const AUTO_SECONDS = [0, 10, 15, 30, 60, 120] as const
export const AUTO_BARS = [0, 4, 8, 16, 32] as const
// Bars are counted as four beats.
export const BEATS_PER_BAR = 4
// Triggers closer than this to the last change are dropped: a section change and a new
// track often come together.
export const MIN_GAP_MS = 2000

export interface AutoSettings {
  seconds: number
  bars: number
  onSection: boolean
  onTrack: boolean
  pool: AutoPool
  category: VisualCategory
  target: AutoTarget
}

export const DEFAULT_AUTO: AutoSettings = { seconds: 30, bars: 0, onSection: true, onTrack: true, pool: 'all', category: 'geometric', target: 'layer' }

function oneOf<T>(value: unknown, list: readonly T[], fallback: T): T {
  return list.includes(value as T) ? (value as T) : fallback
}

export function normalizeAuto(raw: unknown): AutoSettings {
  if (typeof raw !== 'object' || raw === null) return DEFAULT_AUTO
  const r = raw as Record<string, unknown>
  const d = DEFAULT_AUTO
  return {
    seconds: oneOf(r.seconds, AUTO_SECONDS, d.seconds),
    bars: oneOf(r.bars, AUTO_BARS, d.bars),
    onSection: typeof r.onSection === 'boolean' ? r.onSection : d.onSection,
    onTrack: typeof r.onTrack === 'boolean' ? r.onTrack : d.onTrack,
    pool: oneOf(r.pool, AUTO_POOLS, d.pool),
    category: oneOf(r.category, CATEGORIES, d.category),
    target: oneOf(r.target, AUTO_TARGETS, d.target),
  }
}

export type AutoTrigger = 'time' | 'bars' | 'section' | 'track'

export interface AutoInput {
  // Milliseconds.
  now: number
  settings: AutoSettings
  // The analysis matching what is heard; null without audio.
  frame: AnalysisFrame | null
  // The track playing; null while none plays (paused, loading, another source).
  trackId: string | null
}

// Decides, frame by frame, when a change is due. Beats are counted where the beat phase
// wraps, so bar changes land on a beat.
export class AutoClock {
  private last = 0
  private beats = 0
  private phase = -1
  private section = -1
  private track: string | null = null

  // Starts counting from now, as if a change had just happened.
  reset(now: number): void {
    this.last = now
    this.beats = 0
  }

  tick(input: AutoInput): AutoTrigger | null {
    const { now, settings: s, frame } = input
    let trigger: AutoTrigger | null = null

    let onBeat = false
    if (frame && frame.bpm > 0) {
      onBeat = this.phase >= 0 && frame.phase < this.phase - 0.5
      if (onBeat) this.beats++
      this.phase = frame.phase
    } else {
      this.phase = -1
    }
    // Only on a beat, so a bar change held back by MIN_GAP_MS still lands on one.
    if (onBeat && s.bars > 0 && this.beats >= s.bars * BEATS_PER_BAR) trigger = 'bars'

    const section = frame ? frame.beats[SECTION] : this.section
    if (this.section >= 0 && section !== this.section && s.onSection) trigger = 'section'
    this.section = section

    // No track while the next one loads or the player is paused: the last one counts.
    if (input.trackId !== null && input.trackId !== this.track) {
      if (this.track !== null && s.onTrack) trigger = 'track'
      this.track = input.trackId
    }

    if (!trigger && s.seconds > 0 && now - this.last >= s.seconds * 1000) trigger = 'time'
    if (!trigger || now - this.last < MIN_GAP_MS) return null
    this.reset(now)
    return trigger
  }
}

// One of `items` at random, other than `current` when there is a choice.
export function pickNext<T>(items: readonly T[], current: T | null, random = Math.random): T | null {
  const others = items.length > 1 ? items.filter((x) => x !== current) : items
  if (!others.length) return null
  return others[Math.floor(random() * others.length) % others.length]
}
