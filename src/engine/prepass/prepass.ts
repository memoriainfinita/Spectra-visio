import { PREPASS_RATE } from './features'
import type { PrepassReply, PrepassRequest, PrepassResult } from './worker'

// What is known about a file before it plays.
export interface TrackAnalysis {
  duration: number
  // Null when no steady beat was found.
  bpm: number | null
  // Seconds from the start to the first beat of the grid.
  offset: number
  // Seconds where the music changes section.
  sections: number[]
  // Integrated loudness in LUFS; null for silence.
  loudness: number | null
  // Onset strength on the grid against average (see GRID_MIN_STRENGTH); 0 without a tempo.
  strength: number
}

// How much stronger the onsets on the grid have to be than average for the grid to be
// trusted. Below it the tempo is too loose (live playing, tempo changes) and the live
// estimate does better.
export const GRID_MIN_STRENGTH = 1.6

let worker: Worker | null = null
let nextId = 0
const waiting = new Map<number, { resolve: (r: PrepassResult) => void; reject: (e: Error) => void }>()

function prepassWorker(): Worker {
  if (worker) return worker
  worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
  worker.onmessage = (e: MessageEvent<PrepassReply>) => {
    const job = waiting.get(e.data.id)
    if (!job) return
    waiting.delete(e.data.id)
    if ('error' in e.data) job.reject(new Error(e.data.error))
    else job.resolve(e.data.result)
  }
  return worker
}

function measure(request: Omit<PrepassRequest, 'id'>): Promise<PrepassResult> {
  const id = ++nextId
  return new Promise((resolve, reject) => {
    waiting.set(id, { resolve, reject })
    prepassWorker().postMessage({ ...request, id }, request.channels.map((c) => c.buffer))
  })
}

// Decodes the file at a low rate (an offline context resamples to its own rate) and measures
// it in the worker.
export async function analyzeFile(file: File): Promise<TrackAnalysis> {
  const ctx = new OfflineAudioContext(1, 1, PREPASS_RATE)
  const buffer = await ctx.decodeAudioData(await file.arrayBuffer())
  const channels = Array.from({ length: Math.min(2, buffer.numberOfChannels) }, (_, i) => buffer.getChannelData(i).slice())
  const r = await measure({ channels, rate: buffer.sampleRate })
  const grid = r.grid && r.grid.strength >= GRID_MIN_STRENGTH ? r.grid : null
  return {
    duration: buffer.duration,
    bpm: grid?.bpm ?? null,
    offset: grid?.offset ?? 0,
    sections: r.sections,
    loudness: r.loudness,
    strength: r.grid ? Math.round(r.grid.strength * 100) / 100 : 0,
  }
}
