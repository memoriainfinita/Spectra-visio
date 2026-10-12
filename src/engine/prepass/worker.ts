import { fitGrid, loudness, peak, roughTempo, sections, spectrum, type Grid } from './features'

export interface PrepassRequest {
  id: number
  channels: Float32Array[]
  rate: number
}

export interface PrepassResult {
  loudness: number | null
  // Sample peak in dBFS; null for silence.
  peak: number | null
  grid: Grid | null
  sections: number[]
}

export type PrepassReply = { id: number; result: PrepassResult } | { id: number; error: string }

// The project's types are the DOM's; inside the worker only these two are used.
const scope = self as unknown as { onmessage: ((e: MessageEvent<PrepassRequest>) => void) | null; postMessage(reply: PrepassReply): void }

scope.onmessage = (e) => {
  const { id, channels, rate } = e.data
  try {
    const level = loudness(channels, rate)
    const spec = spectrum(channels, rate)
    const tempo = roughTempo(spec)
    const grid = tempo ? fitGrid(spec, tempo) : null
    const top = peak(channels)
    const result: PrepassResult = { loudness: Number.isFinite(level) ? level : null, peak: Number.isFinite(top) ? top : null, grid, sections: sections(spec, grid) }
    scope.postMessage({ id, result })
  } catch (err) {
    scope.postMessage({ id, error: String(err) })
  }
}
