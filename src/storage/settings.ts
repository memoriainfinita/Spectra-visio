import { get, set } from 'idb-keyval'
import { isLang, type Lang } from '../i18n'

const KEY = 'settings'
export const SETTINGS_VERSION = 1

export interface Settings {
  version: typeof SETTINGS_VERSION
  lang: Lang
  // Copy added files into the app's private storage so the list survives a reload.
  keepFiles: boolean
}

export function defaultSettings(lang: Lang): Settings {
  return { version: SETTINGS_VERSION, lang, keepFiles: false }
}

// Stored data can be missing, from an older version or hand-edited: keep each valid field,
// fall back to the defaults for the rest.
export function normalizeSettings(raw: unknown, defaults: Settings): Settings {
  if (typeof raw !== 'object' || raw === null) return defaults
  const r = raw as Record<string, unknown>
  return {
    version: SETTINGS_VERSION,
    lang: isLang(r.lang) ? r.lang : defaults.lang,
    keepFiles: typeof r.keepFiles === 'boolean' ? r.keepFiles : defaults.keepFiles,
  }
}

export async function loadSettings(defaults: Settings): Promise<Settings> {
  try {
    return normalizeSettings(await get(KEY), defaults)
  } catch {
    // IndexedDB can be unavailable (private mode, blocked storage): run with defaults.
    return defaults
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  try {
    await set(KEY, settings)
  } catch {
    // Not persisted; the app keeps working for this session.
  }
}
