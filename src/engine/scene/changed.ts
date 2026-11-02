import type { SceneState } from './scene'

// What an undo or redo moved, for the notice: one area of the scene, with the layer (from 1)
// when it is one's own. Several areas at once, or none that has a name: null.

export type ChangeArea = 'layers' | 'opacity' | 'layer' | 'effects' | 'compEffects' | 'clips' | 'layerKnobs' | 'crossfade' | 'transition' | 'overlays' | 'knobs' | 'variations' | 'columns' | 'modulators' | 'panel'

export interface Change {
  area: ChangeArea
  layer?: number
}

type LayerKey = keyof SceneState['layers'][number]
const LAYER_AREA: Partial<Record<LayerKey, ChangeArea>> = { opacity: 'opacity', effects: 'effects', clips: 'clips', knobs: 'layerKnobs' }
// The rest of a layer's fields (visualization, settings, blend, bypass, solo, side, active) are 'layer'.

// The areas where `a` and `b` differ, as keys: an area alone, or an area of a layer as `area:n`.
export function changedAreas(a: SceneState, b: SceneState): Set<string> {
  const out = new Set<string>()
  if (a.layers.length !== b.layers.length) return out.add('layers')
  b.layers.forEach((l, i) => {
    const before = a.layers[i]
    if (before === l) return
    for (const k of Object.keys(l) as LayerKey[]) {
      if (before[k] !== l[k]) out.add(`${LAYER_AREA[k] ?? 'layer'}:${i + 1}`)
    }
  })
  const top: [keyof SceneState, ChangeArea][] = [
    ['crossfade', 'crossfade'],
    ['effects', 'compEffects'],
    ['transition', 'transition'],
    ['overlays', 'overlays'],
    ['knobs', 'knobs'],
    ['compKnobs', 'knobs'],
    ['variations', 'variations'],
    ['columns', 'columns'],
    ['modulators', 'modulators'],
    ['panel', 'panel'],
  ]
  for (const [k, area] of top) if (a[k] !== b[k]) out.add(area)
  return out
}

export function describeChange(a: SceneState, b: SceneState): Change | null {
  const areas = changedAreas(a, b)
  if (areas.size !== 1) return null
  const [only] = [...areas]
  const [area, n] = only.split(':')
  return n ? { area: area as ChangeArea, layer: Number(n) } : { area: area as ChangeArea }
}
