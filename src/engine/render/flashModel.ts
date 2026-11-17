// The arithmetic of the flash limiter, in plain code: the shader in limiter.ts does the same
// per cell, and the tests run this version against a counter written from WCAG 2.3.1.

// WCAG 2.3.1: a general flash is a pair of opposing changes of relative luminance of 0.1 or more
// (of the maximum) over a large enough area; three per second at most. Falling at once, the
// worst case is a sawtooth: one rise of `rise` per second takes 0.1 / rise seconds per flash,
// so a rise per second of 0.25 allows 2.5 flashes at most, clear of the limit of 3.
export const RISE_LUMINANCE_PER_S = 0.25
// A saturated red flash is a change of 0.0625 in (R − G − B), with R, G, B in 0–1: three
// per second at most is 0.1875 per second; the same margin.
export const RISE_RED_PER_S = 0.15

// What may be shown after `prev` was shown and `measured` is drawn: it may fall at once but
// rises by `step` at most. `first` takes the measure as it comes.
export function allowedLevel(prev: number, measured: number, step: number, first: boolean): number {
  return first ? measured : Math.min(measured, prev + step)
}

export function gainFor(allowed: number, measured: number): number {
  return measured > 0.0005 ? Math.min(1, allowed / measured) : 1
}

export function toLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

export function relativeLuminance(r: number, g: number, b: number): number {
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
}

// Moves of a series in `values`, taken at `times` (seconds), as the legs between its turning
// points: a leg counts only when it is `threshold` or more.
export function legs(times: number[], values: number[], threshold: number): { time: number; sign: 1 | -1 }[] {
  const out: { time: number; sign: 1 | -1 }[] = []
  if (values.length === 0) return out
  let ext = values[0]!
  let dir: 0 | 1 | -1 = 0
  let extTime = times[0]!
  for (let i = 1; i < values.length; i++) {
    const v = values[i]!
    if (dir === 0) {
      if (v - ext >= threshold) {
        out.push({ time: times[i]!, sign: 1 })
        dir = 1
        ext = v
        extTime = times[i]!
      } else if (ext - v >= threshold) {
        out.push({ time: times[i]!, sign: -1 })
        dir = -1
        ext = v
        extTime = times[i]!
      }
    } else if (dir === 1) {
      if (v > ext) {
        ext = v
        extTime = times[i]!
      } else if (ext - v >= threshold) {
        out.push({ time: extTime, sign: -1 })
        dir = -1
        ext = v
        extTime = times[i]!
      }
    } else if (v < ext) {
      ext = v
      extTime = times[i]!
    } else if (v - ext >= threshold) {
      out.push({ time: extTime, sign: 1 })
      dir = 1
      ext = v
      extTime = times[i]!
    }
  }
  return out
}

// The most flashes (pairs of opposing legs) in any one second.
export function maxFlashesPerSecond(times: number[], values: number[], threshold: number): number {
  const l = legs(times, values, threshold)
  let best = 0
  let from = 0
  for (let i = 0; i < l.length; i++) {
    while (l[i]!.time - l[from]!.time >= 1) from++
    best = Math.max(best, Math.floor((i - from + 1) / 2))
  }
  return best
}
