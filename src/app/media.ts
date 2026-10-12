import { createStore } from '../core/store'
import { resolveMedia, searchMedia, typeAvailable, type MediaItem, type MediaSource, type MediaType } from '../engine/media/media'
import type { MessageKey } from '../i18n'
import { openVisualUrl } from './visualInput'

// Free videos and images from Wikimedia Commons and NASA as the visual input. Nothing goes
// to either until a search is made; the thumbnails come from their servers after it.

export interface MediaState {
  source: MediaSource
  type: MediaType
  results: MediaItem[] | null
  searching: boolean
  // Item being opened.
  opening: string | null
  message: MessageKey | null
}

export const mediaStore = createStore<MediaState>({ source: 'commons', type: 'video', results: null, searching: false, opening: null, message: null })

let search: AbortController | null = null
let opening: AbortController | null = null

export function setMediaKind(value: Partial<Pick<MediaState, 'source' | 'type'>>): void {
  mediaStore.set((s) => {
    const next = { ...s, ...value, results: null, message: null }
    return typeAvailable(next.source, next.type) ? next : { ...next, type: 'video' }
  })
}

export async function searchMediaFor(text: string): Promise<void> {
  search?.abort()
  const ctrl = new AbortController()
  search = ctrl
  const { source, type } = mediaStore.get()
  mediaStore.set((s) => ({ ...s, searching: true, message: null }))
  try {
    const results = await searchMedia(source, type, text.trim(), ctrl.signal)
    if (search !== ctrl) return
    mediaStore.set((s) => ({ ...s, results, searching: false, message: results.length ? null : 'media.none' }))
  } catch {
    if (search !== ctrl) return
    mediaStore.set((s) => ({ ...s, results: null, searching: false, message: 'media.error.search' }))
  }
}

export async function openMedia(item: MediaItem): Promise<void> {
  opening?.abort()
  const ctrl = new AbortController()
  opening = ctrl
  mediaStore.set((s) => ({ ...s, opening: `${item.source}:${item.id}`, message: null }))
  try {
    const url = await resolveMedia(item, ctrl.signal)
    if (opening !== ctrl) return
    await openVisualUrl(url, item.type, item.title, item.page)
  } catch {
    if (opening !== ctrl) return
    mediaStore.set((s) => ({ ...s, message: 'media.error.open' }))
  } finally {
    if (opening === ctrl) mediaStore.set((s) => ({ ...s, opening: null }))
  }
}
