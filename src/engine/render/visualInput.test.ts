import { describe, expect, test } from 'vitest'
import { setVisualSource, visualSourceOf, visualSources, type VisualSource } from './visualInput'

const source = (live = false): VisualSource => ({ element: {} as HTMLCanvasElement, width: 4, height: 2, live })

describe('visual input sources', () => {
  test('each layer keeps its own, and taking one off leaves the rest', () => {
    const a = source()
    const b = source(true)
    setVisualSource('l1', a)
    setVisualSource('l2', b)
    expect(visualSourceOf('l1')).toBe(a)
    expect(visualSourceOf('l2')).toBe(b)
    expect([...visualSources().keys()].sort()).toEqual(['l1', 'l2'])
    setVisualSource('l1', null)
    expect(visualSourceOf('l1')).toBeNull()
    expect(visualSourceOf('l2')).toBe(b)
    setVisualSource('l2', null)
    expect(visualSources().size).toBe(0)
  })
})
