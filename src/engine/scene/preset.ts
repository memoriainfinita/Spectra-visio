import { getVisual } from '../render/registry'
import { normalizeEffects, normalizeVisualSettings, visualSettings, type EffectState, type SceneState, type VisualSettings } from './scene'

// A preset is one visualization with its values and modulations, plus the effect chain.
// Loading it puts the visualization on a layer and replaces the chain.

export const PRESET_FORMAT = 'spectravisio-presets'
export const PRESET_VERSION = 1
export const NAME_MAX = 60

export interface Preset {
  id: string
  name: string
  // Milliseconds since the epoch.
  created: number
  visual: string
  settings: VisualSettings
  effects: EffectState[]
}

export function cleanName(name: string): string {
  return name.replace(/\s+/g, ' ').trim().slice(0, NAME_MAX)
}

export function presetFrom(scene: SceneState, layer: 0 | 1, name: string, id: string, created: number): Preset {
  const l = scene.layers[layer]
  return { id, name: cleanName(name), created, visual: l.visual, settings: visualSettings(l), effects: scene.effects }
}

export function applyPreset(scene: SceneState, layer: 0 | 1, p: Preset): SceneState {
  const layers: SceneState['layers'] = [...scene.layers]
  const l = layers[layer]
  layers[layer] = { visual: p.visual, perVisual: { ...l.perVisual, [p.visual]: p.settings } }
  return { ...scene, layers, effects: p.effects }
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

// Null when the name is empty or the visualization unknown; the rest is checked like a scene.
export function normalizePreset(raw: unknown): Preset | null {
  if (!isObj(raw) || typeof raw.id !== 'string' || typeof raw.name !== 'string' || typeof raw.visual !== 'string') return null
  const name = cleanName(raw.name)
  if (!name || !getVisual(raw.visual)) return null
  const settings = normalizeVisualSettings(raw.visual, isObj(raw.settings) ? raw.settings : {})
  if (!settings) return null
  const created = typeof raw.created === 'number' && Number.isFinite(raw.created) ? raw.created : 0
  return { id: raw.id, name, created, visual: raw.visual, settings, effects: normalizeEffects(raw.effects) }
}

export function normalizePresets(raw: unknown): Preset[] {
  if (!Array.isArray(raw)) return []
  const out: Preset[] = []
  for (const r of raw) {
    const p = normalizePreset(r)
    if (p && !out.some((x) => x.id === p.id)) out.push(p)
  }
  return out
}

export function exportPresets(presets: Preset[]): string {
  return JSON.stringify({ format: PRESET_FORMAT, version: PRESET_VERSION, presets }, null, 2)
}

export interface Imported {
  presets: Preset[]
  // Entries that were dropped as invalid.
  rejected: number
}

// Reads an exported file. Throws when the text is not one.
export function parsePresets(text: string): Imported {
  const data: unknown = JSON.parse(text)
  if (!isObj(data) || data.format !== PRESET_FORMAT || !Array.isArray(data.presets)) throw new Error('not a preset file')
  const presets = data.presets.map(normalizePreset).filter((p): p is Preset => p !== null)
  return { presets, rejected: data.presets.length - presets.length }
}
