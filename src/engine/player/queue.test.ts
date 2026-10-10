import { describe, expect, test } from 'vitest'
import { following, moveItem, preceding, shuffled, syncShuffled } from './queue'

const order = ['a', 'b', 'c']

describe('following', () => {
  test('walks the order and stops at the end without repeat', () => {
    expect(following(order, null, 'off', false)).toBe('a')
    expect(following(order, 'a', 'off', true)).toBe('b')
    expect(following(order, 'c', 'off', true)).toBeNull()
  })
  test('repeat all wraps around', () => {
    expect(following(order, 'c', 'all', true)).toBe('a')
  })
  test('repeat one replays only when the track ended on its own', () => {
    expect(following(order, 'b', 'one', true)).toBe('b')
    expect(following(order, 'b', 'one', false)).toBe('c')
  })
  test('unknown current restarts from the top; empty order gives nothing', () => {
    expect(following(order, 'x', 'off', true)).toBe('a')
    expect(following([], null, 'all', true)).toBeNull()
  })
})

describe('preceding', () => {
  test('goes back and wraps only with repeat', () => {
    expect(preceding(order, 'b', 'off')).toBe('a')
    expect(preceding(order, 'a', 'off')).toBeNull()
    expect(preceding(order, 'a', 'all')).toBe('c')
  })
})

// Deterministic generator for the shuffle tests.
function seeded(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

describe('shuffled', () => {
  test('keeps every id once and the current one first', () => {
    const ids = ['a', 'b', 'c', 'd', 'e']
    const result = shuffled(ids, 'c', seeded(1))
    expect(result[0]).toBe('c')
    expect([...result].sort()).toEqual(ids)
  })
  test('without a current track it is a plain permutation', () => {
    expect(shuffled(['a', 'b'], null, seeded(2)).sort()).toEqual(['a', 'b'])
  })
})

describe('syncShuffled', () => {
  test('drops removed ids and places new ones after the current track', () => {
    const result = syncShuffled(['c', 'a', 'b'], ['a', 'c', 'd', 'e'], 'a', seeded(3))
    expect(result.slice(0, 2)).toEqual(['c', 'a'])
    expect([...result].sort()).toEqual(['a', 'c', 'd', 'e'])
  })
})

describe('moveItem', () => {
  test('moves forwards and backwards; out of range is a copy', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd'])
    expect(moveItem(['a', 'b', 'c', 'd'], 3, 1)).toEqual(['a', 'd', 'b', 'c'])
    expect(moveItem(['a', 'b'], 0, 5)).toEqual(['a', 'b'])
  })
})
