import { get, set } from 'idb-keyval'
import { createStore } from '../core/store'
import { LRC_MAX, parseLrc, type LrcLine } from '../engine/overlay/lrc'
import { matchLyrics } from '../engine/player/files'
import type { Track } from '../engine/player/types'

// Lyrics the user loaded per track (picked along with the audio or chosen later). They
// take precedence over lyrics in the tags, and those over lyrics found online.

const KEY = 'lyrics'
const ONLINE_KEY = 'lyricsOnline'

// Track id → LRC text.
export const lyricsStore = createStore<Record<string, string>>({})
// Track id → LRC text found on LRCLIB.
export const onlineLyricsStore = createStore<Record<string, string>>({})

const parsed = new Map<string, { text: string; lines: LrcLine[] }>()

function linesOf(id: string, text: string): LrcLine[] {
  const hit = parsed.get(id)
  if (hit?.text === text) return hit.lines
  const lines = parseLrc(text)
  parsed.set(id, { text, lines })
  return lines
}

export type LyricsSource = 'file' | 'tags' | 'online' | null

export function lyricsSource(track: Track | undefined): LyricsSource {
  if (!track) return null
  if (lyricsStore.get()[track.id]) return 'file'
  if (track.meta?.lyrics) return 'tags'
  return onlineLyricsStore.get()[track.id] ? 'online' : null
}

export function lyricsOf(track: Track | undefined): readonly LrcLine[] | null {
  if (!track) return null
  const text = lyricsStore.get()[track.id] ?? track.meta?.lyrics ?? onlineLyricsStore.get()[track.id]
  return text ? linesOf(track.id, text) : null
}

const strings = (raw: unknown) => (raw && typeof raw === 'object' ? (Object.fromEntries(Object.entries(raw).filter(([, v]) => typeof v === 'string')) as Record<string, string>) : {})

export async function initLyrics(): Promise<void> {
  try {
    lyricsStore.set(strings(await get(KEY)))
    onlineLyricsStore.set(strings(await get(ONLINE_KEY)))
  } catch {
    // IndexedDB unavailable: lyrics last for this visit only.
  }
  lyricsStore.subscribe(() => {
    set(KEY, lyricsStore.get()).catch(() => {})
  })
  onlineLyricsStore.subscribe(() => {
    set(ONLINE_KEY, onlineLyricsStore.get()).catch(() => {})
  })
}

// Lyrics of tracks that left the queue go with them.
export function keepLyricsOf(ids: Set<string>): void {
  for (const store of [lyricsStore, onlineLyricsStore]) {
    const lyrics = store.get()
    if (Object.keys(lyrics).some((id) => !ids.has(id))) store.set(Object.fromEntries(Object.entries(lyrics).filter(([id]) => ids.has(id))))
  }
}

// Lyrics files picked with the audio, matched to the new tracks by name.
export async function attachLyrics(ids: string[], files: File[], lyrics: File[]): Promise<void> {
  if (!lyrics.length) return
  const found: Record<string, string> = {}
  for (const [i, j] of matchLyrics(files, lyrics)) {
    const file = lyrics[j]
    if (file.size > LRC_MAX) continue
    const text = await file.text()
    if (parseLrc(text).length) found[ids[i]] = text
  }
  if (Object.keys(found).length) lyricsStore.set((l) => ({ ...l, ...found }))
}

// False when the file has no timed lines.
export async function loadLyrics(trackId: string, file: File): Promise<boolean> {
  if (file.size > LRC_MAX) return false
  const text = await file.text()
  if (!parseLrc(text).length) return false
  lyricsStore.set((l) => ({ ...l, [trackId]: text }))
  return true
}

export function removeLyrics(trackId: string): void {
  lyricsStore.set((l) => {
    const next = { ...l }
    delete next[trackId]
    return next
  })
}
