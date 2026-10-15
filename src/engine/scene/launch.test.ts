import { describe, expect, test } from 'vitest'
import { LaunchQueue } from './launch'

describe('launch queue', () => {
  test('waits for the phase to wrap', () => {
    const q = new LaunchQueue()
    q.tick(0.2)
    q.add('l1', 3)
    expect(q.tick(0.5)).toEqual([])
    expect(q.tick(0.95)).toEqual([])
    expect(q.tick(0.05)).toEqual([['l1', 3]])
    expect(q.size).toBe(0)
  })

  test('one clip per layer, the last one', () => {
    const q = new LaunchQueue()
    q.tick(0.1)
    q.add('l1', 0)
    q.add('l2', 1)
    q.add('l1', 4)
    expect(q.tick(0.9)).toEqual([])
    expect(q.tick(0.0)).toEqual([
      ['l1', 4],
      ['l2', 1],
    ])
  })

  test('without a tempo, or when it is lost, what waits goes at once', () => {
    const q = new LaunchQueue()
    expect(q.tempo).toBe(false)
    q.tick(0.3)
    expect(q.tempo).toBe(true)
    q.add('l1', 2)
    expect(q.tick(null)).toEqual([['l1', 2]])
    expect(q.tempo).toBe(false)
  })

  test('cancel, only the column given when there is one', () => {
    const q = new LaunchQueue()
    q.add('l1', 2)
    q.cancel('l1', 5)
    expect(q.pending().get('l1')).toBe(2)
    q.cancel('l1', 2)
    expect(q.size).toBe(0)
    q.add('l2', 1)
    q.cancel('l2')
    expect(q.size).toBe(0)
  })

  test('a small step back is not a beat', () => {
    const q = new LaunchQueue()
    q.tick(0.6)
    q.add('l1', 0)
    expect(q.tick(0.55)).toEqual([])
  })
})
