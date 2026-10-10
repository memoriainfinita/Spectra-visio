// Mapping from decibels to 0–1 levels, automatic levelling and time-based smoothing.

// Span of decibels mapped onto 0–1, below the reference level.
export const DYNAMIC_RANGE_DB = 60
// Fixed reference without automatic levelling: the AnalyserNode default maxDecibels.
export const FIXED_REFERENCE_DB = -30
// Automatic levelling never lifts quieter input than this, so silence stays dark.
const MIN_REFERENCE_DB = -60
const REFERENCE_FALL_DB_PER_S = 3

export function dbToLevel(db: number, referenceDb: number): number {
  const v = (db - referenceDb + DYNAMIC_RANGE_DB) / DYNAMIC_RANGE_DB
  return v < 0 ? 0 : v > 1 ? 1 : v
}

// Follows the loudest band: jumps up at once, falls slowly, so the levels use the full
// 0–1 range on quiet and loud material alike without pumping on every beat.
export class AutoLevel {
  reference = FIXED_REFERENCE_DB

  update(loudestDb: number, dt: number): number {
    const target = Math.max(MIN_REFERENCE_DB, loudestDb)
    if (target >= this.reference) this.reference = target
    else this.reference = Math.max(target, this.reference - REFERENCE_FALL_DB_PER_S * dt)
    return this.reference
  }

  reset(): void {
    this.reference = FIXED_REFERENCE_DB
  }
}

// Longest release, at smoothing 1. The attack is a fraction of it so peaks still land.
const MAX_RELEASE_S = 0.5
const ATTACK_SHARE = 0.15

// Exponential attack and release over elapsed time, so the result does not depend on the
// frame rate. smoothing 0 passes the input through.
export function smoothCoefficients(smoothing: number, dt: number): { attack: number; release: number } {
  const release = smoothing * MAX_RELEASE_S
  const attack = release * ATTACK_SHARE
  return {
    attack: attack > 0 ? 1 - Math.exp(-dt / attack) : 1,
    release: release > 0 ? 1 - Math.exp(-dt / release) : 1,
  }
}

export function follow(current: number, target: number, k: { attack: number; release: number }): number {
  return current + (target - current) * (target > current ? k.attack : k.release)
}
