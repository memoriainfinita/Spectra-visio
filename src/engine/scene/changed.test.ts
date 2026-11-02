import { describe, expect, test } from 'vitest'
import { describeChange } from './changed'
import { defaultScene, newLayer } from './scene'

describe('describeChange', () => {
  const a = defaultScene()

  test('a layer opacity names the layer', () => {
    const layers = a.layers.map((l, i) => (i === 1 ? { ...l, opacity: 0.2 } : l))
    expect(describeChange(a, { ...a, layers })).toEqual({ area: 'opacity', layer: 2 })
  })

  test('layers added or removed, and top-level areas', () => {
    expect(describeChange(a, { ...a, layers: [...a.layers, newLayer('l3')] })).toEqual({ area: 'layers' })
    expect(describeChange(a, { ...a, crossfade: 0.4 })).toEqual({ area: 'crossfade' })
    expect(describeChange(a, { ...a, knobs: [...a.knobs] })).toEqual({ area: 'knobs' })
    expect(describeChange(a, { ...a, columns: [...a.columns] })).toEqual({ area: 'columns' })
  })

  test('the layer chosen is not a change, and several areas give none', () => {
    expect(describeChange(a, { ...a, selected: 1 })).toBeNull()
    expect(describeChange(a, { ...a, crossfade: 0.4, transition: 3 })).toBeNull()
  })

  test('any other field of a layer is the layer', () => {
    const layers = a.layers.map((l, i) => (i === 0 ? { ...l, bypass: true } : l))
    expect(describeChange(a, { ...a, layers })).toEqual({ area: 'layer', layer: 1 })
  })
})
