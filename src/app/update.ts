import { registerSW } from 'virtual:pwa-register'
import { createStore } from '../core/store'

// The service worker: the app works offline, and a new version waits until it is asked to
// reload, so nothing changes in the middle of a show.

export interface UpdateState {
  // A new version is downloaded and waiting.
  ready: boolean
  // Everything is stored: the app works without a connection.
  offline: boolean
}

export const updateStore = createStore<UpdateState>({ ready: false, offline: false })

// A session can last hours: look for a new version every so often.
const CHECK_MS = 60 * 60 * 1000
let update: ((reload?: boolean) => Promise<void>) | null = null

export function initUpdate(): void {
  if (!('serviceWorker' in navigator)) return
  update = registerSW({
    onNeedRefresh: () => updateStore.set((s) => ({ ...s, ready: true })),
    onOfflineReady: () => updateStore.set((s) => ({ ...s, offline: true })),
    onRegisteredSW: (_url, registration) => {
      if (registration) setInterval(() => void registration.update().catch(() => {}), CHECK_MS)
    },
  })
}

// Activates the waiting version and reloads.
export function applyUpdate(): void {
  void update?.(true)
}

export function dismissOffline(): void {
  updateStore.set((s) => ({ ...s, offline: false }))
}
