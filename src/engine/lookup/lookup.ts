// Lyrics and covers looked up online for a track that has none: synced lyrics from LRCLIB
// (lrclib.net) and covers from the Cover Art Archive, found through MusicBrainz. All three
// are free, need no account and answer with CORS. Only the artist, the title and the
// duration are sent.

const LRCLIB = 'https://lrclib.net/api/get'
const MUSICBRAINZ = 'https://musicbrainz.org/ws/2/recording/'
const COVER_ART = 'https://coverartarchive.org/release-group'

export interface TrackQuery {
  artist: string
  title: string
  // Seconds; 0 when unknown.
  duration: number
}

// Synced lyrics as LRC text, or null when LRCLIB has none for the track.
export async function findLyrics(q: TrackQuery, signal?: AbortSignal): Promise<string | null> {
  const params = new URLSearchParams({ artist_name: q.artist, track_name: q.title })
  if (q.duration > 0) params.set('duration', String(Math.round(q.duration)))
  const res = await fetch(`${LRCLIB}?${params}`, { signal })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`lrclib ${res.status}`)
  return syncedLyrics(await res.json())
}

export function syncedLyrics(raw: unknown): string | null {
  const r = raw as { syncedLyrics?: unknown; instrumental?: unknown }
  return typeof r?.syncedLyrics === 'string' && r.syncedLyrics.trim() ? r.syncedLyrics : null
}

const quote = (s: string) => `"${s.replace(/["\\]/g, ' ')}"`

// Release groups of the recordings that match artist and title, best first.
export async function findReleaseGroups(q: TrackQuery, signal?: AbortSignal): Promise<string[]> {
  const params = new URLSearchParams({ query: `recording:${quote(q.title)} AND artist:${quote(q.artist)}`, fmt: 'json', limit: '5' })
  const res = await fetch(`${MUSICBRAINZ}?${params}`, { signal })
  if (!res.ok) throw new Error(`musicbrainz ${res.status}`)
  return releaseGroups(await res.json())
}

export function releaseGroups(raw: unknown): string[] {
  const recs = (raw as { recordings?: { score?: number; releases?: { 'release-group'?: { id?: string } }[] }[] })?.recordings ?? []
  const out: string[] = []
  for (const r of recs) {
    // MusicBrainz scores matches out of 100; weak ones would bring someone else's cover.
    if ((r.score ?? 0) < 90) continue
    for (const rel of r.releases ?? []) {
      const id = rel['release-group']?.id
      if (id && !out.includes(id)) out.push(id)
    }
  }
  return out
}

// The front cover's address for a release group; it may not exist (the image then fails).
export const coverUrl = (releaseGroup: string) => `${COVER_ART}/${releaseGroup}/front-250`

// Whether an image loads; an <img> needs no CORS to show it.
export function imageLoads(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image()
    img.referrerPolicy = 'no-referrer'
    img.onload = () => resolve(true)
    img.onerror = () => resolve(false)
    img.src = url
  })
}
