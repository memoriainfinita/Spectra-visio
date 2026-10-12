import { get, set } from 'idb-keyval'
import { DEFAULT_AUTO, normalizeAuto, type AutoSettings } from '../engine/auto/auto'
import { DEFAULT_LIVE, normalizeLive, type LiveSettings } from '../engine/live/live'
import { DEFAULT_MIDI, normalizeMidi, type MidiSettings } from '../engine/midi/midi'
import { DEFAULT_OBS, normalizeObs, type ObsSettings } from '../engine/obs/settings'
import { DEFAULT_FORMAT, normalizeFormat, type OutputFormat } from '../engine/output/format'
import { DEFAULT_RECORD, normalizeRecord, type RecordSettings } from '../engine/record/recorder'
import { DEFAULT_PERFORMANCE, normalizePerformance, type PerformanceSettings } from '../engine/render/quality'
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
  // For files analysed beforehand: a fixed level from the track's loudness instead.
  trackLevel: boolean
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
  auto: AutoSettings
  // Keyboard shortcuts and the strobe rate.
  live: LiveSettings
  midi: MidiSettings
  // Size of the composition, for the stage, the output window, recordings and OBS.
  format: OutputFormat
  record: RecordSettings
  obs: ObsSettings
  performance: PerformanceSettings
  // Photosensitive safety on the output: no strobe, slow brightness rises.
  reduceFlashes: boolean
  // The photosensitivity notice was shown and answered.
  flashNotice: boolean
  // A TV channel in the visual input is also the audio source.
  tvSound: boolean
}

// `reduceFlashes` follows the system's reduced motion preference until changed.
export function defaultSettings(lang: Lang, reduceFlashes = false): Settings {
  return {
    version: SETTINGS_VERSION,
    lang,
    keepFiles: false,
    analysis: { bands: 32, smoothing: 0.4, autoLevel: true, trackLevel: false, autoLatency: true, latencyOffset: 0 },
    auto: DEFAULT_AUTO,
    live: DEFAULT_LIVE,
    midi: DEFAULT_MIDI,
    format: DEFAULT_FORMAT,
    record: DEFAULT_RECORD,
    obs: DEFAULT_OBS,
    performance: DEFAULT_PERFORMANCE,
    reduceFlashes,
    flashNotice: false,
    tvSound: false,
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
    trackLevel: bool(r.trackLevel, defaults.trackLevel),
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
    auto: r.auto === undefined ? defaults.auto : normalizeAuto(r.auto),
    live: r.live === undefined ? defaults.live : normalizeLive(r.live),
    midi: r.midi === undefined ? defaults.midi : normalizeMidi(r.midi),
    format: r.format === undefined ? defaults.format : normalizeFormat(r.format),
    record: r.record === undefined ? defaults.record : normalizeRecord(r.record),
    obs: r.obs === undefined ? defaults.obs : normalizeObs(r.obs),
    performance: r.performance === undefined ? defaults.performance : normalizePerformance(r.performance),
    reduceFlashes: bool(r.reduceFlashes, defaults.reduceFlashes),
    flashNotice: bool(r.flashNotice, defaults.flashNotice),
    tvSound: bool(r.tvSound, defaults.tvSound),
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
