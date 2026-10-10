import { ShaderPass } from '../shader'
import { drive, type VisualGL } from '../visual'

// Julia set whose constant circles near the edge of the Mandelbrot set; the bass pushes it
// along, so the shape shifts with the music. Smooth colouring by escape time.
const JULIA_FS = `
uniform vec2 uC;
uniform float uZoom, uIter;
void main() {
  vec2 z = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y * 2.6 / uZoom;
  float n = 0.0;
  float m = 0.0;
  for (float i = 0.0; i < 200.0; i++) {
    if (i >= uIter) break;
    z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + uC;
    m = dot(z, z);
    if (m > 256.0) break;
    n++;
  }
  if (n >= uIter) { outColor = vec4(0.0, 0.0, 0.0, 1.0); return; }
  float sn = (n - log2(log2(m)) + 4.0) / uIter;
  float hue = fract(uHue + 0.6 + sn * 1.5 + uTime * 0.02);
  vec3 c = hsl2rgb(hue, 0.85, clamp(sqrt(sn) * (0.7 + 0.3 * uBeat), 0.0, 0.7));
  outColor = vec4(c * uIntensity, 1.0);
}`

export const julia: VisualGL = {
  id: 'julia',
  label: 'visual.julia',
  category: 'fractal',
  kind: 'gl',
  params: [
    { id: 'zoom', label: 'param.zoom', min: 0.5, max: 4, default: 1 },
    { id: 'depth', label: 'param.depth', min: 32, max: 200, default: 96, int: true },
  ],
  create(gl) {
    const pass = new ShaderPass(gl, JULIA_FS, ['uC', 'uZoom', 'uIter'] as const)
    let t = 0
    let a = 0
    return {
      render(f, p, s) {
        const d = drive(f, p)
        t += d.dt
        a += d.dt * (0.12 + d.bass * 0.5)
        // The main cardioid's edge, slightly outside: the shapes there are connected and rich.
        const r = 0.7885 + d.mid * 0.02
        pass.use(s, d, t, f.dt)
        gl.uniform2f(pass.u.uC, r * Math.cos(a), r * Math.sin(a))
        gl.uniform1f(pass.u.uZoom, p.zoom * (1 + d.bass * 0.08))
        gl.uniform1f(pass.u.uIter, p.depth)
        pass.draw()
      },
      dispose: () => pass.dispose(),
    }
  },
}

// Kaleidoscopic iterated function system: fold, shift, turn and scale, over and over. The
// glow is how close each point's orbit comes to a line; the spectrum moves the folds.
const KIFS_FS = `
uniform float uIter, uAngle, uOffset;
mat2 rot(float a) { float s = sin(a), c = cos(a); return mat2(c, -s, s, c); }
void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y * 2.2;
  float scale = 1.0;
  float trap = 1e3;
  float trapI = 0.0;
  for (float i = 0.0; i < 14.0; i++) {
    if (i >= uIter) break;
    p = abs(p) - uOffset * (0.5 + 0.3 * spectrum(i / uIter));
    p = rot(uAngle + i * 0.1) * p;
    p *= 1.35;
    scale *= 1.35;
    float d = abs(p.y) / scale;
    if (d < trap) { trap = d; trapI = i; }
  }
  float glow = exp(-trap * 180.0) + 0.25 * exp(-trap * 25.0);
  float hue = fract(uHue + 0.5 + trapI / uIter * 0.6);
  vec3 c = hsl2rgb(hue, 0.85, 0.5) * glow * (0.8 + 0.6 * uBeat);
  outColor = vec4(min(c, 1.0) * uIntensity, 1.0);
}`

export const kifs: VisualGL = {
  id: 'kifs',
  label: 'visual.kifs',
  category: 'fractal',
  kind: 'gl',
  params: [
    { id: 'depth', label: 'param.depth', min: 3, max: 14, default: 9, int: true },
    { id: 'offset', label: 'param.offset', min: 0.2, max: 1.5, default: 0.8 },
  ],
  create(gl) {
    const pass = new ShaderPass(gl, KIFS_FS, ['uIter', 'uAngle', 'uOffset'] as const)
    let t = 0
    let angle = 0
    return {
      render(f, p, s) {
        const d = drive(f, p)
        t += d.dt
        angle += d.dt * (0.1 + d.mid * 0.4)
        pass.use(s, d, t, f.dt)
        gl.uniform1f(pass.u.uIter, p.depth)
        gl.uniform1f(pass.u.uAngle, angle)
        gl.uniform1f(pass.u.uOffset, p.offset)
        pass.draw()
      },
      dispose: () => pass.dispose(),
    }
  },
}
