import { get, set } from 'idb-keyval'
import { createStore } from '../core/store'
import { canAnalyse, type Probe } from '../engine/radio/radio'
import { ALL_URL, PLAYLISTS_URL, fetchText, parseGroups, parsePlaylist, type Channel, type TvGroup } from '../engine/tv/tv'
import type { MessageKey } from '../i18n'
import { startTv } from './visualInput'

// Live TV in the visual input: iptv-org's groups, one playlist at a time, favourites, and
// the same checks as the radio: a channel has to send CORS for WebGL to read its frames.
// Nothing goes out until the TV browser is opened; then the channels on screen are checked
// in the background, a page at a time.

const FAVORITES_KEY = 'tvFavorites'
// A few at a time: each check opens a connection to the channel's server.
const SWEEP_PARALLEL = 4

export interface TvState {
  groups: TvGroup[] | null
  // The group shown; 'all' for every channel.
  group: string
  channels: Channel[] | null
  loading: boolean
  // Channel being checked before it plays.
  checking: string | null
  message: MessageKey | null
  // Check results by stream address, for this visit.
  probes: Record<string, Probe>
}

export const tvStore = createStore<TvState>({ groups: null, group: '', channels: null, loading: false, checking: null, message: null, probes: {} })
export const tvFavoritesStore = createStore<Channel[]>([])

let groupsLoad: Promise<void> | null = null
let listLoad: AbortController | null = null
let probe: AbortController | null = null
let sweep: AbortController | null = null

export async function initTv(): Promise<void> {
  try {
    const raw: unknown = await get(FAVORITES_KEY)
    if (Array.isArray(raw)) tvFavoritesStore.set(raw.filter(isChannel))
  } catch {
    // IndexedDB unavailable: favourites last for this visit.
  }
  tvFavoritesStore.subscribe(() => {
    set(FAVORITES_KEY, tvFavoritesStore.get()).catch(() => {})
  })
}

function isChannel(raw: unknown): raw is Channel {
  if (typeof raw !== 'object' || raw === null) return false
  const r = raw as Partial<Channel>
  return typeof r.url === 'string' && r.url.startsWith('https://') && typeof r.name === 'string' && r.id === r.url && Array.isArray(r.labels) && Array.isArray(r.categories) && typeof r.quality === 'string'
}

// The list of groups, once per visit, when the TV browser is first opened.
export function loadTvGroups(): Promise<void> {
  groupsLoad ??= fetchText(PLAYLISTS_URL)
    .then((md) => tvStore.set((s) => ({ ...s, groups: parseGroups(md) })))
    .catch(() => {
      groupsLoad = null
      tvStore.set((s) => ({ ...s, message: 'tv.error.groups' }))
    })
  return groupsLoad
}

// Downloads one group's playlist ('all' for every channel).
export async function openTvGroup(key: string): Promise<void> {
  listLoad?.abort()
  sweep?.abort()
  const ctrl = new AbortController()
  listLoad = ctrl
  const group = tvStore.get().groups?.find((g) => `${g.by}:${g.id}` === key)
  const url = key === 'all' ? ALL_URL : group?.url
  if (!url) return
  tvStore.set((s) => ({ ...s, group: key, channels: null, loading: true, message: null }))
  try {
    const channels = parsePlaylist(await fetchText(url, ctrl.signal))
    if (listLoad !== ctrl) return
    tvStore.set((s) => ({ ...s, channels, loading: false, message: channels.length ? null : 'tv.none' }))
  } catch {
    if (listLoad !== ctrl) return
    tvStore.set((s) => ({ ...s, loading: false, message: 'tv.error.list' }))
  }
}

const noteProbe = (id: string, result: Probe) => tvStore.set((s) => ({ ...s, probes: { ...s.probes, [id]: result } }))

// Checks the channels on screen not yet known to work or not; one that did not answer is
// tried again. A new call stops the previous check.
export async function checkChannels(list: Channel[]): Promise<void> {
  sweep?.abort()
  const ctrl = new AbortController()
  sweep = ctrl
  const known = tvStore.get().probes
  const queue = list.filter((c) => known[c.id] !== 'ok' && known[c.id] !== 'blocked')
  const worker = async () => {
    for (let c = queue.shift(); c && !ctrl.signal.aborted; c = queue.shift()) {
      const result = await canAnalyse(c.url, ctrl.signal)
      if (!ctrl.signal.aborted) noteProbe(c.id, result)
    }
  }
  await Promise.all(Array.from({ length: SWEEP_PARALLEL }, worker))
}

// Favourites from a backup, after the ones already saved; returns how many were new.
export function mergeTvFavorites(raw: unknown): number {
  if (!Array.isArray(raw)) return 0
  const have = new Set(tvFavoritesStore.get().map((c) => c.id))
  const added: Channel[] = []
  for (const c of raw) {
    if (!isChannel(c) || have.has(c.id)) continue
    have.add(c.id)
    added.push(c)
  }
  if (added.length) tvFavoritesStore.set((list) => [...list, ...added])
  return added.length
}

export function toggleTvFavorite(channel: Channel): void {
  tvFavoritesStore.set((list) => (list.some((c) => c.id === channel.id) ? list.filter((c) => c.id !== channel.id) : [...list, channel]))
}

// Shows a channel as the visual input, if WebGL may read it.
export async function playChannel(channel: Channel): Promise<void> {
  probe?.abort()
  const ctrl = new AbortController()
  probe = ctrl
  tvStore.set((s) => ({ ...s, checking: channel.id, message: null }))
  const result = await canAnalyse(channel.url, ctrl.signal)
  if (probe !== ctrl) return
  tvStore.set((s) => ({ ...s, checking: null, message: result === 'ok' ? null : result === 'timeout' ? 'tv.error.timeout' : 'tv.error.blocked' }))
  noteProbe(channel.id, result)
  if (result === 'ok') await startTv(channel.url, channel.name)
}
