import { get, set } from 'idb-keyval'
import { createStore } from '../core/store'
import type { TrackClock } from '../engine/analysis/analyzer'
import { LONG_TRACK_BYTES, LONG_TRACK_S } from '../engine/player/player'
import { analyzeFile, type TrackAnalysis } from '../engine/prepass/prepass'
import type { Track } from '../engine/player/types'
import { analysis, inputs, player } from './engine'
import { settingsStore } from './settings'

// Every file in the queue is analysed in the background, one at a time, the current track
// first. Results are kept by file (name, size, date), so a file added again is not redone.

const KEY = 'trackAnalysis'
const CACHE_MAX = 1000
// Bumped when the analysis changes, so older results are redone.
const VERSION = 1
// Analysis reference level (the level that maps to 1) for a track of a given loudness: the
// automatic levelling settled 9 to 31 dB below the integrated loudness on six tracks, 16 in
// the middle.
const REFERENCE_VS_LUFS = -16

export type AnalysisStatus = 'queued' | 'running' | 'done' | 'failed' | 'skipped'

export interface TrackAnalysisState {
  status: AnalysisStatus
  result?: TrackAnalysis
}

// Track id → state.
export const trackAnalysisStore = createStore<Record<string, TrackAnalysisState>>({})

interface Cached extends TrackAnalysis {
  version: number
  // Last use, to drop the oldest when the cache is full.
  at: number
}

let cache: Record<string, Cached> = {}
let running = false

const fingerprint = (file: File) => `${file.name}|${file.size}|${file.lastModified}`

export function trackAnalysisOf(id: string | null): TrackAnalysis | null {
  return (id && trackAnalysisStore.get()[id]?.result) || null
}

export async function initTrackAnalysis(): Promise<void> {
  try {
    const raw: unknown = await get(KEY)
    if (raw && typeof raw === 'object') {
      cache = Object.fromEntries(Object.entries(raw as Record<string, Cached>).filter(([, v]) => v && typeof v === 'object' && v.version === VERSION))
    }
  } catch {
    // IndexedDB unavailable: files are analysed again on every visit.
  }
  player.state.subscribe(sync)
  sync()
  analysis.trackSource = trackClock
}

function trackClock(): TrackClock | null {
  const s = player.state.get()
  if (s.status !== 'playing' || !s.currentId || inputs.state.get().kind !== 'player') return null
  const r = trackAnalysisOf(s.currentId)
  if (!r) return null
  return {
    id: s.currentId,
    position: player.position(),
    bpm: r.bpm,
    offset: r.offset,
    sections: r.sections,
    referenceDb: settingsStore.get().analysis.trackLevel && r.loudness !== null ? r.loudness + REFERENCE_VS_LUFS : null,
  }
}

function setState(id: string, state: TrackAnalysisState): void {
  trackAnalysisStore.set((s) => ({ ...s, [id]: state }))
}

function tooLong(track: Track): boolean {
  const duration = track.meta?.duration
  return duration !== undefined ? duration > LONG_TRACK_S : track.size > LONG_TRACK_BYTES
}

// Queues new tracks with a file, drops the states of tracks that left.
function sync(): void {
  const tracks = player.state.get().tracks
  const states = trackAnalysisStore.get()
  const next: Record<string, TrackAnalysisState> = {}
  let changed = false
  for (const t of tracks) {
    const s = states[t.id]
    if (s) next[t.id] = s
    else if (t.file) {
      const hit = cache[fingerprint(t.file)]
      next[t.id] = hit ? { status: 'done', result: hit } : { status: 'queued' }
      changed = true
    }
  }
  if (changed || Object.keys(states).length !== Object.keys(next).length) trackAnalysisStore.set(next)
  void pump()
}

async function pump(): Promise<void> {
  if (running) return
  running = true
  try {
    for (;;) {
      const { tracks, currentId } = player.state.get()
      const states = trackAnalysisStore.get()
      const queued = tracks.filter((t) => states[t.id]?.status === 'queued' && t.file)
      const track = queued.find((t) => t.id === currentId) ?? queued[0]
      if (!track?.file) break
      // Long tracks stream from disk; decoding them whole is what that avoids.
      if (tooLong(track)) {
        setState(track.id, { status: 'skipped' })
        continue
      }
      setState(track.id, { status: 'running' })
      try {
        const result = await analyzeFile(track.file)
        if (!trackAnalysisStore.get()[track.id]) continue
        setState(track.id, { status: 'done', result })
        remember(fingerprint(track.file), result)
      } catch {
        if (trackAnalysisStore.get()[track.id]) setState(track.id, { status: 'failed' })
      }
    }
  } finally {
    running = false
  }
}

function remember(key: string, result: TrackAnalysis): void {
  cache[key] = { ...result, version: VERSION, at: Date.now() }
  const keys = Object.keys(cache)
  if (keys.length > CACHE_MAX) {
    keys.sort((a, b) => cache[a].at - cache[b].at)
    for (const k of keys.slice(0, keys.length - CACHE_MAX)) delete cache[k]
  }
  set(KEY, cache).catch(() => {})
}
