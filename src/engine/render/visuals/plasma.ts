import { HSL_GLSL, drawFullscreen, program, uniforms } from '../gl'
import { drive, type VisualGL } from '../visual'

// The v0 field, per pixel on the GPU. Coordinates are scaled to a 1280 px wide reference so
// the pattern looks the same at any resolution.
const FS = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uPhase, uBass, uTreble, uHue, uScale, uIntensity;
out vec4 outColor;
${HSL_GLSL}
void main() {
  float k = 1280.0 / uRes.x;
  vec2 xy = gl_FragCoord.xy * k * uScale;
  vec2 c = uRes * 0.5 * k * uScale;
  float v = sin(xy.x * 0.008 + uPhase)
          + sin((xy.x + xy.y) * 0.01 + uPhase * 1.3)
          + sin(length(xy - c) * 0.012 - uPhase * 0.8);
  float n = (v + 3.0) / 6.0;
  float hue = fract((n * 180.0 + uBass * 120.0 + uTreble * 180.0 + uHue) / 360.0);
  // v0 drew it at 70-90 % alpha over black.
  float a = (180.0 + n * 50.0) / 255.0;
  outColor = vec4(hsl2rgb(hue, 0.75, 0.55) * a * uIntensity, 1.0);
}`

export const plasma: VisualGL = {
  id: 'plasma',
  label: 'visual.plasma',
  category: 'shader',
  kind: 'gl',
  params: [{ id: 'scale', label: 'param.scale', min: 0.3, max: 3, default: 1 }],
  create(gl) {
    const prog = program(gl, FS)
    const u = uniforms(gl, prog, ['uRes', 'uPhase', 'uBass', 'uTreble', 'uHue', 'uScale', 'uIntensity'] as const)
    const vao = gl.createVertexArray()!
    let phase = 0
    return {
      render(f, p, s) {
        const d = drive(f, p)
        phase += d.dt * (1.2 + d.mid * 1.8)
        gl.useProgram(prog)
        gl.uniform2f(u.uRes, s.width, s.height)
        gl.uniform1f(u.uPhase, phase)
        gl.uniform1f(u.uBass, d.bass)
        gl.uniform1f(u.uTreble, d.treble)
        gl.uniform1f(u.uHue, d.hue)
        gl.uniform1f(u.uScale, p.scale)
        gl.uniform1f(u.uIntensity, d.intensity)
        drawFullscreen(gl, vao)
      },
      dispose() {
        gl.deleteProgram(prog)
        gl.deleteVertexArray(vao)
      },
    }
  },
}
