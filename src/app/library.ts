import { get, set } from 'idb-keyval'
import { createStore } from '../core/store'
import { getVisual, visualsStore } from '../engine/render/registry'
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
let running: Promise<void> = Promise.resolve()
// Thumbnails by cache key, read once and kept up to date.
let cache: Record<string, Blob> | null = null
// Object URL shown for each visualization, with the key it was made from.
const shown = new Map<string, { key: string; url: string }>()

// Loads cached thumbnails and draws the missing or outdated ones; again whenever the list
// of visualizations changes (an imported shader).
export function loadThumbnails(): Promise<void> {
  if (!started) {
    started = true
    visualsStore.subscribe(() => {
      running = running.then(refresh)
    })
    running = running.then(refresh)
  }
  return running
}

function show(id: string, key: string, blob: Blob): string {
  const old = shown.get(id)
  if (old?.key === key) return old.url
  if (old) URL.revokeObjectURL(old.url)
  const url = URL.createObjectURL(blob)
  shown.set(id, { key, url })
  return url
}

async function refresh(): Promise<void> {
  if (!cache) {
    try {
      const raw: unknown = await get(THUMBS_KEY)
      cache = raw && typeof raw === 'object' ? (raw as Record<string, Blob>) : {}
    } catch {
      // Without IndexedDB they are drawn on every visit.
      cache = {}
    }
  }
  const defs = visualsStore.get()
  // Only current keys are kept, so thumbnails of changed or deleted visualizations go.
  const keep: Record<string, Blob> = {}
  const urls: Record<string, string> = {}
  const missing = []
  for (const def of defs) {
    const key = thumbKey(def)
    const blob = cache[key]
    if (blob instanceof Blob) {
      keep[key] = blob
      urls[def.id] = show(def.id, key, blob)
    } else {
      missing.push(def)
    }
  }
  for (const [id, s] of shown) {
    if (!urls[id]) {
      URL.revokeObjectURL(s.url)
      shown.delete(id)
    }
  }
  cache = keep
  thumbsStore.set(urls)
  if (missing.length) {
    await renderThumbnails(missing, (id, png) => {
      const def = getVisual(id)
      if (!def) return
      const key = thumbKey(def)
      keep[key] = png
      const url = show(id, key, png)
      thumbsStore.set((t) => ({ ...t, [id]: url }))
    })
  }
  set(THUMBS_KEY, keep).catch(() => {})
}
