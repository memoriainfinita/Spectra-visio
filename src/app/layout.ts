import { get, set } from 'idb-keyval'
import { createStore } from '../core/store'
import {
  CUSTOM_MAX,
  activeLayout,
  addDock as addTo,
  defaultLayouts,
  deleteLayout as deleteFrom,
  isBuiltIn,
  moveDock as moveIn,
  normalizeLayouts,
  removeDock as removeFrom,
  replaceLayout,
  resetLayout as resetIn,
  saveAs,
  selectTab as selectIn,
  setWidth as setWidthIn,
  type DockId,
  type DropTarget,
  type Layout,
  type Layouts,
  type Side,
  type WidthClass,
  type ZoneId,
} from '../engine/layout/layout'

const KEY = 'layouts'

export const layoutsStore = createStore<Layouts>(defaultLayouts())

// What only lasts while the app is open: the layout being edited, the dock being dragged
// and the docks in a window of their own.
export interface DockUi {
  editing: boolean
  dragging: DockId | null
  windows: DockId[]
}

export const dockUi = createStore<DockUi>({ editing: false, dragging: null, windows: [] })

export async function initLayouts(): Promise<void> {
  try {
    layoutsStore.set(normalizeLayouts(await get(KEY)))
  } catch {
    // IndexedDB unavailable: layouts last for this visit only.
  }
  layoutsStore.subscribe(() => {
    set(KEY, layoutsStore.get()).catch(() => {})
  })
}

// The layout of the screen width the app is shown at.
let width: WidthClass = 'desktop'
export function setWidthClass(w: WidthClass): void {
  width = w
}

export const currentLayout = (s: Layouts = layoutsStore.get()): Layout => activeLayout(s, width)

function edit(change: (l: Layout) => Layout, evenLocked = false): void {
  layoutsStore.set((s) => {
    if (s.locked && !evenLocked) return s
    const l = activeLayout(s, width)
    const next = change(l)
    return next === l ? s : replaceLayout(s, next)
  })
}

// Showing another tab is not a change of layout: it works while locked too.
export const selectTab = (zone: ZoneId, stack: number, tab: number): void => edit((l) => selectIn(l, zone, stack, tab), true)
export const moveDock = (dock: DockId, target: DropTarget): void => edit((l) => moveIn(l, dock, target))
export const removeDock = (dock: DockId): void => edit((l) => removeFrom(l, dock))
export const addDock = (dock: DockId): void => edit((l) => addTo(l, dock))
export const setZoneWidth = (side: Side, px: number): void => edit((l) => setWidthIn(l, side, px))

// Shows `dock`'s tab, wherever it is in the layout.
export function revealDock(dock: DockId): void {
  edit((l) => {
    for (const zone of ['left', 'right', 'strip'] as const) {
      const i = l.zones[zone].findIndex((s) => s.tabs.includes(dock))
      if (i >= 0) return selectIn(l, zone, i, l.zones[zone][i].tabs.indexOf(dock))
    }
    return l
  }, true)
}

export function useLayout(id: string): void {
  layoutsStore.set((s) => (s.list.some((l) => l.id === id) ? { ...s, active: { ...s.active, [width]: id } } : s))
}

let seq = 0
export function saveLayoutAs(name: string): boolean {
  const s = layoutsStore.get()
  const next = saveAs(s, activeLayout(s, width), name, `u${Date.now().toString(36)}${++seq}`, width)
  if (next) layoutsStore.set(next)
  return next !== null
}

export function resetLayout(): void {
  layoutsStore.set((s) => resetIn(s, activeLayout(s, width).id))
}

export function deleteLayout(): void {
  layoutsStore.set((s) => deleteFrom(s, activeLayout(s, width).id))
}

export function setLocked(locked: boolean): void {
  layoutsStore.set((s) => ({ ...s, locked }))
  if (locked) setEditing(false)
}

export function setEditing(editing: boolean): void {
  if (editing && layoutsStore.get().locked) return
  dockUi.set((u) => ({ ...u, editing, dragging: editing ? u.dragging : null }))
}

export const setDragging = (dock: DockId | null): void => dockUi.set((u) => (u.dragging === dock ? u : { ...u, dragging: dock }))

export const canReset = (l: Layout): boolean => isBuiltIn(l.id)

// Saved layouts from a backup join the ones here, skipping those already present. Returns
// how many came in.
export function mergeLayouts(raw: unknown): number {
  const here = layoutsStore.get()
  const ids = new Set(here.list.map((l) => l.id))
  const room = CUSTOM_MAX - here.list.filter((l) => !isBuiltIn(l.id)).length
  const incoming = normalizeLayouts(raw)
    .list.filter((l) => !isBuiltIn(l.id) && !ids.has(l.id))
    .slice(0, Math.max(0, room))
  if (incoming.length) layoutsStore.set((s) => ({ ...s, list: [...s.list, ...incoming] }))
  return incoming.length
}
