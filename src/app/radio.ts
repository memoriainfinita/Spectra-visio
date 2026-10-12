import { get, set } from 'idb-keyval'
import { createStore } from '../core/store'
import { canAnalyse, searchStations, toStation, type Probe, type SearchBy, type Station } from '../engine/radio/radio'
import type { MessageKey } from '../i18n'
import { inputs } from './engine'

// The radio directory in the Stream source: search, favourites, and a check that a station
// can be analysed before it replaces what is playing. Nothing goes to the directory until a
// search is made, and plays are not reported to it. The stations found are then checked in
// the background, so the ones that cannot be analysed are marked before they are tried.

const FAVORITES_KEY = 'radioFavorites'

export interface RadioState {
  results: Station[] | null
  searching: boolean
  // Station being checked before it plays.
  checking: string | null
  message: MessageKey | null
  // Check results by station id, for this visit.
  probes: Record<string, Probe>
}

export const radioStore = createStore<RadioState>({ results: null, searching: false, checking: null, message: null, probes: {} })
export const radioFavoritesStore = createStore<Station[]>([])

let search: AbortController | null = null
let probe: AbortController | null = null
let sweep: AbortController | null = null

// A few at a time: each check opens a connection to the station's server.
const SWEEP_PARALLEL = 4

export async function initRadio(): Promise<void> {
  try {
    const raw: unknown = await get(FAVORITES_KEY)
    if (Array.isArray(raw)) radioFavoritesStore.set(raw.map(fromSaved).filter((s): s is Station => s !== null))
  } catch {
    // IndexedDB unavailable: favourites last for this visit.
  }
  radioFavoritesStore.subscribe(() => {
    set(FAVORITES_KEY, radioFavoritesStore.get()).catch(() => {})
  })
}

// Saved favourites have the station's own shape; read them through the same checks.
function fromSaved(raw: unknown): Station | null {
  if (typeof raw !== 'object' || raw === null) return null
  const r = raw as Partial<Station>
  return toStation({ stationuuid: r.id, name: r.name, url_resolved: r.url, country: r.country, codec: r.codec, bitrate: r.bitrate, tags: r.tags?.join(',') })
}

// Favourites from a backup, after the ones already saved; returns how many were new.
export function mergeRadioFavorites(raw: unknown): number {
  if (!Array.isArray(raw)) return 0
  const have = new Set(radioFavoritesStore.get().map((s) => s.id))
  const added: Station[] = []
  for (const s of raw.map(fromSaved)) {
    if (!s || have.has(s.id)) continue
    have.add(s.id)
    added.push(s)
  }
  if (added.length) radioFavoritesStore.set((list) => [...list, ...added])
  return added.length
}

export async function searchRadio(text: string, by: SearchBy): Promise<void> {
  search?.abort()
  const ctrl = new AbortController()
  search = ctrl
  radioStore.set((s) => ({ ...s, searching: true, message: null }))
  try {
    const results = await searchStations(text.trim(), by, ctrl.signal)
    if (search !== ctrl) return
    radioStore.set((s) => ({ ...s, results, searching: false, message: results.length ? null : 'radio.none' }))
    void checkStations(results)
  } catch {
    if (search !== ctrl) return
    radioStore.set((s) => ({ ...s, results: null, searching: false, message: 'radio.error.search' }))
  }
}

const noteProbe = (id: string, result: Probe) => radioStore.set((s) => ({ ...s, probes: { ...s.probes, [id]: result } }))

// Checks the stations not yet known to work or not; a station that did not answer is tried
// again. A new search stops the check of the previous one.
async function checkStations(list: Station[]): Promise<void> {
  sweep?.abort()
  const ctrl = new AbortController()
  sweep = ctrl
  const known = radioStore.get().probes
  const queue = list.filter((s) => known[s.id] !== 'ok' && known[s.id] !== 'blocked')
  const worker = async () => {
    for (let s = queue.shift(); s && !ctrl.signal.aborted; s = queue.shift()) {
      const result = await canAnalyse(s.url, ctrl.signal)
      if (!ctrl.signal.aborted) noteProbe(s.id, result)
    }
  }
  await Promise.all(Array.from({ length: SWEEP_PARALLEL }, worker))
}

export function toggleRadioFavorite(station: Station): void {
  radioFavoritesStore.set((list) => (list.some((s) => s.id === station.id) ? list.filter((s) => s.id !== station.id) : [...list, station]))
}

// Plays a station as the Stream source, if it lets the analysis hear it.
export async function playStation(station: Station): Promise<void> {
  probe?.abort()
  const ctrl = new AbortController()
  probe = ctrl
  radioStore.set((s) => ({ ...s, checking: station.id, message: null }))
  const result = await canAnalyse(station.url, ctrl.signal)
  if (probe !== ctrl) return
  const message = result === 'ok' ? null : result === 'timeout' ? 'radio.error.timeout' : 'radio.error.cors'
  radioStore.set((s) => ({ ...s, checking: null, message }))
  noteProbe(station.id, result)
  if (result === 'ok') await inputs.useStream(station.url, station.name)
}

// The favourite before or after the one playing; from a station that is not a favourite,
// the first or the last. Nothing without favourites.
export async function stepStation(step: 1 | -1): Promise<void> {
  const list = radioFavoritesStore.get()
  if (!list.length) return
  const i = list.findIndex((s) => s.url === inputs.state.get().streamUrl)
  const next = i < 0 ? (step > 0 ? 0 : list.length - 1) : (i + step + list.length) % list.length
  await playStation(list[next])
}
