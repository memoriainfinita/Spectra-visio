import { LUMA_GLSL } from '../../render/gl'
import { singlePass, type EffectDef } from '../effect'
import { PALETTES, PALETTE_WIDTH, paletteData } from '../palettes'

// Recolours the image by brightness. The offset shifts the lookup and bounces at the ends,
// so modulating it cycles the colours without a jump.
const FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uSrc, uPalettes;
uniform float uRow, uAmount, uOffset;
out vec4 outColor;
${LUMA_GLSL}
void main() {
  vec3 c = texture(uSrc, vUv).rgb;
  float t = luma(c) + uOffset;
  t = 1.0 - abs(1.0 - mod(t, 2.0));
  float x = (t * ${PALETTE_WIDTH - 1}.0 + 0.5) / ${PALETTE_WIDTH}.0;
  vec3 p = texture(uPalettes, vec2(x, (uRow + 0.5) / ${PALETTES.length}.0)).rgb;
  outColor = vec4(mix(c, p, uAmount), 1.0);
}`

export const palette: EffectDef = {
  id: 'palette',
  label: 'effect.palette',
  params: [
    { id: 'palette', label: 'param.palette', min: 0, max: PALETTES.length - 1, default: 0, int: true, options: PALETTES.map((p) => p.label) },
    { id: 'amount', label: 'param.amount', min: 0, max: 1, default: 1 },
    { id: 'offset', label: 'param.offset', min: 0, max: 1, default: 0 },
  ],
  create(gl) {
    const tex = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, PALETTE_WIDTH, PALETTES.length, 0, gl.RGBA, gl.UNSIGNED_BYTE, paletteData())
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    return singlePass(
      gl,
      FS,
      ['uRow', 'uAmount', 'uOffset'] as const,
      (u, { params }) => {
        gl.uniform1f(u.uRow, params.palette)
        gl.uniform1f(u.uAmount, params.amount)
        gl.uniform1f(u.uOffset, params.offset)
      },
      { textures: [tex], samplers: ['uPalettes'], dispose: () => gl.deleteTexture(tex) },
    )
  },
}
