import { HUE_GLSL, Target, bindTextures, drawFullscreen, program, uniforms } from '../../render/gl'
import { fadeFloor, keepFactor, type EffectDef } from '../effect'

// The previous output, zoomed, rotated and hue-shifted, fades under the new image.
const FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uSrc, uPrev;
uniform float uKeep, uFloor, uScale, uAngle, uHue, uAspect;
out vec4 outColor;
${HUE_GLSL}
void main() {
  vec2 c = vUv - 0.5;
  c.x *= uAspect;
  float s = sin(uAngle), k = cos(uAngle);
  c = vec2(c.x * k - c.y * s, c.x * s + c.y * k) / uScale;
  c.x /= uAspect;
  vec2 uv = c + 0.5;
  vec3 p = vec3(0.0);
  if (uv.x >= 0.0 && uv.x <= 1.0 && uv.y >= 0.0 && uv.y <= 1.0) p = texture(uPrev, uv).rgb;
  p = clamp(hueRotate(p, uHue), 0.0, 1.0) * uKeep - uFloor;
  outColor = vec4(max(texture(uSrc, vUv).rgb, p), 1.0);
}`

const DEG = Math.PI / 180

export const feedback: EffectDef = {
  id: 'feedback',
  label: 'effect.feedback',
  params: [
    { id: 'length', label: 'param.length', min: 0.05, max: 3, default: 0.8 },
    // Growth per second: 0.5 is about 65 % larger each second.
    { id: 'zoom', label: 'param.zoom', min: -1, max: 1, default: 0.3 },
    { id: 'rotation', label: 'param.rotation', min: -180, max: 180, default: 20 },
    { id: 'hueShift', label: 'param.hueShift', min: -180, max: 180, default: 0 },
  ],
  create(gl) {
    const prog = program(gl, FS)
    const u = uniforms(gl, prog, ['uSrc', 'uPrev', 'uKeep', 'uFloor', 'uScale', 'uAngle', 'uHue', 'uAspect'] as const)
    const vao = gl.createVertexArray()!
    const history = [new Target(gl), new Target(gl)]
    let cur = 0
    return {
      render({ src, params, frame, surface }) {
        for (const h of history) h.size(surface.width, surface.height)
        const prev = history[cur]
        cur ^= 1
        const next = history[cur]
        const dt = frame.dt
        next.bind()
        gl.useProgram(prog)
        bindTextures(gl, [u.uSrc, u.uPrev], [src, prev.texture])
        gl.uniform1f(u.uKeep, keepFactor(params.length, dt))
        gl.uniform1f(u.uFloor, fadeFloor(dt))
        gl.uniform1f(u.uScale, Math.exp(params.zoom * dt))
        gl.uniform1f(u.uAngle, params.rotation * DEG * dt)
        gl.uniform1f(u.uHue, params.hueShift * DEG * dt)
        gl.uniform1f(u.uAspect, surface.width / surface.height)
        drawFullscreen(gl, vao)
        return next.texture
      },
      dispose() {
        gl.deleteProgram(prog)
        gl.deleteVertexArray(vao)
        for (const h of history) h.dispose()
      },
    }
  },
}
