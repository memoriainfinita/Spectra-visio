import { describe, expect, it } from 'vitest'
import { SHADER_EXAMPLES } from './examples'
import { parseIsf } from './isf'
import { checkShadertoy } from './shadertoy'

// Compiling needs WebGL, which the browser scripts cover; here the format and the declared
// inputs are checked.
describe('example shaders', () => {
  it('have unique ids and names', () => {
    expect(new Set(SHADER_EXAMPLES.map((e) => e.id)).size).toBe(SHADER_EXAMPLES.length)
    expect(new Set(SHADER_EXAMPLES.map((e) => e.name)).size).toBe(SHADER_EXAMPLES.length)
  })

  it('cover both formats', () => {
    expect(SHADER_EXAMPLES.filter((e) => e.format === 'shadertoy')).toHaveLength(2)
    expect(SHADER_EXAMPLES.filter((e) => e.format === 'isf')).toHaveLength(2)
  })

  for (const e of SHADER_EXAMPLES) {
    it(`${e.id} reads as ${e.format}`, () => {
      if (e.format === 'shadertoy') expect(() => checkShadertoy(e.source)).not.toThrow()
      else {
        const s = parseIsf(e.source)
        expect(s.inputs.length).toBeGreaterThan(0)
      }
    })
  }

  it('stripes keeps a pass target and an event, flow reads the spectrum', () => {
    const stripes = parseIsf(SHADER_EXAMPLES.find((e) => e.id === 'stripes')!.source)
    expect(stripes.passes.map((p) => p.target)).toEqual(['pulse', null])
    expect(stripes.inputs.some((i) => i.type === 'event')).toBe(true)
    const flow = parseIsf(SHADER_EXAMPLES.find((e) => e.id === 'flow')!.source)
    expect(flow.inputs.some((i) => i.type === 'audioFFT')).toBe(true)
  })
})
