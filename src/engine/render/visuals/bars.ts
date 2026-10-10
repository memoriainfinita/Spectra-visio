import { ShaderPass } from '../shader'
import { drive, type Drive, type VisualGL } from '../visual'

export const MAX_BARS = 128
// Share of the full height a peak cap falls per second.
const PEAK_FALL = 0.6

// Level of each bar: the mean of the spectrum across its span. Peaks hold the highest level
// and fall back slowly.
function measure(d: Drive, count: number, levels: Float32Array, peaks: Float32Array, dt: number): void {
  for (let i = 0; i < count; i++) {
    let sum = 0
    for (let k = 0; k < 4; k++) sum += d.spectrum((i + (k + 0.5) / 4) / count)
    levels[i] = sum / 4
    peaks[i] = Math.max(levels[i], peaks[i] - PEAK_FALL * dt)
  }
}

// Spectrum bars from the bottom, or mirrored from the centre line.
const BARS_FS = `
uniform float uLevels[${MAX_BARS}], uPeaks[${MAX_BARS}];
uniform float uCount, uGap, uMirror;
void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float x = uv.x * uCount;
  int i = int(min(floor(x), uCount - 1.0));
  float fx = fract(x);
  float inBar = step(uGap * 0.5, fx) * step(fx, 1.0 - uGap * 0.5);
  float y = uMirror > 0.5 ? abs(uv.y - 0.5) * 2.0 : uv.y;
  float px = (uMirror > 0.5 ? 2.0 : 1.0) / uRes.y;
  float h = uLevels[i] * 0.92;
  float p = uPeaks[i] * 0.92 + 2.0 * px;
  float body = inBar * step(y, h);
  float cap = inBar * step(p, y) * step(y, p + 3.0 * px);
  float hue = fract(uHue + 0.62 - float(i) / uCount * 0.55);
  vec3 col = hsl2rgb(hue, 0.85, 0.3 + 0.35 * y + 0.15 * uBeat);
  outColor = vec4((col * body + vec3(0.92) * cap) * uIntensity, 1.0);
}`

export const bars: VisualGL = {
  id: 'bars',
  label: 'visual.bars',
  category: 'spectrum',
  kind: 'gl',
  params: [
    { id: 'bars', label: 'param.bars', min: 8, max: MAX_BARS, default: 48, int: true },
    { id: 'gap', label: 'param.gap', min: 0, max: 0.8, default: 0.25 },
    { id: 'layout', label: 'param.layout', min: 0, max: 1, default: 0, int: true, options: ['layout.bottom', 'layout.mirror'] },
  ],
  create(gl) {
    const pass = new ShaderPass(gl, BARS_FS, ['uLevels', 'uPeaks', 'uCount', 'uGap', 'uMirror'] as const)
    const levels = new Float32Array(MAX_BARS)
    const peaks = new Float32Array(MAX_BARS)
    let t = 0
    return {
      render(f, p, s) {
        const d = drive(f, p)
        t += d.dt
        measure(d, p.bars, levels, peaks, f.dt)
        pass.use(s, d, t, f.dt)
        gl.uniform1fv(pass.u.uLevels, levels)
        gl.uniform1fv(pass.u.uPeaks, peaks)
        gl.uniform1f(pass.u.uCount, p.bars)
        gl.uniform1f(pass.u.uGap, p.gap)
        gl.uniform1f(pass.u.uMirror, p.layout)
        pass.draw()
      },
      dispose: () => pass.dispose(),
    }
  },
}

// Bars around a ring, low frequencies at the right and mirrored top and bottom.
const RADIAL_FS = `
uniform float uLevels[${MAX_BARS}];
uniform float uCount, uRot, uRadius;
void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / min(uRes.x, uRes.y);
  float r = length(p);
  float a = fract((atan(p.y, p.x) + uRot) / 6.2831853);
  float x = abs(a * 2.0 - 1.0) * uCount;
  int i = int(min(floor(x), uCount - 1.0));
  float fx = fract(x);
  float inner = uRadius * (1.0 + 0.25 * uBass);
  float h = uLevels[i] * 0.26;
  float width = mix(0.5, 0.75, step(32.0, uCount));
  float inBar = step(0.5 - width * 0.5, fx) * step(fx, 0.5 + width * 0.5);
  float body = inBar * step(inner, r) * step(r, inner + h + 0.004);
  float ring = smoothstep(0.006, 0.0, abs(r - inner + 0.012));
  float core = smoothstep(inner, 0.0, r) * (0.08 + 0.3 * uBeat);
  float hue = fract(uHue + 0.55 + float(i) / uCount * 0.4);
  vec3 col = hsl2rgb(hue, 0.9, 0.45 + 0.3 * (r - inner) / 0.26);
  vec3 c = col * body + hsl2rgb(hue, 0.8, 0.7) * (ring + core);
  outColor = vec4(c * uIntensity, 1.0);
}`

export const radialBars: VisualGL = {
  id: 'radialBars',
  label: 'visual.radialBars',
  category: 'spectrum',
  kind: 'gl',
  params: [
    { id: 'bars', label: 'param.bars', min: 8, max: MAX_BARS, default: 64, int: true },
    { id: 'radius', label: 'param.radius', min: 0.05, max: 0.4, default: 0.2 },
    { id: 'rotation', label: 'param.rotation', min: -1, max: 1, default: 0.1 },
  ],
  create(gl) {
    const pass = new ShaderPass(gl, RADIAL_FS, ['uLevels', 'uCount', 'uRot', 'uRadius'] as const)
    const levels = new Float32Array(MAX_BARS)
    const peaks = new Float32Array(MAX_BARS)
    let t = 0
    let rot = 0
    return {
      render(f, p, s) {
        const d = drive(f, p)
        t += d.dt
        rot += d.dt * p.rotation * (1 + d.energy)
        measure(d, p.bars, levels, peaks, f.dt)
        pass.use(s, d, t, f.dt)
        gl.uniform1fv(pass.u.uLevels, levels)
        gl.uniform1f(pass.u.uCount, p.bars)
        gl.uniform1f(pass.u.uRot, rot)
        gl.uniform1f(pass.u.uRadius, p.radius)
        pass.draw()
      },
      dispose: () => pass.dispose(),
    }
  },
}
