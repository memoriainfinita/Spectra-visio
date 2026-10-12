import type { Repeat } from '../engine/player/queue'

export const SESSION_VERSION = 1

export interface PlayerPrefs {
  volume: number
  muted: boolean
  shuffle: boolean
  repeat: Repeat
  crossfade: number
  normalize: boolean
}

// A list entry that can be brought back: a copy in the app's storage, or (Chrome) a
// reference to the original file that needs the user's permission again.
export interface SavedTrack {
  id: string
  name: string
  fileName: string
  type: string
  size: number
  source: 'opfs' | 'handle'
  handle?: FileSystemFileHandle
}

export interface Session {
  version: typeof SESSION_VERSION
  prefs: PlayerPrefs
  tracks: SavedTrack[]
  currentId: string | null
  position: number
}

export const DEFAULT_PREFS: PlayerPrefs = { volume: 0.8, muted: false, shuffle: false, repeat: 'off', crossfade: 0, normalize: true }

const REPEATS: readonly Repeat[] = ['off', 'all', 'one']

function num(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback
}

function normalizePrefs(raw: unknown): PlayerPrefs {
  const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>
  return {
    volume: num(r.volume, 0, 1, DEFAULT_PREFS.volume),
    muted: typeof r.muted === 'boolean' ? r.muted : DEFAULT_PREFS.muted,
    shuffle: typeof r.shuffle === 'boolean' ? r.shuffle : DEFAULT_PREFS.shuffle,
    repeat: REPEATS.includes(r.repeat as Repeat) ? (r.repeat as Repeat) : DEFAULT_PREFS.repeat,
    crossfade: num(r.crossfade, 0, 12, DEFAULT_PREFS.crossfade),
    normalize: typeof r.normalize === 'boolean' ? r.normalize : DEFAULT_PREFS.normalize,
  }
}

function normalizeTrack(raw: unknown): SavedTrack | null {
  if (typeof raw !== 'object' || raw === null) return null
  const r = raw as Record<string, unknown>
  if (typeof r.id !== 'string' || typeof r.name !== 'string') return null
  const source = r.source === 'opfs' || r.source === 'handle' ? r.source : null
  if (!source) return null
  const handle = r.handle as { kind?: unknown } | undefined
  if (source === 'handle' && (typeof handle !== 'object' || handle === null || handle.kind !== 'file')) return null
  return {
    id: r.id,
    name: r.name,
    fileName: typeof r.fileName === 'string' ? r.fileName : r.name,
    type: typeof r.type === 'string' ? r.type : '',
    size: num(r.size, 0, Number.MAX_SAFE_INTEGER, 0),
    source,
    handle: source === 'handle' ? (r.handle as FileSystemFileHandle) : undefined,
  }
}

// Stored data can be missing, partial or from another version: keep what is valid.
export function normalizeSession(raw: unknown): Session {
  const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>
  const tracks = Array.isArray(r.tracks) ? r.tracks.map(normalizeTrack).filter((t): t is SavedTrack => t !== null) : []
  const currentId = typeof r.currentId === 'string' && tracks.some((t) => t.id === r.currentId) ? r.currentId : null
  return {
    version: SESSION_VERSION,
    prefs: normalizePrefs(r.prefs),
    tracks,
    currentId,
    position: currentId ? num(r.position, 0, Number.MAX_SAFE_INTEGER, 0) : 0,
  }
}
