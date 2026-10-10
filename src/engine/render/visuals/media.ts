import { HUE_GLSL } from '../gl'
import { ShaderPass } from '../shader'
import { drive, type VisualGL } from '../visual'
import { FIT_GLSL, InputTexture } from '../visualInput'

// The visual input (camera, video or image) as a visualization, framed to the output and
// pushed in a little on each kick.
const FS = `
uniform sampler2D uInput;
uniform vec2 uSrc;
uniform float uCover, uFlip, uZoom, uPulse;
${FIT_GLSL}
${HUE_GLSL}
void main() {
  vec2 c = 0.5 * uRes;
  float z = uZoom * (1.0 + uPulse * uBeat * 0.08);
  vec2 uv = fitUv((gl_FragCoord.xy - c) / z + c, uRes, uSrc, uCover, uFlip);
  vec3 col = texture(uInput, uv).rgb * inside(uv);
  outColor = vec4(clamp(hueRotate(col, uHue * 6.2831853), 0.0, 1.0) * uIntensity, 1.0);
}`

export const FIT_OPTIONS = ['fit.cover', 'fit.contain'] as const
export const FLIP_OPTIONS = ['flip.none', 'flip.horizontal'] as const

export const media: VisualGL = {
  id: 'media',
  label: 'visual.media',
  category: 'media',
  kind: 'gl',
  params: [
    { id: 'fit', label: 'param.fit', min: 0, max: 1, default: 0, int: true, options: [...FIT_OPTIONS] },
    { id: 'flip', label: 'param.flip', min: 0, max: 1, default: 0, int: true, options: [...FLIP_OPTIONS] },
    { id: 'zoom', label: 'param.zoom', min: 1, max: 3, default: 1 },
    { id: 'pulse', label: 'param.pulse', min: 0, max: 2, default: 1 },
  ],
  create(gl) {
    const pass = new ShaderPass(gl, FS, ['uInput', 'uSrc', 'uCover', 'uFlip', 'uZoom', 'uPulse'] as const)
    const input = new InputTexture(gl)
    let t = 0
    return {
      render(f, p, s) {
        const d = drive(f, p)
        t += d.dt
        pass.use(s, d, t, f.dt)
        gl.activeTexture(gl.TEXTURE1)
        input.update()
        gl.activeTexture(gl.TEXTURE0)
        gl.uniform1i(pass.u.uInput, 1)
        gl.uniform2f(pass.u.uSrc, input.width, input.height)
        gl.uniform1f(pass.u.uCover, p.fit === 0 ? 1 : 0)
        gl.uniform1f(pass.u.uFlip, p.flip)
        gl.uniform1f(pass.u.uZoom, p.zoom)
        gl.uniform1f(pass.u.uPulse, p.pulse)
        pass.draw()
      },
      dispose() {
        pass.dispose()
        input.dispose()
      },
    }
  },
}
