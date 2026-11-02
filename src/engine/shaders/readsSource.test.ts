import { describe, expect, it } from 'vitest'
import { SHADER_EXAMPLES } from './examples'
import { readsSource } from './readsSource'

describe('readsSource', () => {
  it('finds the ISF image input and the Shadertoy channel', () => {
    expect(readsSource('isf', '/*{"INPUTS":[{"NAME":"inputImage","TYPE":"image"}]}*/')).toBe(true)
    expect(readsSource('isf', '/*{"INPUTS":[{"NAME":"k","TYPE":"float"}]}*/')).toBe(false)
    expect(readsSource('shadertoy', 'c = texture(iChannel1, p);')).toBe(true)
    expect(readsSource('shadertoy', 'c = texture(iChannel0, p);')).toBe(false)
  })

  it('only the input example among ours reads it', () => {
    const reads = SHADER_EXAMPLES.filter((e) => readsSource(e.format, e.source)).map((e) => e.id)
    expect(reads).toEqual(['split'])
  })
})
