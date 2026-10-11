// Performance: an fps cap, a low-power mode and the internal resolution that follows the
// measured fps. Pure logic; the renderer feeds it frame times and the fps once a second.

export const FPS_CAPS = [0, 60, 30] as const
export type FpsCap = (typeof FPS_CAPS)[number]

// Internal resolution steps, as a fraction of each side.
export const QUALITY_STEPS = [1, 0.85, 0.7, 0.5] as const
export const LOW_POWER_FPS = 30
export const LOW_POWER_SCALE = 0.75

export interface PerformanceSettings {
  // Lower the internal resolution when the fps fall short.
  adaptive: boolean
  // 0 unlimited.
  maxFps: FpsCap
  // 30 fps and three quarters of the resolution.
  lowPower: boolean
  showFps: boolean
}

export const DEFAULT_PERFORMANCE: PerformanceSettings = { adaptive: true, maxFps: 0, lowPower: false, showFps: true }

export function normalizePerformance(raw: unknown): PerformanceSettings {
  if (typeof raw !== 'object' || raw === null) return DEFAULT_PERFORMANCE
  const r = raw as Record<string, unknown>
  const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d)
  return {
    adaptive: bool(r.adaptive, DEFAULT_PERFORMANCE.adaptive),
    maxFps: (FPS_CAPS as readonly unknown[]).includes(r.maxFps) ? (r.maxFps as FpsCap) : DEFAULT_PERFORMANCE.maxFps,
    lowPower: bool(r.lowPower, DEFAULT_PERFORMANCE.lowPower),
    showFps: bool(r.showFps, DEFAULT_PERFORMANCE.showFps),
  }
}

// The cap in force: low power wins over a higher one.
export function effectiveCap(p: PerformanceSettings): number {
  if (p.lowPower) return p.maxFps && p.maxFps < LOW_POWER_FPS ? p.maxFps : LOW_POWER_FPS
  return p.maxFps
}

// Lets through about `cap` frames a second out of the display's animation frames. Frames
// a little early still pass, so a cap equal to the display rate drops none.
export class FrameGate {
  private next = -Infinity

  pass(now: number, cap: number): boolean {
    if (!cap) {
      this.next = -Infinity
      return true
    }
    const interval = 1000 / cap
    if (now < this.next - interval * 0.2) return false
    // Keeps the average on the cap; after a long gap it starts again from now.
    this.next = Math.max(this.next + interval, now)
    return true
  }
}

// Seconds of short fps before stepping down, and of spare fps before stepping up.
const LOW_SECONDS = 2
const HIGH_SECONDS = 5
// A step down that does not bring at least this much more fps is undone: the limit is
// elsewhere (the CPU, the browser's frame rate).
const MIN_GAIN = 1.1
// How long a failed step keeps the governor from trying the same again.
const HOLD_DOWN_S = 60
const HOLD_UP_S = 30

// Picks the resolution step from the fps measured once a second against the target.
export class QualityGovernor {
  level = 0
  private low = 0
  private high = 0
  // A step down waiting to show it helped.
  private trial: { from: number; fps: number; at: number } | null = null
  // When the last step up was, to catch one that brings the fps down again.
  private raised: number | null = null
  private downHold = -Infinity
  private upHold = -Infinity

  get scale(): number {
    return QUALITY_STEPS[this.level]
  }

  reset(): void {
    this.level = 0
    this.low = this.high = 0
    this.trial = null
    this.raised = null
    this.downHold = this.upHold = -Infinity
  }

  // `now` in seconds. Returns the scale to render at.
  update(fps: number, target: number, now: number): number {
    const low = fps < target * 0.85
    this.low = low ? this.low + 1 : 0
    this.high = fps >= target * 0.95 ? this.high + 1 : 0

    const trial = this.trial
    if (trial && now - trial.at >= LOW_SECONDS) {
      this.trial = null
      if (fps < trial.fps * MIN_GAIN) {
        this.level = trial.from
        this.downHold = now + HOLD_DOWN_S
        this.low = this.high = 0
        return this.scale
      }
    }
    if (this.raised !== null && now - this.raised > HIGH_SECONDS) this.raised = null

    if (this.low >= LOW_SECONDS && !this.trial && this.level < QUALITY_STEPS.length - 1) {
      // Right after a step up: that step was too much.
      if (this.raised !== null) {
        this.upHold = now + HOLD_UP_S
        this.raised = null
        this.level++
      } else if (now >= this.downHold) {
        this.trial = { from: this.level, fps, at: now }
        this.level++
      }
      this.low = this.high = 0
    } else if (this.high >= HIGH_SECONDS && this.level > 0 && !this.trial && now >= this.upHold) {
      this.level--
      this.raised = now
      this.low = this.high = 0
    }
    return this.scale
  }
}

// What the renderer needs of these settings.
export interface QualityTarget {
  fpsCap: number
  setQuality(adaptive: boolean, maxScale: number): void
}

export function applyPerformance(r: QualityTarget, p: PerformanceSettings): void {
  r.fpsCap = effectiveCap(p)
  r.setQuality(p.adaptive, p.lowPower ? LOW_POWER_SCALE : 1)
}
