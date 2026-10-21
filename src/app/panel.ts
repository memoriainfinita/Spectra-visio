import { PANEL_CELLS, sameControl, withControl, withoutControl, type PanelControl } from '../engine/scene/panel'
import { sceneStore } from './scene'

// My panel: controls put there from their right-click menu or from the panel's own editor.

export const inPanel = (c: PanelControl) => sceneStore.get().panel.some((x) => x && sameControl(x, c))

// On the panel when it is not, off when it is. False when the panel is full.
export function togglePanelControl(c: PanelControl): boolean {
  if (inPanel(c)) {
    sceneStore.set((s) => ({ ...s, panel: withoutControl(s.panel, c) }))
    return true
  }
  if (!sceneStore.get().panel.includes(null)) return false
  sceneStore.set((s) => ({ ...s, panel: withControl(s.panel, c) }))
  return true
}

// A control in one cell, taken from any other it was in; null empties the cell.
export function setPanelCell(i: number, c: PanelControl | null): void {
  if (i < 0 || i >= PANEL_CELLS) return
  sceneStore.set((s) => {
    const panel = c ? withoutControl(s.panel, c) : [...s.panel]
    panel[i] = c
    return { ...s, panel }
  })
}

// Swaps two cells, for moving a control along the panel.
export function swapPanelCells(i: number, j: number): void {
  if (i < 0 || j < 0 || i >= PANEL_CELLS || j >= PANEL_CELLS || i === j) return
  sceneStore.set((s) => {
    const panel = [...s.panel]
    ;[panel[i], panel[j]] = [panel[j], panel[i]]
    return { ...s, panel }
  })
}
