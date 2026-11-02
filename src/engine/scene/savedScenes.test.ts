import { describe, expect, it } from 'vitest'
import { demoScene } from './demos'
import { normalizeSavedScenes } from './savedScenes'
import { defaultScene, normalizeScene } from './scene'

describe('saved scenes', () => {
  it('keeps a scene as it was saved', () => {
    const scene = demoScene('mods')
    const [one] = normalizeSavedScenes([{ id: 'a', name: '  Mi   escena ', created: 5, scene }])
    expect(one.name).toBe('Mi escena')
    expect(one.created).toBe(5)
    expect(one.scene).toEqual(normalizeScene(scene))
  })

  it('drops what is not a named scene and repeated ids', () => {
    const list = normalizeSavedScenes([null, { id: 1 }, { id: 'a', name: '' }, { id: 'b', name: 'Ok', scene: defaultScene() }, { id: 'b', name: 'Otra' }])
    expect(list.map((s) => s.id)).toEqual(['b'])
    expect(normalizeSavedScenes('nope')).toEqual([])
  })
})
