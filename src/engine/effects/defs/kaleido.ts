import { TAU } from '../../render/visual'
import { singlePass, type EffectDef } from '../effect'

// Folds the image into mirrored wedges around the centre, turning over time.
const FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uSrc;
uniform float uSegments, uAngle, uZoom, uAspect;
out vec4 outColor;
void main() {
  vec2 p = vUv - 0.5;
  p.x *= uAspect;
  float r = length(p) / uZoom;
  float seg = 6.2831853 / uSegments;
  float a = mod(atan(p.y, p.x) + uAngle, seg);
  a = abs(a - seg * 0.5);
  p = vec2(cos(a), sin(a)) * r;
  p.x /= uAspect;
  // Mirrored repeat keeps every sample inside the image.
  vec2 uv = 1.0 - abs(1.0 - mod(p + 0.5, 2.0));
  outColor = vec4(texture(uSrc, uv).rgb, 1.0);
}`

export const kaleidoFx: EffectDef = {
  id: 'kaleido',
  label: 'effect.kaleido',
  params: [
    { id: 'segments', label: 'param.segments', min: 2, max: 16, default: 6, int: true },
    { id: 'rotation', label: 'param.rotation', min: -180, max: 180, default: 10 },
    { id: 'zoom', label: 'param.zoom', min: 0.5, max: 3, default: 1 },
  ],
  create(gl) {
    let angle = 0
    return singlePass(gl, FS, ['uSegments', 'uAngle', 'uZoom', 'uAspect'] as const, (u, { params, frame, surface }) => {
      angle = (angle + (params.rotation * Math.PI * frame.dt) / 180) % TAU
      gl.uniform1f(u.uSegments, params.segments)
      gl.uniform1f(u.uAngle, angle)
      gl.uniform1f(u.uZoom, params.zoom)
      gl.uniform1f(u.uAspect, surface.width / surface.height)
    })
  },
}
