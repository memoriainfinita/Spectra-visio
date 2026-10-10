import { Target, bindTextures, drawFullscreen, program, uniforms } from '../../render/gl'
import { fadeFloor, keepFactor, type EffectDef } from '../effect'

// Each frame keeps the brighter of the new image and the faded previous one.
const FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uSrc, uPrev;
uniform float uKeep, uFloor;
out vec4 outColor;
void main() {
  vec3 s = texture(uSrc, vUv).rgb;
  vec3 p = texture(uPrev, vUv).rgb * uKeep - uFloor;
  outColor = vec4(max(s, p), 1.0);
}`

export const trails: EffectDef = {
  id: 'trails',
  label: 'effect.trails',
  params: [{ id: 'length', label: 'param.length', min: 0.05, max: 3, default: 0.5 }],
  create(gl) {
    const prog = program(gl, FS)
    const u = uniforms(gl, prog, ['uSrc', 'uPrev', 'uKeep', 'uFloor'] as const)
    const vao = gl.createVertexArray()!
    const history = [new Target(gl), new Target(gl)]
    let cur = 0
    return {
      render({ src, params, frame, surface }) {
        for (const h of history) h.size(surface.width, surface.height)
        const prev = history[cur]
        cur ^= 1
        const next = history[cur]
        next.bind()
        gl.useProgram(prog)
        bindTextures(gl, [u.uSrc, u.uPrev], [src, prev.texture])
        gl.uniform1f(u.uKeep, keepFactor(params.length, frame.dt))
        gl.uniform1f(u.uFloor, fadeFloor(frame.dt))
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
