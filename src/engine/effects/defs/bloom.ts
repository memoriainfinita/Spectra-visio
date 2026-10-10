import { LUMA_GLSL, Target, bindTextures, drawFullscreen, program, uniforms } from '../../render/gl'
import type { EffectDef } from '../effect'

// Bright parts, blurred at a quarter of the size, added back over the image.
const BRIGHT_FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uSrc;
uniform vec2 uTexel;
uniform float uThreshold;
out vec4 outColor;
${LUMA_GLSL}
void main() {
  // Four bilinear taps cover the 4 × 4 source pixels under this one.
  vec3 c = texture(uSrc, vUv + uTexel * vec2(-1.0, -1.0)).rgb
         + texture(uSrc, vUv + uTexel * vec2(1.0, -1.0)).rgb
         + texture(uSrc, vUv + uTexel * vec2(-1.0, 1.0)).rgb
         + texture(uSrc, vUv + uTexel * vec2(1.0, 1.0)).rgb;
  c *= 0.25;
  outColor = vec4(c * smoothstep(uThreshold, uThreshold + 0.15, luma(c)), 1.0);
}`

const BLUR_FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uSrc;
uniform vec2 uStep;
out vec4 outColor;
void main() {
  const float w[5] = float[](0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216);
  vec3 c = texture(uSrc, vUv).rgb * w[0];
  for (int i = 1; i < 5; i++) {
    c += texture(uSrc, vUv + uStep * float(i)).rgb * w[i];
    c += texture(uSrc, vUv - uStep * float(i)).rgb * w[i];
  }
  outColor = vec4(c, 1.0);
}`

const ADD_FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uSrc, uGlow;
uniform float uStrength;
out vec4 outColor;
void main() {
  outColor = vec4(min(texture(uSrc, vUv).rgb + texture(uGlow, vUv).rgb * uStrength, 1.0), 1.0);
}`

export const bloom: EffectDef = {
  id: 'bloom',
  label: 'effect.bloom',
  params: [
    { id: 'threshold', label: 'param.threshold', min: 0, max: 1, default: 0.5 },
    { id: 'strength', label: 'param.strength', min: 0, max: 3, default: 0.8 },
    { id: 'radius', label: 'param.radius', min: 0.5, max: 4, default: 1.5 },
  ],
  create(gl) {
    const bright = program(gl, BRIGHT_FS)
    const blur = program(gl, BLUR_FS)
    const add = program(gl, ADD_FS)
    const ub = uniforms(gl, bright, ['uSrc', 'uTexel', 'uThreshold'] as const)
    const ur = uniforms(gl, blur, ['uSrc', 'uStep'] as const)
    const ua = uniforms(gl, add, ['uSrc', 'uGlow', 'uStrength'] as const)
    const vao = gl.createVertexArray()!
    const small = [new Target(gl), new Target(gl)]
    return {
      render({ src, out, params, surface }) {
        const w = Math.max(1, Math.round(surface.width / 4))
        const h = Math.max(1, Math.round(surface.height / 4))
        for (const t of small) t.size(w, h)

        small[0].bind()
        gl.useProgram(bright)
        bindTextures(gl, [ub.uSrc], [src])
        gl.uniform2f(ub.uTexel, 1 / surface.width, 1 / surface.height)
        gl.uniform1f(ub.uThreshold, params.threshold)
        drawFullscreen(gl, vao)

        gl.useProgram(blur)
        small[1].bind()
        bindTextures(gl, [ur.uSrc], [small[0].texture])
        gl.uniform2f(ur.uStep, params.radius / w, 0)
        drawFullscreen(gl, vao)
        small[0].bind()
        bindTextures(gl, [ur.uSrc], [small[1].texture])
        gl.uniform2f(ur.uStep, 0, params.radius / h)
        drawFullscreen(gl, vao)

        out.bind()
        gl.useProgram(add)
        bindTextures(gl, [ua.uSrc, ua.uGlow], [src, small[0].texture])
        gl.uniform1f(ua.uStrength, params.strength)
        drawFullscreen(gl, vao)
        return out.texture
      },
      dispose() {
        for (const p of [bright, blur, add]) gl.deleteProgram(p)
        gl.deleteVertexArray(vao)
        for (const t of small) t.dispose()
      },
    }
  },
}
