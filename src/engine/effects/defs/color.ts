import { HUE_GLSL, LUMA_GLSL } from '../../render/gl'
import { singlePass, type EffectDef } from '../effect'

const FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uSrc;
uniform float uBrightness, uContrast, uSaturation, uHue;
out vec4 outColor;
${LUMA_GLSL}
${HUE_GLSL}
void main() {
  vec3 c = hueRotate(texture(uSrc, vUv).rgb, uHue);
  c = mix(vec3(luma(c)), c, uSaturation);
  c = (c - 0.5) * uContrast + 0.5 + uBrightness;
  outColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`

export const color: EffectDef = {
  id: 'color',
  label: 'effect.color',
  params: [
    { id: 'brightness', label: 'param.brightness', min: -0.5, max: 0.5, default: 0 },
    { id: 'contrast', label: 'param.contrast', min: 0, max: 2, default: 1 },
    { id: 'saturation', label: 'param.saturation', min: 0, max: 2, default: 1 },
    { id: 'hue', label: 'param.hue', min: 0, max: 360, default: 0 },
  ],
  create(gl) {
    return singlePass(gl, FS, ['uBrightness', 'uContrast', 'uSaturation', 'uHue'] as const, (u, { params }) => {
      gl.uniform1f(u.uBrightness, params.brightness)
      gl.uniform1f(u.uContrast, params.contrast)
      gl.uniform1f(u.uSaturation, params.saturation)
      gl.uniform1f(u.uHue, (params.hue * Math.PI) / 180)
    })
  },
}
