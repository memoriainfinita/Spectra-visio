import { clear } from 'idb-keyval'
import { detectLang } from '../i18n'
import { normalizePresets } from '../engine/scene/preset'
import { defaultSettings, normalizeSettings } from '../storage/settings'
import { presetsStore } from './presets'
import { mergeRadioFavorites, radioFavoritesStore } from './radio'
import { reducedMotion, settingsStore } from './settings'
import { normalizeShaders, shadersStore } from './shaders'
import { mergeTvFavorites, tvFavoritesStore } from './tv'

// A backup file carries the settings, the shortcuts with them, the presets, the imported
// shaders and the favourite stations and channels, to move them to another browser or computer. The
// OBS password stays out of it, and so do the files of the list.

const BACKUP_APP = 'spectra-visio'
const BACKUP_KIND = 'backup'
const BACKUP_VERSION = 1
const WIPE_KEY = 'spectra.wipe'

export function downloadBackup(): void {
  const s = settingsStore.get()
  const data = {
    app: BACKUP_APP,
    kind: BACKUP_KIND,
    version: BACKUP_VERSION,
    saved: new Date().toISOString(),
    settings: { ...s, obs: { ...s.obs, password: '' } },
    presets: presetsStore.get(),
    shaders: shadersStore.get(),
    radioFavorites: radioFavoritesStore.get(),
    tvFavorites: tvFavoritesStore.get(),
  }
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `spectravisio-backup-${data.saved.slice(0, 10)}.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export interface RestoreResult {
  // The file is not a backup at all.
  invalid: boolean
  presets: number
  shaders: number
  favorites: number
  channels: number
}

// The settings are replaced; presets, shaders and favourites of both kinds are added to the ones here,
// skipping those already present. What belongs to this browser stays: the OBS password,
// whether files are kept, and the answered photosensitivity notice.
export async function restoreBackup(file: File): Promise<RestoreResult> {
  const none = { invalid: true, presets: 0, shaders: 0, favorites: 0, channels: 0 }
  let raw: Record<string, unknown>
  try {
    const parsed: unknown = JSON.parse(await file.text())
    if (typeof parsed !== 'object' || parsed === null) return none
    raw = parsed as Record<string, unknown>
  } catch {
    return none
  }
  if (raw.app !== BACKUP_APP || raw.kind !== BACKUP_KIND) return none

  const here = settingsStore.get()
  const restored = normalizeSettings(raw.settings, here)
  settingsStore.set({ ...restored, obs: { ...restored.obs, password: here.obs.password }, keepFiles: here.keepFiles, flashNotice: here.flashNotice })

  // Shaders first: presets may point at them.
  const shaderIds = new Set(shadersStore.get().map((s) => s.id))
  const shaders = normalizeShaders(raw.shaders).filter((s) => !shaderIds.has(s.id))
  if (shaders.length) shadersStore.set((list) => [...list, ...shaders])

  const presetIds = new Set(presetsStore.get().map((p) => p.id))
  const presets = normalizePresets(raw.presets).filter((p) => !presetIds.has(p.id))
  if (presets.length) presetsStore.set((list) => [...list, ...presets])

  return { invalid: false, presets: presets.length, shaders: shaders.length, favorites: mergeRadioFavorites(raw.radioFavorites), channels: mergeTvFavorites(raw.tvFavorites) }
}

// Factory settings. Kept files and the answered notice stay as they are.
export function resetSettings(): void {
  settingsStore.set((s) => ({ ...defaultSettings(detectLang(navigator.languages), reducedMotion), keepFiles: s.keepFiles, flashNotice: s.flashNotice }))
}

// Everything the app stored in this browser goes. The wipe runs on the next start, before
// anything is loaded, so nothing still running can write its data back.
export function eraseAllData(): void {
  try {
    localStorage.setItem(WIPE_KEY, '1')
  } catch {
    // No localStorage: wipe now and hope nothing writes back before the reload.
    void wipe().then(() => location.reload())
    return
  }
  location.reload()
}

export async function wipeIfAsked(): Promise<void> {
  try {
    if (localStorage.getItem(WIPE_KEY) !== '1') return
  } catch {
    return
  }
  await wipe()
}

async function wipe(): Promise<void> {
  try {
    await clear()
  } catch {
    // IndexedDB unavailable: nothing stored there.
  }
  try {
    const root = await navigator.storage.getDirectory()
    for await (const name of root.keys()) await root.removeEntry(name, { recursive: true })
  } catch {
    // No app storage, or nothing in it.
  }
  try {
    for (const key of Object.keys(localStorage)) if (key.startsWith('spectra.')) localStorage.removeItem(key)
  } catch {
    // Nothing to remove.
  }
}
