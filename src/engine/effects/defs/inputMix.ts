import { LUMA_GLSL, drawFullscreen, program, uniforms } from '../../render/gl'
import { FIT_OPTIONS, FLIP_OPTIONS } from '../../render/visuals/media'
import { FIT_GLSL, InputTexture } from '../../render/visualInput'
import type { EffectDef } from '../effect'

// The visual input combined with the image: over it, added, multiplied, screened, as a
// difference, or as a mask whose brightness lets the image through.
const FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uSrc, uInput;
uniform vec2 uRes, uSrcSize;
uniform int uMode;
uniform float uAmount, uCover, uFlip;
out vec4 outColor;
${LUMA_GLSL}
${FIT_GLSL}
void main() {
  vec3 a = texture(uSrc, vUv).rgb;
  vec2 uv = fitUv(vUv * uRes, uRes, uSrcSize, uCover, uFlip);
  vec3 b = texture(uInput, uv).rgb * inside(uv);
  vec3 m;
  if (uMode == 1) m = min(a + b, 1.0);
  else if (uMode == 2) m = a * b;
  else if (uMode == 3) m = 1.0 - (1.0 - a) * (1.0 - b);
  else if (uMode == 4) m = abs(a - b);
  else if (uMode == 5) m = a * luma(b);
  else m = b;
  outColor = vec4(mix(a, m, uAmount), 1.0);
}`

export const inputMix: EffectDef = {
  id: 'inputMix',
  label: 'effect.inputMix',
  params: [
    { id: 'mode', label: 'param.mode', min: 0, max: 5, default: 0, int: true, options: ['inputMix.over', 'blend.add', 'blend.multiply', 'blend.screen', 'blend.difference', 'inputMix.mask'] },
    { id: 'amount', label: 'param.amount', min: 0, max: 1, default: 0.5 },
    { id: 'fit', label: 'param.fit', min: 0, max: 1, default: 0, int: true, options: [...FIT_OPTIONS] },
    { id: 'flip', label: 'param.flip', min: 0, max: 1, default: 0, int: true, options: [...FLIP_OPTIONS] },
  ],
  create(gl) {
    const prog = program(gl, FS)
    const u = uniforms(gl, prog, ['uSrc', 'uInput', 'uRes', 'uSrcSize', 'uMode', 'uAmount', 'uCover', 'uFlip'] as const)
    const vao = gl.createVertexArray()!
    const input = new InputTexture(gl)
    return {
      render({ src, out, params }) {
        // The upload binds the input on the active unit: unit 1, before the source on 0.
        gl.activeTexture(gl.TEXTURE1)
        input.update()
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, src)
        out.bind()
        gl.useProgram(prog)
        gl.uniform1i(u.uSrc, 0)
        gl.uniform1i(u.uInput, 1)
        gl.uniform2f(u.uRes, out.width, out.height)
        gl.uniform2f(u.uSrcSize, input.width, input.height)
        gl.uniform1i(u.uMode, params.mode)
        gl.uniform1f(u.uAmount, params.amount)
        gl.uniform1f(u.uCover, params.fit === 0 ? 1 : 0)
        gl.uniform1f(u.uFlip, params.flip)
        drawFullscreen(gl, vao)
        return out.texture
      },
      dispose() {
        gl.deleteProgram(prog)
        gl.deleteVertexArray(vao)
        input.dispose()
      },
    }
  },
}
