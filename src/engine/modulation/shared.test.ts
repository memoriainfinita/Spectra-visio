import { describe, expect, test } from 'vitest'
import { MAP_AMOUNT, destIndex, isModTarget, newSharedModulator, normalizeModulators, setDest, toggleDest, withoutLayer, type ModTarget } from './shared'

const opacity: ModTarget = { kind: 'opacity', layer: 'l1' }
const param: ModTarget = { kind: 'param', layer: 'l1', visual: 'kaleido', param: 'speed' }

describe('shared modulator destinations', () => {
  test('a layer opacity is a destination, the crossfader is not', () => {
    expect(isModTarget(opacity)).toBe(true)
    expect(isModTarget({ kind: 'crossfade' })).toBe(false)
  })

  test('toggling puts an opacity on and takes it off', () => {
    const m = newSharedModulator('m1', 'lfo')
    const on = toggleDest(m, opacity)
    expect(on.dests).toEqual([{ target: opacity, amount: MAP_AMOUNT }])
    expect(toggleDest(on, opacity).dests).toEqual([])
  })

  test('setDest adds a destination at that amount, or changes it, within -1 and 1', () => {
    const m = newSharedModulator('m1', 'lfo')
    const added = setDest(m, param, 0.3)
    expect(added.dests[destIndex(added, param)].amount).toBe(0.3)
    expect(setDest(added, param, -5).dests[0].amount).toBe(-1)
    expect(setDest(added, param, 5).dests).toHaveLength(1)
  })

  test('opacity destinations survive normalization, and go with their layer', () => {
    const m = { ...newSharedModulator('m1', 'lfo'), dests: [{ target: opacity, amount: 0.4 }, { target: param, amount: 0.2 }] }
    const back = normalizeModulators(JSON.parse(JSON.stringify([m])), new Set(['l1']))
    expect(back[0].dests).toHaveLength(2)
    expect(normalizeModulators(JSON.parse(JSON.stringify([m])), new Set(['l2']))[0].dests).toHaveLength(0)
    expect(withoutLayer(m, 'l1').dests).toHaveLength(0)
  })
})
