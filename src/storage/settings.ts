import { get, set } from 'idb-keyval'
import { isLang, type Lang } from '../i18n'

const KEY = 'settings'
export const SETTINGS_VERSION = 1

export const BAND_CHOICES = [8, 16, 24, 32, 48, 64] as const
export const LATENCY_OFFSET_MIN = -200
export const LATENCY_OFFSET_MAX = 500

export interface AnalysisSettings {
  // Number of log bands.
  bands: number
  // 0–1: 0 raw, 1 slowest.
  smoothing: number
  autoLevel: boolean
  // Delay the visuals by the output latency the browser reports.
  autoLatency: boolean
  // Manual correction on top, in ms; negative brings the visuals earlier.
  latencyOffset: number
}

export interface Settings {
  version: typeof SETTINGS_VERSION
  lang: Lang
  // Copy added files into the app's private storage so the list survives a reload.
  keepFiles: boolean
  analysis: AnalysisSettings
}

export function defaultSettings(lang: Lang): Settings {
  return {
    version: SETTINGS_VERSION,
    lang,
    keepFiles: false,
    analysis: { bands: 32, smoothing: 0.4, autoLevel: true, autoLatency: true, latencyOffset: 0 },
  }
}

function num(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function normalizeAnalysis(raw: unknown, defaults: AnalysisSettings): AnalysisSettings {
  if (typeof raw !== 'object' || raw === null) return defaults
  const r = raw as Record<string, unknown>
  return {
    bands: (BAND_CHOICES as readonly unknown[]).includes(r.bands) ? (r.bands as number) : defaults.bands,
    smoothing: num(r.smoothing, 0, 1, defaults.smoothing),
    autoLevel: bool(r.autoLevel, defaults.autoLevel),
    autoLatency: bool(r.autoLatency, defaults.autoLatency),
    latencyOffset: num(r.latencyOffset, LATENCY_OFFSET_MIN, LATENCY_OFFSET_MAX, defaults.latencyOffset),
  }
}

// Stored data can be missing, from an older version or hand-edited: keep each valid field,
// fall back to the defaults for the rest.
export function normalizeSettings(raw: unknown, defaults: Settings): Settings {
  if (typeof raw !== 'object' || raw === null) return defaults
  const r = raw as Record<string, unknown>
  return {
    version: SETTINGS_VERSION,
    lang: isLang(r.lang) ? r.lang : defaults.lang,
    keepFiles: bool(r.keepFiles, defaults.keepFiles),
    analysis: normalizeAnalysis(r.analysis, defaults.analysis),
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
