import { createStore } from '../core/store'
import { revealDock } from './layout'
import { sceneStore, selectLayer } from './scene'

// What the Inspector shows: the composition, the selected layer or one of its clips. The
// layer is the scene's selection; the level, the clip and the folded sections belong to
// this viewer only and are kept in localStorage.

export const LEVELS = ['comp', 'layer', 'clip'] as const
export type Level = (typeof LEVELS)[number]

export interface InspectorState {
  level: Level
  // Column of the clip shown; null follows the clip the layer plays.
  column: number | null
  // Section id → folded, for the sections toggled by hand.
  folded: Record<string, boolean>
}

const KEY = 'spectra.inspector'

function load(): InspectorState {
  const fallback: InspectorState = { level: 'layer', column: null, folded: {} }
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<InspectorState> | null
    if (!raw || typeof raw !== 'object') return fallback
    const level = LEVELS.includes(raw.level as Level) ? (raw.level as Level) : fallback.level
    const folded: Record<string, boolean> = {}
    if (raw.folded && typeof raw.folded === 'object') for (const [k, v] of Object.entries(raw.folded)) if (typeof v === 'boolean') folded[k] = v
    return { level, column: null, folded }
  } catch {
    return fallback
  }
}

export const inspectorStore = createStore<InspectorState>(load())

inspectorStore.subscribe(() => {
  const { level, folded } = inspectorStore.get()
  try {
    localStorage.setItem(KEY, JSON.stringify({ level, folded }))
  } catch {
    // Only a convenience: the Inspector opens on the layer next time.
  }
})

export function setLevel(level: Level): void {
  inspectorStore.set((s) => (s.level === level ? s : { ...s, level }))
}

// Picking the composition or a layer from outside the Inspector brings its tab to the
// front, as in the laptop layout, where it shares a stack with Layers.
export function inspectComposition(): void {
  setLevel('comp')
  revealDock('inspector')
}

// Another layer shows the clip it plays. 'keep' is the Inspector's own picker.
export function inspectLayer(layer: number, level: 'layer' | 'keep' = 'layer'): void {
  const changed = sceneStore.get().selected !== layer
  selectLayer(layer)
  inspectorStore.set((s) => ({ ...s, level: level === 'keep' ? s.level : level, column: changed ? null : s.column }))
  if (level !== 'keep') revealDock('inspector')
}

// A clip is mostly clicked to launch it, often during a show: its tab is not brought forward,
// so the stack keeps showing what was there.
export function inspectClip(layer: number, column: number): void {
  selectLayer(layer)
  inspectorStore.set((s) => ({ ...s, level: 'clip', column }))
}

// Sections start folded or open as they come; once toggled, they stay as left.
export function isFolded(state: InspectorState, id: string, byDefault: boolean): boolean {
  return state.folded[id] ?? byDefault
}

export function setFolded(id: string, folded: boolean): void {
  inspectorStore.set((s) => ({ ...s, folded: { ...s.folded, [id]: folded } }))
}

// The column the clip level shows for the selected layer, or null.
export function inspectedColumn(state: InspectorState, active: number | null): number | null {
  return state.column ?? active
}
