import { AUDIO_SIZE, ShaderPass } from '../shader'
import { drive, type VisualGL } from '../visual'

// Rows of history: at 60 rows a second, a bit over 4 s on screen.
const HISTORY = 256
const ROWS_PER_S = 60

// Waterfall: the newest spectrum at the top, older ones falling down. The history is a
// ring of rows in a texture; only the newest row is written each step.
const FS = `
uniform sampler2D uHistory;
uniform float uHead, uGain;
vec3 heat(float v) {
  return hsl2rgb(fract(uHue + 0.7 - 0.7 * v), 0.9, min(0.6, v * 0.75));
}
void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float age = 1.0 - uv.y;
  float v = texture(uHistory, vec2(uv.x, (uHead + 0.5 - age * ${HISTORY - 1}.0) / ${HISTORY}.0)).r;
  v = clamp(v * uGain, 0.0, 1.0);
  outColor = vec4(heat(v) * uIntensity, 1.0);
}`

export const spectrogram: VisualGL = {
  id: 'spectrogram',
  label: 'visual.spectrogram',
  category: 'spectrum',
  kind: 'gl',
  params: [{ id: 'gain', label: 'param.gain', min: 0.2, max: 3, default: 1.2 }],
  create(gl) {
    const pass = new ShaderPass(gl, FS, ['uHistory', 'uHead', 'uGain'] as const)
    const history = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, history)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, AUDIO_SIZE, HISTORY, 0, gl.RED, gl.UNSIGNED_BYTE, new Uint8Array(AUDIO_SIZE * HISTORY))
    const row = new Uint8Array(AUDIO_SIZE)
    let head = 0
    let due = 0
    let t = 0
    return {
      render(f, p, s) {
        const d = drive(f, p)
        t += d.dt
        // Rows follow the speed parameter; at most a few per frame after a stall.
        due = Math.min(4, due + d.dt * ROWS_PER_S)
        gl.activeTexture(gl.TEXTURE1)
        gl.bindTexture(gl.TEXTURE_2D, history)
        if (due >= 1) for (let i = 0; i < AUDIO_SIZE; i++) row[i] = d.spectrum(i / (AUDIO_SIZE - 1)) * 255
        while (due >= 1) {
          due -= 1
          head = (head + 1) % HISTORY
          gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, head, AUDIO_SIZE, 1, gl.RED, gl.UNSIGNED_BYTE, row)
        }
        pass.use(s, d, t, f.dt)
        gl.activeTexture(gl.TEXTURE1)
        gl.bindTexture(gl.TEXTURE_2D, history)
        gl.activeTexture(gl.TEXTURE0)
        gl.uniform1i(pass.u.uHistory, 1)
        gl.uniform1f(pass.u.uHead, head)
        gl.uniform1f(pass.u.uGain, p.gain)
        pass.draw()
      },
      dispose() {
        pass.dispose()
        gl.deleteTexture(history)
      },
    }
  },
}
