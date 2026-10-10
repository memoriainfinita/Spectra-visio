import { get, set } from 'idb-keyval'
import { createStore } from '../core/store'
import { VISUALS, getVisual } from '../engine/render/registry'
import { renderThumbnails, thumbKey } from '../engine/render/thumbnails'

// Favourite visualizations and the browser's thumbnails.

const FAVORITES_KEY = 'favorites'
const THUMBS_KEY = 'thumbnails'

export const favoritesStore = createStore<string[]>([])
// Visualization id → object URL of its thumbnail.
export const thumbsStore = createStore<Record<string, string>>({})

export async function initLibrary(): Promise<void> {
  try {
    const raw: unknown = await get(FAVORITES_KEY)
    if (Array.isArray(raw)) favoritesStore.set(raw.filter((id): id is string => typeof id === 'string' && !!getVisual(id)))
  } catch {
    // IndexedDB unavailable: favourites last for this visit only.
  }
  favoritesStore.subscribe(() => {
    set(FAVORITES_KEY, favoritesStore.get()).catch(() => {})
  })
}

export function toggleFavorite(id: string): void {
  favoritesStore.set((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]))
}

let started = false

// Loads cached thumbnails and draws the missing or outdated ones, once per visit.
export async function loadThumbnails(): Promise<void> {
  if (started) return
  started = true
  let cache: Record<string, Blob> = {}
  try {
    const raw: unknown = await get(THUMBS_KEY)
    if (raw && typeof raw === 'object') cache = raw as Record<string, Blob>
  } catch {
    // Without IndexedDB they are drawn on every visit.
  }
  const fresh: Record<string, Blob> = {}
  const urls: Record<string, string> = {}
  const missing = []
  for (const def of VISUALS) {
    const key = thumbKey(def)
    const blob = cache[key]
    if (blob instanceof Blob) {
      fresh[key] = blob
      urls[def.id] = URL.createObjectURL(blob)
    } else {
      missing.push(def)
    }
  }
  thumbsStore.set(urls)
  if (!missing.length) return
  await renderThumbnails(missing, (id, png) => {
    fresh[thumbKey(getVisual(id)!)] = png
    thumbsStore.set((t) => ({ ...t, [id]: URL.createObjectURL(png) }))
  })
  // Only current keys are written back, so thumbnails of changed visualizations go.
  set(THUMBS_KEY, fresh).catch(() => {})
}
