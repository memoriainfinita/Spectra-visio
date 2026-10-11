// Whole-track analysis of decoded audio, before it plays: loudness (ITU-R BS.1770), the tempo
// and a beat grid fitted to the onset curve, and the points where the music changes section. Pure functions over sample arrays, run in a worker.

import { MAX_BPM, MIN_BPM } from '../analysis/tempo'

// Files are decoded at this rate for the analysis: a quarter of the memory of 44.1 kHz
// stereo, and still up to 11 kHz of content.
export const PREPASS_RATE = 22050

const FRAME = 1024
const HOP = 512
const BAND_COUNT = 16
const BAND_MIN_HZ = 40
const BAND_MAX_HZ = 10000

export interface Spectrum {
  // Frames per second.
  rate: number
  frames: number
  // BAND_COUNT powers per frame, linear.
  bands: Float32Array
  // Onset strength per frame: rise of the log spectrum since the previous frame.
  flux: Float32Array
}

// ---- Loudness ------------------------------------------------------------------------

interface Biquad {
  b0: number
  b1: number
  b2: number
  a1: number
  a2: number
}

// The two K-weighting stages of BS.1770 for any sample rate, in the form libebur128 uses: at
// 48 kHz it gives the coefficients printed in the standard.
function kWeighting(rate: number): Biquad[] {
  const shelf = (() => {
    const fc = 1681.974450955533
    const q = 0.7071752369554196
    const k = Math.tan((Math.PI * fc) / rate)
    const vh = Math.pow(10, 3.999843853973347 / 20)
    const vb = Math.pow(vh, 0.4996667741545416)
    const a0 = 1 + k / q + k * k
    return {
      b0: (vh + (vb * k) / q + k * k) / a0,
      b1: (2 * (k * k - vh)) / a0,
      b2: (vh - (vb * k) / q + k * k) / a0,
      a1: (2 * (k * k - 1)) / a0,
      a2: (1 - k / q + k * k) / a0,
    }
  })()
  const highPass = (() => {
    const fc = 38.13547087602444
    const q = 0.5003270373238773
    const k = Math.tan((Math.PI * fc) / rate)
    const a0 = 1 + k / q + k * k
    return { b0: 1, b1: -2, b2: 1, a1: (2 * (k * k - 1)) / a0, a2: (1 - k / q + k * k) / a0 }
  })()
  return [shelf, highPass]
}

const ABSOLUTE_GATE = -70
const RELATIVE_GATE = 10

// Integrated loudness in LUFS of one or two channels; -Infinity for silence.
export function loudness(channels: readonly Float32Array[], rate: number): number {
  const step = Math.round(rate / 10)
  const n = channels[0]?.length ?? 0
  const steps = Math.floor(n / step)
  if (steps < 4) return -Infinity
  // Mean square of the weighted signal per 100 ms, summed over channels.
  const energy = new Float64Array(steps)
  for (const data of channels) {
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0, z1 = 0, z2 = 0
    const [f, g] = kWeighting(rate)
    for (let s = 0; s < steps; s++) {
      let sum = 0
      for (let i = s * step, end = i + step; i < end; i++) {
        const x = data[i]
        const y = f.b0 * x + f.b1 * x1 + f.b2 * x2 - f.a1 * y1 - f.a2 * y2
        x2 = x1
        x1 = x
        const z = g.b0 * y + g.b1 * y1 + g.b2 * y2 - g.a1 * z1 - g.a2 * z2
        y2 = y1
        y1 = y
        z2 = z1
        z1 = z
        sum += z * z
      }
      energy[s] += sum / step
    }
  }
  // 400 ms blocks overlapping by 75 %.
  const blocks: number[] = []
  for (let s = 0; s + 4 <= steps; s++) blocks.push((energy[s] + energy[s + 1] + energy[s + 2] + energy[s + 3]) / 4)
  const lufs = (z: number) => -0.691 + 10 * Math.log10(z)
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
  const loud = blocks.filter((z) => z > 0 && lufs(z) > ABSOLUTE_GATE)
  if (!loud.length) return -Infinity
  const relative = lufs(mean(loud)) - RELATIVE_GATE
  const gated = loud.filter((z) => lufs(z) > relative)
  return lufs(mean(gated))
}

// ---- Spectrum ------------------------------------------------------------------------

// In-place radix-2 FFT; re and im hold FRAME values.
function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1
    for (; j & bit; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) {
      ;[re[i], re[j]] = [re[j], re[i]]
      ;[im[i], im[j]] = [im[j], im[i]]
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len
    const wr = Math.cos(ang)
    const wi = Math.sin(ang)
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0
      for (let k = 0; k < len / 2; k++) {
        const a = i + k
        const b = a + len / 2
        const tr = re[b] * cr - im[b] * ci
        const ti = re[b] * ci + im[b] * cr
        re[b] = re[a] - tr
        im[b] = im[a] - ti
        re[a] += tr
        im[a] += ti
        const nr = cr * wr - ci * wi
        ci = cr * wi + ci * wr
        cr = nr
      }
    }
  }
}

export function spectrum(channels: readonly Float32Array[], rate: number): Spectrum {
  const n = channels[0]?.length ?? 0
  const frames = Math.max(0, Math.floor((n - FRAME) / HOP) + 1)
  const bands = new Float32Array(frames * BAND_COUNT)
  const flux = new Float32Array(frames)
  const window = Float64Array.from({ length: FRAME }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / FRAME))
  const bins = FRAME / 2
  const edges = Array.from({ length: BAND_COUNT + 1 }, (_, i) => Math.round(((BAND_MIN_HZ * Math.pow(BAND_MAX_HZ / BAND_MIN_HZ, i / BAND_COUNT)) / rate) * FRAME))
  const re = new Float64Array(FRAME)
  const im = new Float64Array(FRAME)
  const prev = new Float64Array(bins)
  const scale = 1 / channels.length
  for (let f = 0; f < frames; f++) {
    const start = f * HOP
    for (let i = 0; i < FRAME; i++) {
      let v = 0
      for (const c of channels) v += c[start + i]
      re[i] = v * scale * window[i]
      im[i] = 0
    }
    fft(re, im)
    let rise = 0
    for (let k = 1; k < bins; k++) {
      const p = re[k] * re[k] + im[k] * im[k]
      // Log compression makes the flux follow relative rises, quiet passages included.
      const level = Math.log1p(100 * Math.sqrt(p))
      if (f > 0 && level > prev[k]) rise += level - prev[k]
      prev[k] = level
      re[k] = p
    }
    flux[f] = rise
    for (let b = 0; b < BAND_COUNT; b++) {
      let sum = 0
      const lo = Math.max(1, edges[b])
      const hi = Math.max(lo + 1, edges[b + 1])
      for (let k = lo; k < hi && k < bins; k++) sum += re[k]
      bands[f * BAND_COUNT + b] = sum / (hi - lo)
    }
  }
  return { rate: rate / HOP, frames, bands, flux }
}

// ---- Tempo ---------------------------------------------------------------------------

const TEMPO_STEP = 0.5
// Width of the moving average removed from the onset curve, in seconds: what is left are
// the onsets standing out from their surroundings.
const DETREND_S = 0.4
// Octave preference, as in common beat trackers: a log-normal weight centred here, one
// octave wide. It decides between a tempo and its double when both fit.
const PRIOR_BPM = 120
// How far the best tempo has to stand above the average of the range to count.
const MIN_TEMPO_PEAK = 1.3

// The onset curve with its slow trend removed and only the rises kept.
function onsetCurve(spec: Spectrum): Float32Array {
  const { flux, rate } = spec
  const half = Math.max(1, Math.round((DETREND_S * rate) / 2))
  const out = new Float32Array(flux.length)
  let sum = 0
  let lo = 0
  let hi = 0
  for (let i = 0; i < flux.length; i++) {
    while (hi < Math.min(flux.length, i + half + 1)) sum += flux[hi++]
    while (lo < i - half) sum -= flux[lo++]
    out[i] = Math.max(0, flux[i] - sum / (hi - lo))
  }
  return out
}

// Rough tempo of the whole track from the autocorrelation of its onset curve: each tempo
// in MIN_BPM–MAX_BPM scores its beat period and, at half weight, double and half the period.
// Null when no tempo stands out (no steady pulse).
export function roughTempo(spec: Spectrum): number | null {
  const env = onsetCurve(spec)
  const { rate } = spec
  const n = env.length
  const maxLag = Math.ceil(((rate * 60) / MIN_BPM) * 2) + 1
  if (n < maxLag * 4) return null
  const acf = new Float64Array(maxLag + 1)
  for (let lag = 1; lag <= maxLag; lag++) {
    let sum = 0
    for (let i = 0; i + lag < n; i++) sum += env[i] * env[i + lag]
    acf[lag] = sum / (n - lag)
  }
  const at = (lag: number) => {
    const i = Math.floor(lag)
    return i + 1 > maxLag ? 0 : acf[i] + (acf[i + 1] - acf[i]) * (lag - i)
  }
  const scores: { bpm: number; score: number }[] = []
  for (let bpm = MIN_BPM; bpm <= MAX_BPM; bpm += TEMPO_STEP) {
    const lag = (rate * 60) / bpm
    const prior = Math.exp(-0.5 * Math.log2(bpm / PRIOR_BPM) ** 2)
    scores.push({ bpm, score: (at(lag) + 0.5 * at(lag * 2) + 0.5 * at(lag / 2)) * prior })
  }
  const mean = scores.reduce((a, s) => a + s.score, 0) / scores.length
  const best = scores.reduce((a, s) => (s.score > a.score ? s : a))
  return mean > 0 && best.score >= MIN_TEMPO_PEAK * mean ? best.bpm : null
}

// ---- Beat grid -----------------------------------------------------------------------

export interface Grid {
  bpm: number
  // Seconds from the start to the first beat.
  offset: number
  // How much more onset strength falls on the beats than on average; 1 is none.
  strength: number
}

function sampleAt(curve: Float32Array, x: number): number {
  const i = Math.floor(x)
  if (i < 0 || i >= curve.length - 1) return 0
  const t = x - i
  return curve[i] * (1 - t) + curve[i + 1] * t
}

// Mean onset strength on the beats of a grid (period and offset in frames).
function gridScore(flux: Float32Array, period: number, offset: number): number {
  let sum = 0
  let count = 0
  for (let x = offset; x < flux.length - 1; x += period) {
    // The strongest of the frame on the beat and its neighbours, for frame-level jitter.
    sum += Math.max(sampleAt(flux, x - 1), sampleAt(flux, x), sampleAt(flux, x + 1))
    count++
  }
  return count ? sum / count : 0
}

// The constant tempo and phase that put the most onset strength on the beats, searched near
// `tempo` (a rough estimate): first coarsely, then finely around the best.
export function fitGrid(spec: Spectrum, tempo: number): Grid | null {
  const { flux, rate } = spec
  if (!(tempo > 0) || flux.length < rate * 8) return null
  let mean = 0
  for (const v of flux) mean += v
  mean /= flux.length
  if (mean <= 0) return null
  let best = { bpm: tempo, offset: 0, score: -1 }
  const search = (bpms: number[], phaseStep: number) => {
    for (const bpm of bpms) {
      const period = (rate * 60) / bpm
      for (let o = 0; o < period; o += phaseStep) {
        const score = gridScore(flux, period, o)
        if (score > best.score) best = { bpm, offset: o, score }
      }
    }
  }
  const range = (from: number, to: number, step: number) => Array.from({ length: Math.round((to - from) / step) + 1 }, (_, i) => from + i * step)
  search(range(tempo * 0.98, tempo * 1.02, 0.02), 1)
  const coarse = best
  best = { ...coarse, score: -1 }
  search(range(coarse.bpm - 0.03, coarse.bpm + 0.03, 0.002), 0.25)
  // The frame's centre is where its onset is measured.
  const offset = (best.offset + FRAME / 2 / HOP) / rate
  return { bpm: best.bpm, offset: offset % (60 / best.bpm), strength: best.score / mean }
}

// ---- Sections ------------------------------------------------------------------------

// Spectral summaries every SECTION_HOP_S; a change is the past and the next NOVELTY_SPAN
// summaries differing more than each within itself.
const SECTION_HOP_S = 0.5
const NOVELTY_SPAN = 16
// Mean difference in dB per band, below which a change is not a new section.
const MIN_NOVELTY_DB = 2.5
// How far above the track's typical change a peak has to rise, in standard deviations.
const NOVELTY_SPREAD = 1.5

// Seconds where the music changes section, at least NOVELTY_SPAN hops apart. With a grid,
// each is moved onto the nearest beat.
export function sections(spec: Spectrum, grid: Grid | null): number[] {
  const per = Math.max(1, Math.round(SECTION_HOP_S * spec.rate))
  const hops = Math.floor(spec.frames / per)
  const L = NOVELTY_SPAN
  if (hops < 2 * L + 1) return []
  const feat = new Float32Array(hops * BAND_COUNT)
  for (let h = 0; h < hops; h++) {
    for (let b = 0; b < BAND_COUNT; b++) {
      let sum = 0
      for (let f = h * per; f < (h + 1) * per; f++) sum += spec.bands[f * BAND_COUNT + b]
      feat[h * BAND_COUNT + b] = 10 * Math.log10(sum / per + 1e-10)
    }
  }
  const dist = (i: number, j: number) => {
    let s = 0
    for (let b = 0; b < BAND_COUNT; b++) s += Math.abs(feat[i * BAND_COUNT + b] - feat[j * BAND_COUNT + b])
    return s / BAND_COUNT
  }
  const novelty = new Float64Array(hops)
  for (let t = L; t <= hops - L; t++) {
    let cross = 0
    let within = 0
    for (let i = t - L; i < t; i++) for (let j = t; j < t + L; j++) cross += dist(i, j)
    for (let i = 0; i < L; i++) {
      for (let j = i + 1; j < L; j++) within += dist(t - L + i, t - L + j) + dist(t + i, t + j)
    }
    novelty[t] = cross / (L * L) - within / (L * (L - 1))
  }
  const inner = Array.from(novelty.subarray(L, hops - L + 1))
  const mean = inner.reduce((a, b) => a + b, 0) / inner.length
  const sd = Math.sqrt(inner.reduce((a, b) => a + (b - mean) * (b - mean), 0) / inner.length)
  const threshold = Math.max(MIN_NOVELTY_DB, mean + NOVELTY_SPREAD * sd)
  // Strongest first, each one keeping its neighbourhood clear.
  const peaks = Array.from({ length: hops }, (_, t) => t)
    .filter((t) => novelty[t] > threshold)
    .sort((a, b) => novelty[b] - novelty[a])
  const chosen: number[] = []
  for (const t of peaks) if (chosen.every((c) => Math.abs(c - t) >= L)) chosen.push(t)
  return chosen
    .map((t) => {
      // Hop t starts the new section; frames are measured at their centre.
      const s = (t * per + FRAME / 2 / HOP) / spec.rate
      if (!grid) return s
      const beat = 60 / grid.bpm
      return grid.offset + Math.round((s - grid.offset) / beat) * beat
    })
    .sort((a, b) => a - b)
}
