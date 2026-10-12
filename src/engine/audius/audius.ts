// Music from Audius (audius.co): an open catalogue of independent artists with a public API,
// no account and CORS on the API, the audio and the artwork. Tracks are downloaded whole and
// join the list like files. The API asks every client to name itself.

export const APP_NAME = 'SpectraVisio'
const API = 'https://api.audius.co/v1'
export const SEARCH_LIMIT = 40

export interface AudiusTrack {
  id: string
  title: string
  artist: string
  // Seconds.
  duration: number
  genre: string
  artwork: string
  plays: number
}

// A track as the API gives it, or null when it cannot be streamed freely.
export function toTrack(raw: unknown): AudiusTrack | null {
  if (typeof raw !== 'object' || raw === null) return null
  const r = raw as Record<string, unknown>
  if (typeof r.id !== 'string' || typeof r.title !== 'string' || r.is_streamable === false || r.is_stream_gated === true || r.is_delete === true) return null
  const user = (r.user ?? {}) as Record<string, unknown>
  const art = (r.artwork ?? {}) as Record<string, unknown>
  return {
    id: r.id,
    title: r.title.trim() || r.id,
    artist: typeof user.name === 'string' ? user.name.trim() : '',
    duration: typeof r.duration === 'number' ? r.duration : 0,
    genre: typeof r.genre === 'string' ? r.genre : '',
    artwork: typeof art['480x480'] === 'string' ? art['480x480'] : '',
    plays: typeof r.play_count === 'number' ? r.play_count : 0,
  }
}

async function list(path: string, params: Record<string, string>, signal?: AbortSignal): Promise<AudiusTrack[]> {
  const q = new URLSearchParams({ ...params, app_name: APP_NAME })
  const res = await fetch(`${API}${path}?${q}`, { signal })
  if (!res.ok) throw new Error(`audius ${res.status}`)
  const body = (await res.json()) as { data?: unknown }
  return Array.isArray(body.data) ? body.data.map(toTrack).filter((t): t is AudiusTrack => t !== null) : []
}

export const searchTracks = (text: string, signal?: AbortSignal) => list('/tracks/search', { query: text, limit: String(SEARCH_LIMIT) }, signal)

export const trendingTracks = (signal?: AbortSignal) => list('/tracks/trending', { limit: String(SEARCH_LIMIT) }, signal)

export const streamUrl = (id: string) => `${API}/tracks/${encodeURIComponent(id)}/stream?app_name=${APP_NAME}`

// The whole track as a file named "Artist - Title", reporting progress from 0 to 1.
export async function downloadTrack(track: AudiusTrack, onProgress: (p: number) => void, signal?: AbortSignal): Promise<File> {
  const res = await fetch(streamUrl(track.id), { signal })
  if (!res.ok || !res.body) throw new Error(`audius ${res.status}`)
  const total = Number(res.headers.get('content-length')) || 0
  const reader = res.body.getReader()
  const parts: Uint8Array[] = []
  let got = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    parts.push(value)
    got += value.byteLength
    if (total) onProgress(Math.min(1, got / total))
  }
  const type = res.headers.get('content-type')?.split(';')[0] || 'audio/mpeg'
  const ext = type.includes('mp4') || type.includes('aac') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'mp3'
  const name = `${track.artist ? `${track.artist} - ` : ''}${track.title}`.replace(/[\\/:*?"<>|]+/g, ' ')
  return new File(parts as BlobPart[], `${name}.${ext}`, { type })
}
