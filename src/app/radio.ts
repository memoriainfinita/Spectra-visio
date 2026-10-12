import { get, set } from 'idb-keyval'
import { createStore } from '../core/store'
import { canAnalyse, searchStations, toStation, type SearchBy, type Station } from '../engine/radio/radio'
import type { MessageKey } from '../i18n'
import { inputs } from './engine'

// The radio directory in the Stream source: search, favourites, and a check that a station
// can be analysed before it replaces what is playing. Nothing goes to the directory until a
// search is made, and plays are not reported to it.

const FAVORITES_KEY = 'radioFavorites'

export interface RadioState {
  results: Station[] | null
  searching: boolean
  // Station being checked before it plays.
  checking: string | null
  message: MessageKey | null
}

export const radioStore = createStore<RadioState>({ results: null, searching: false, checking: null, message: null })
export const radioFavoritesStore = createStore<Station[]>([])

let search: AbortController | null = null
let probe: AbortController | null = null

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

export async function searchRadio(text: string, by: SearchBy): Promise<void> {
  search?.abort()
  const ctrl = new AbortController()
  search = ctrl
  radioStore.set((s) => ({ ...s, searching: true, message: null }))
  try {
    const results = await searchStations(text.trim(), by, ctrl.signal)
    if (search !== ctrl) return
    radioStore.set((s) => ({ ...s, results, searching: false, message: results.length ? null : 'radio.none' }))
  } catch {
    if (search !== ctrl) return
    radioStore.set((s) => ({ ...s, results: null, searching: false, message: 'radio.error.search' }))
  }
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
