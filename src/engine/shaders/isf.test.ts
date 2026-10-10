import { describe, expect, test } from 'vitest'
import { ShaderError, evalSize, isfFragment, parseIsf, samplerNames } from './isf'
import { checkShadertoy, shadertoyFragment } from './shadertoy'
import { isfParams, userVisual } from './userVisual'

const SHADER = `/*{
  "DESCRIPTION": "Test",
  "CREDIT": "me",
  "ISFVSN": "2",
  "INPUTS": [
    { "NAME": "level", "TYPE": "float", "MIN": 0, "MAX": 2, "DEFAULT": 5 },
    { "NAME": "invert", "TYPE": "bool", "DEFAULT": true },
    { "NAME": "mode", "TYPE": "long", "VALUES": [0, 2, 7], "LABELS": ["A", "B"], "DEFAULT": 2 },
    { "NAME": "tint", "TYPE": "color", "DEFAULT": [1, 0.5, 0, 1] },
    { "NAME": "center", "TYPE": "point2D", "DEFAULT": [0.5, 0.5] },
    { "NAME": "inputImage", "TYPE": "image" },
    { "NAME": "wave", "TYPE": "audio", "MAX": 256 },
    { "NAME": "fft", "TYPE": "audioFFT" },
    { "NAME": "pulse", "TYPE": "event" },
    { "NAME": "bad name", "TYPE": "float" },
    { "NAME": "level", "TYPE": "float" },
    { "NAME": "odd", "TYPE": "cube" }
  ],
  "PASSES": [{ "TARGET": "buf", "PERSISTENT": true, "WIDTH": "$WIDTH/2" }, {}]
}*/
void main() {
  vec4 a = IMG_THIS_PIXEL(inputImage);
  vec4 b = IMG_NORM_PIXEL(buf, isf_FragNormCoord);
  vec4 c = IMG_PIXEL(wave, gl_FragCoord.xy);
  vec2 s = IMG_SIZE(fft);
  gl_FragColor = a + b + c + vec4(s, level, 1.0);
}`

describe('ISF reader', () => {
  test('inputs: ranges, defaults, value lists; bad and repeated names skipped', () => {
    const s = parseIsf(SHADER)
    expect(s.description).toBe('Test')
    expect(s.inputs.map((x) => x.name)).toEqual(['level', 'invert', 'mode', 'tint', 'center', 'inputImage', 'wave', 'fft', 'pulse'])
    expect(s.inputs[0]).toMatchObject({ type: 'float', min: 0, max: 2, default: 2 })
    expect(s.inputs[1]).toMatchObject({ type: 'bool', default: true })
    expect(s.inputs[2]).toMatchObject({ type: 'long', values: [0, 2, 7], labels: ['A', 'B', '7'], default: 2 })
    expect(s.inputs[4]).toMatchObject({ type: 'point2D', min: [0, 0], max: [1, 1], default: [0.5, 0.5] })
    expect(s.inputs[6]).toMatchObject({ type: 'audio', samples: 256 })
    expect(s.inputs[7]).toMatchObject({ type: 'audioFFT', samples: 256 })
  })

  test('passes and samplers', () => {
    const s = parseIsf(SHADER)
    expect(s.passes).toEqual([
      { target: 'buf', persistent: true, float: false, width: '$WIDTH/2', height: null },
      { target: null, persistent: false, float: false, width: null, height: null },
    ])
    expect(samplerNames(s)).toEqual(['inputImage', 'wave', 'fft', 'buf'])
    expect(parseIsf('/*{}*/ void main() {}').passes).toHaveLength(1)
  })

  test('errors', () => {
    const code = (src: string) => {
      try {
        parseIsf(src)
        return 'ok'
      } catch (err) {
        return err instanceof ShaderError ? err.code : 'other'
      }
    }
    expect(code('void main() {}')).toBe('noHeader')
    expect(code('/* plain comment */ void main() {}')).toBe('noHeader')
    expect(code('/*{ "INPUTS": [ }*/ void main() {}')).toBe('badJson')
    expect(code('/*{}*/ void other() {}')).toBe('noMain')
    expect(code('/*{}*/ void main() {}' + ' '.repeat(200_001))).toBe('tooLong')
  })

  test('size expressions', () => {
    expect(evalSize('$WIDTH/2', 1280, 720)).toBe(640)
    expect(evalSize('floor($HEIGHT * 0.5) + 1', 1280, 721)).toBe(361)
    expect(evalSize('max($WIDTH, $HEIGHT)', 640, 900)).toBe(900)
    expect(evalSize('-(-4)', 1, 1)).toBe(4)
    expect(evalSize('256', 1, 1)).toBe(256)
    expect(evalSize('alert(1)', 1, 1)).toBeNull()
    expect(evalSize('$WIDTH +', 1, 1)).toBeNull()
    expect(evalSize('1/0', 1, 1)).toBeNull()
    expect(evalSize('99999', 1, 1)).toBe(8192)
  })

  test('fragment: uniforms declared, image helpers rewritten', () => {
    const fs = isfFragment(parseIsf(SHADER))
    for (const d of ['uniform float level;', 'uniform bool invert;', 'uniform int mode;', 'uniform vec4 tint;', 'uniform vec2 center;', 'uniform bool pulse;', 'uniform sampler2D buf;', 'uniform vec2 _wave_imgSize;'])
      expect(fs).toContain(d)
    expect(fs).toContain('texture2D(inputImage, isf_FragNormCoord)')
    expect(fs).toContain('texture2D(buf, isf_FragNormCoord)')
    expect(fs).toContain('isf_pixel(wave, _wave_imgSize, gl_FragCoord.xy)')
    expect(fs).toContain('vec2 s = _fft_imgSize;')
    expect(fs).not.toMatch(/IMG_/)
  })

  test('parameters: prefixed ids; colours and points split', () => {
    const ids = isfParams(parseIsf(SHADER)).map((p) => p.id)
    expect(ids).toEqual(['in.level', 'in.invert', 'in.mode', 'in.tint.r', 'in.tint.g', 'in.tint.b', 'in.center.x', 'in.center.y'])
    const mode = isfParams(parseIsf(SHADER))[2]
    expect(mode).toMatchObject({ min: 0, max: 2, default: 1, labels: ['A', 'B', '7'] })
  })

  test('shadertoy wrapper and visual definitions', () => {
    const st = 'void mainImage(out vec4 c, in vec2 p) { c = vec4(p / iResolution.xy, 0.0, 1.0); }'
    expect(() => checkShadertoy(st)).not.toThrow()
    expect(() => checkShadertoy('void main() {}')).toThrow(ShaderError)
    expect(shadertoyFragment(st)).toContain('mainImage(c, gl_FragCoord.xy);')
    const v = userVisual({ id: 'x', name: 'Mine', format: 'shadertoy', source: st, added: 0 })
    expect(v).toMatchObject({ id: 'user:x', name: 'Mine', category: 'shader', params: [] })
    expect(() => userVisual({ id: 'y', name: 'Bad', format: 'isf', source: st, added: 0 })).toThrow(ShaderError)
  })
})
