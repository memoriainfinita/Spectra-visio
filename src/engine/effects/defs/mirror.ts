import { singlePass, type EffectDef } from '../effect'

// Left half reflected onto the right, top half onto the bottom, or both.
const FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uSrc;
uniform int uMode;
out vec4 outColor;
void main() {
  vec2 uv = vUv;
  if (uMode != 1 && uv.x > 0.5) uv.x = 1.0 - uv.x;
  if (uMode != 0 && uv.y < 0.5) uv.y = 1.0 - uv.y;
  outColor = vec4(texture(uSrc, uv).rgb, 1.0);
}`

export const mirror: EffectDef = {
  id: 'mirror',
  label: 'effect.mirror',
  params: [{ id: 'mode', label: 'param.mode', min: 0, max: 2, default: 0, int: true, options: ['mirror.horizontal', 'mirror.vertical', 'mirror.both'] }],
  create(gl) {
    return singlePass(gl, FS, ['uMode'] as const, (u, { params }) => gl.uniform1i(u.uMode, params.mode))
  },
}
