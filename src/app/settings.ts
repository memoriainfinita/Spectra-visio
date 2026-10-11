import { createStore } from '../core/store'
import { detectLang } from '../i18n'
import { defaultSettings, loadSettings, saveSettings, type Settings } from '../storage/settings'

// Reduced motion asked by the system turns on the photosensitive safety until changed.
const reducedMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
export const settingsStore = createStore<Settings>(defaultSettings(detectLang(navigator.languages), reducedMotion))

export function setReduceFlashes(on: boolean): void {
  settingsStore.set((s) => ({ ...s, reduceFlashes: on, flashNotice: true }))
}

// Loads stored settings, then persists every later change.
export async function initSettings(): Promise<void> {
  settingsStore.set(await loadSettings(settingsStore.get()))
  settingsStore.subscribe(() => {
    void saveSettings(settingsStore.get())
  })
}
