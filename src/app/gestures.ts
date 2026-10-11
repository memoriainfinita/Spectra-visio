import { visualsStore } from '../engine/render/registry'
import { sceneStore, setVisual } from './scene'
import { visualInputStore } from './visualInput'

// The next or previous visualization in the browser's order, on the selected layer; the
// visual input one only while there is an input. For swipes on the stage.
export function stepVisual(by: 1 | -1): void {
  const s = sceneStore.get()
  const layer = s.layers[s.selected]
  if (!layer) return
  const hasInput = visualInputStore.get().kind !== 'none'
  const list = visualsStore.get().filter((v) => v.category !== 'media' || hasInput || v.id === layer.visual)
  if (!list.length) return
  const at = list.findIndex((v) => v.id === layer.visual)
  const next = list[(at + by + list.length) % list.length]
  setVisual(s.selected, next.id)
}
