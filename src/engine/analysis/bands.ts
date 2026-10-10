// Frequency bands and their mapping onto FFT bins.

// Fixed bands from sub-bass to brilliance, for beats and modulation.
export const NAMED_BANDS = ['sub', 'bass', 'lowMid', 'mid', 'highMid', 'presence', 'brilliance'] as const
export type NamedBand = (typeof NAMED_BANDS)[number]

export const NAMED_EDGES: Record<NamedBand, readonly [number, number]> = {
  sub: [20, 60],
  bass: [60, 250],
  lowMid: [250, 500],
  mid: [500, 2000],
  highMid: [2000, 4000],
  presence: [4000, 6000],
  brilliance: [6000, 20000],
}

// Kick drum range, the input of the tempo estimate.
export const KICK_EDGES = [20, 250] as const

export const MIN_HZ = 20
export const MAX_HZ = 16000

// count + 1 edges, evenly spaced on a log scale.
export function logEdges(count: number, minHz = MIN_HZ, maxHz = MAX_HZ): Float64Array {
  const edges = new Float64Array(count + 1)
  const ratio = maxHz / minHz
  for (let i = 0; i <= count; i++) edges[i] = minHz * ratio ** (i / count)
  return edges
}

// A band as a weighted run of consecutive bins; the weights add up to 1.
export interface BinWeights {
  start: number
  weights: Float32Array
}

// Bin i covers [(i - 0.5), (i + 0.5)] × binHz. Each bin weighs by how much of it falls inside
// the band, so a band narrower than one bin still reads the bin it sits in.
export function binWeights(lo: number, hi: number, sampleRate: number, fftSize: number): BinWeights {
  const binHz = sampleRate / fftSize
  const bins = fftSize / 2
  const top = Math.min(hi, sampleRate / 2)
  if (lo >= top) return { start: 0, weights: new Float32Array(0) }
  const first = Math.max(0, Math.round(lo / binHz))
  const last = Math.min(bins - 1, Math.round(top / binHz))
  const weights = new Float32Array(last - first + 1)
  let sum = 0
  for (let i = first; i <= last; i++) {
    const w = Math.max(0, Math.min(top, (i + 0.5) * binHz) - Math.max(lo, (i - 0.5) * binHz))
    weights[i - first] = w
    sum += w
  }
  if (sum > 0) for (let k = 0; k < weights.length; k++) weights[k] /= sum
  return { start: first, weights }
}

// Decibels from AnalyserNode.getFloatFrequencyData to linear power; -Infinity gives 0.
export function dbToPower(db: Float32Array, out: Float32Array): void {
  for (let i = 0; i < db.length; i++) out[i] = 10 ** (db[i] / 10)
}

export function bandPower(power: Float32Array, band: BinWeights): number {
  let p = 0
  for (let k = 0; k < band.weights.length; k++) p += band.weights[k] * power[band.start + k]
  return p
}

export function powerToDb(power: number): number {
  return power > 1e-12 ? 10 * Math.log10(power) : -120
}
