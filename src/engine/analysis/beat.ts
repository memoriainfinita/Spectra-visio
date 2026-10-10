// Onset detection on one band level: a hit is a rising level that jumps clearly above its
// recent average. Mean and variance are exponential over time, so the result does not
// depend on the frame rate.

const STATS_TAU_S = 0.6
// Standard deviations above the mean that count as a hit.
const SPREAD = 1.4
// Minimum jump on the 0–1 level scale (about 3.6 dB over a 60 dB range).
const MIN_JUMP = 0.06
const REFRACTORY_MS = 150

export class BeatDetector {
  private mean = 0
  private variance = 0
  private prev = 0
  private last = -Infinity
  private started = false

  // level 0–1, dt in seconds, now in milliseconds.
  update(level: number, dt: number, now: number): boolean {
    if (!this.started) {
      this.started = true
      this.mean = this.prev = level
      return false
    }
    const a = 1 - Math.exp(-dt / STATS_TAU_S)
    const dev = level - this.mean
    const hit = level > this.prev && dev > Math.max(MIN_JUMP, SPREAD * Math.sqrt(this.variance)) && now - this.last >= REFRACTORY_MS
    if (hit) this.last = now
    this.mean += a * dev
    this.variance = (1 - a) * (this.variance + a * dev * dev)
    this.prev = level
    return hit
  }

  reset(): void {
    this.started = false
    this.mean = this.variance = this.prev = 0
    this.last = -Infinity
  }
}
