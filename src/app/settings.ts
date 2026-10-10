import { createStore } from '../core/store'
import { detectLang } from '../i18n'
import { defaultSettings, loadSettings, saveSettings, type Settings } from '../storage/settings'

export const settingsStore = createStore<Settings>(defaultSettings(detectLang(navigator.languages)))

// Loads stored settings, then persists every later change.
export async function initSettings(): Promise<void> {
  settingsStore.set(await loadSettings(settingsStore.get()))
  settingsStore.subscribe(() => {
    void saveSettings(settingsStore.get())
  })
}
