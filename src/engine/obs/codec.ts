import { createFrame, type AnalysisFrame, type TempoMode } from '../analysis/analyzer'

// An analysis frame as plain JSON for the OBS source, about 6 KB: bands as 16-bit values,
// the two waves as 16-bit samples, each array in base64.

export interface WireFrame {
  t: number
  n: number
  b: string
  bl: string
  br: string
  nm: string
  bt: number[]
  wl: string
  wr: string
  st: [number, number, number, number]
  bpm: number
  tm: TempoMode
  tc: number
  ph: number
  ref: number
}

const U16 = 65535
const I16 = 32767
const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v)

function toBase64(bytes: Uint8Array): string {
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}

function fromBase64(text: string): Uint8Array {
  const s = atob(text)
  const out = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i)
  return out
}

function packUnit(src: Float32Array, n: number): string {
  const a = new Uint16Array(n)
  for (let i = 0; i < n; i++) a[i] = Math.round(clamp(src[i], 0, 1) * U16)
  return toBase64(new Uint8Array(a.buffer))
}

function unpackUnit(text: string, out: Float32Array): void {
  const bytes = fromBase64(text)
  const a = new Uint16Array(bytes.buffer, 0, Math.min(out.length, bytes.length >> 1))
  out.fill(0)
  for (let i = 0; i < a.length; i++) out[i] = a[i] / U16
}

function packWave(src: Float32Array): string {
  const a = new Int16Array(src.length)
  for (let i = 0; i < src.length; i++) a[i] = Math.round(clamp(src[i], -1, 1) * I16)
  return toBase64(new Uint8Array(a.buffer))
}

function unpackWave(text: string, out: Float32Array): void {
  const bytes = fromBase64(text)
  const a = new Int16Array(bytes.buffer, 0, Math.min(out.length, bytes.length >> 1))
  out.fill(0)
  for (let i = 0; i < a.length; i++) out[i] = a[i] / I16
}

const round = (v: number, places: number) => Math.round(v * 10 ** places) / 10 ** places

export function encodeFrame(f: AnalysisFrame): WireFrame {
  const n = f.bandCount
  return {
    t: round(f.time, 1),
    n,
    b: packUnit(f.bands, n),
    bl: packUnit(f.bandsL, n),
    br: packUnit(f.bandsR, n),
    nm: packUnit(f.named, f.named.length),
    bt: Array.from(f.beats),
    wl: packWave(f.waveL),
    wr: packWave(f.waveR),
    st: [round(f.stereo.rmsL, 4), round(f.stereo.rmsR, 4), round(f.stereo.balance, 4), round(f.stereo.correlation, 4)],
    bpm: round(f.bpm, 3),
    tm: f.tempoMode,
    tc: round(f.tempoConfidence, 3),
    ph: round(f.phase, 4),
    ref: round(f.referenceDb, 2),
  }
}

// Fills `out` (a new frame when missing) from what came over the wire.
export function decodeFrame(w: WireFrame, out: AnalysisFrame = createFrame()): AnalysisFrame {
  out.time = w.t
  out.bandCount = Math.min(w.n, out.bands.length)
  unpackUnit(w.b, out.bands)
  unpackUnit(w.bl, out.bandsL)
  unpackUnit(w.br, out.bandsR)
  unpackUnit(w.nm, out.named)
  for (let i = 0; i < out.beats.length; i++) out.beats[i] = w.bt[i] ?? 0
  unpackWave(w.wl, out.waveL)
  unpackWave(w.wr, out.waveR)
  ;[out.stereo.rmsL, out.stereo.rmsR, out.stereo.balance, out.stereo.correlation] = w.st
  out.bpm = w.bpm
  out.tempoMode = w.tm
  out.tempoConfidence = w.tc
  out.phase = w.ph
  out.referenceDb = w.ref
  return out
}
