import { get, set } from 'idb-keyval'
import { coverUrl, findLyrics, findReleaseGroups, imageLoads, type TrackQuery } from '../engine/lookup/lookup'
import type { Track } from '../engine/player/types'
import { player } from './engine'
import { lyricsSource, onlineLyricsStore } from './lyrics'
import { settingsStore } from './settings'

// What the playing track lacks, looked up online when the user turned it on in Settings:
// synced lyrics from LRCLIB, a cover through MusicBrainz. Only the playing track, once per
// visit; covers found (or not) are remembered by artist and title.

const COVERS_KEY = 'coversOnline'
// Release groups tried for a cover; the first ones are the best matches.
const COVER_TRIES = 3

// "artist|title" → cover address, or '' when none was found.
let covers: Record<string, string> = {}
const triedLyrics = new Set<string>()
const triedCovers = new Set<string>()

// Artist and title from the tags, or from a "Artist - Title" file name.
export function queryOf(track: Track): TrackQuery | null {
  let artist = track.meta?.artist?.trim() ?? ''
  let title = track.meta?.title?.trim() ?? ''
  if (!artist || !title) {
    const m = /^(.+?)\s+-\s+(.+)$/.exec(track.name)
    if (!m) return null
    artist ||= m[1].trim()
    title ||= m[2].trim()
  }
  return { artist, title, duration: track.meta?.duration ?? 0 }
}

async function lyricsFor(track: Track, q: TrackQuery): Promise<void> {
  triedLyrics.add(track.id)
  try {
    const text = await findLyrics(q)
    if (text) onlineLyricsStore.set((l) => ({ ...l, [track.id]: text }))
  } catch {
    // Not reachable, or no answer for this track: tried again next visit, not now.
  }
}

async function coverFor(track: Track, q: TrackQuery): Promise<void> {
  triedCovers.add(track.id)
  const key = `${q.artist.toLowerCase()}|${q.title.toLowerCase()}`
  let url = covers[key]
  if (url === undefined) {
    try {
      url = ''
      for (const id of (await findReleaseGroups(q)).slice(0, COVER_TRIES)) {
        if (await imageLoads(coverUrl(id))) {
          url = coverUrl(id)
          break
        }
      }
      covers = { ...covers, [key]: url }
      set(COVERS_KEY, covers).catch(() => {})
    } catch {
      // Tried again next visit, not now.
      return
    }
  }
  if (url) player.setCover(track.id, url)
}

function check(): void {
  const { lyrics, covers: wantCovers } = settingsStore.get().online
  if (!lyrics && !wantCovers) return
  const s = player.state.get()
  const track = s.tracks.find((t) => t.id === s.currentId)
  // Wait for the tags: they may have it all.
  if (!track?.meta) return
  const q = queryOf(track)
  if (!q) return
  if (lyrics && !triedLyrics.has(track.id) && !lyricsSource(track)) void lyricsFor(track, q)
  if (wantCovers && !triedCovers.has(track.id) && !track.meta.cover) void coverFor(track, q)
}

export async function initLookup(): Promise<void> {
  try {
    const raw: unknown = await get(COVERS_KEY)
    if (raw && typeof raw === 'object') covers = Object.fromEntries(Object.entries(raw).filter(([, v]) => typeof v === 'string')) as Record<string, string>
  } catch {
    // IndexedDB unavailable: looked up again next visit.
  }
  player.state.subscribe(check)
  settingsStore.subscribe(check)
  check()
}
