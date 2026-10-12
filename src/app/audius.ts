import { createStore } from '../core/store'
import { downloadTrack, searchTracks, trendingTracks, type AudiusTrack } from '../engine/audius/audius'
import type { MessageKey } from '../i18n'
import { player } from './engine'

// Music from Audius in the player's list: search or trending, then a track is downloaded and
// added like a file, with its title, artist and cover where the file has no tags. Nothing
// goes to Audius until a search is made.

export interface AudiusState {
  results: AudiusTrack[] | null
  searching: boolean
  message: MessageKey | null
  // Download progress by track id, 0 to 1, while it lasts; -1 when it failed.
  downloads: Record<string, number>
}

export const audiusStore = createStore<AudiusState>({ results: null, searching: false, message: null, downloads: {} })

let search: AbortController | null = null

async function run(load: (signal: AbortSignal) => Promise<AudiusTrack[]>): Promise<void> {
  search?.abort()
  const ctrl = new AbortController()
  search = ctrl
  audiusStore.set((s) => ({ ...s, searching: true, message: null }))
  try {
    const results = await load(ctrl.signal)
    if (search !== ctrl) return
    audiusStore.set((s) => ({ ...s, results, searching: false, message: results.length ? null : 'audius.none' }))
  } catch {
    if (search !== ctrl) return
    audiusStore.set((s) => ({ ...s, results: null, searching: false, message: 'audius.error.search' }))
  }
}

export const searchAudius = (text: string) => run((signal) => searchTracks(text.trim(), signal))
export const trendingAudius = () => run(trendingTracks)

const setDownload = (id: string, p: number | null) =>
  audiusStore.set((s) => {
    const downloads = { ...s.downloads }
    if (p === null) delete downloads[id]
    else downloads[id] = p
    return { ...s, downloads }
  })

// The cover as an object URL the player will own, or nothing.
async function cover(url: string): Promise<string | undefined> {
  if (!url) return undefined
  try {
    const res = await fetch(url)
    return res.ok ? URL.createObjectURL(await res.blob()) : undefined
  } catch {
    return undefined
  }
}

// Downloads a track into the list; `play` starts it once it is there.
export async function addAudiusTrack(track: AudiusTrack, play: boolean): Promise<void> {
  if (track.id in audiusStore.get().downloads && audiusStore.get().downloads[track.id] >= 0) return
  setDownload(track.id, 0)
  try {
    const [file, art] = await Promise.all([downloadTrack(track, (p) => setDownload(track.id, p)), cover(track.artwork)])
    const [id] = player.add([file], [{ title: track.title, artist: track.artist, duration: track.duration || undefined, cover: art }])
    setDownload(track.id, null)
    if (play && id) void player.play(id)
  } catch {
    setDownload(track.id, -1)
  }
}
