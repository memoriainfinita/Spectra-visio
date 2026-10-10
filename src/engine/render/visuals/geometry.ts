import { ShaderPass } from '../shader'
import { drive, type VisualGL } from '../visual'

// Nested regular polygons turning in alternate directions; each ring follows its own part
// of the spectrum in size and glow.
const POLYGONS_FS = `
uniform float uSides, uRings;
float poly(vec2 p, float n) {
  float a = atan(p.x, p.y) + 3.14159265;
  float b = 6.2831853 / n;
  return cos(floor(0.5 + a / b) * b - a) * length(p);
}
mat2 rot(float a) { float s = sin(a), c = cos(a); return mat2(c, -s, s, c); }
void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / min(uRes.x, uRes.y);
  float px = 1.5 / min(uRes.x, uRes.y);
  vec3 c = vec3(0.0);
  for (float k = 0.0; k < 12.0; k++) {
    if (k >= uRings) break;
    float band = spectrum(k / max(1.0, uRings - 1.0));
    float dir = mod(k, 2.0) < 1.0 ? 1.0 : -1.0;
    vec2 q = rot(uTime * (0.15 + 0.07 * k) * dir) * p;
    float r = 0.05 + k * 0.042 * (1.0 + 0.25 * band + 0.1 * uBeat);
    float d = abs(poly(q, uSides) - r);
    float w = px * (1.0 + 3.0 * band);
    float line = smoothstep(w + px, w, d) + 0.35 * exp(-d * 60.0) * band;
    c += hsl2rgb(fract(uHue + 0.5 + k * 0.06 + band * 0.2), 0.85, 0.55) * line;
  }
  outColor = vec4(min(c, 1.0) * uIntensity, 1.0);
}`

export const polygons: VisualGL = {
  id: 'polygons',
  label: 'visual.polygons',
  category: 'geometric',
  kind: 'gl',
  params: [
    { id: 'sides', label: 'param.sides', min: 3, max: 12, default: 6, int: true },
    { id: 'rings', label: 'param.rings', min: 2, max: 12, default: 9, int: true },
  ],
  create(gl) {
    const pass = new ShaderPass(gl, POLYGONS_FS, ['uSides', 'uRings'] as const)
    let t = 0
    return {
      render(f, p, s) {
        const d = drive(f, p)
        t += d.dt * (1 + d.mid * 2)
        pass.use(s, d, t, f.dt)
        gl.uniform1f(pass.u.uSides, p.sides)
        gl.uniform1f(pass.u.uRings, p.rings)
        pass.draw()
      },
      dispose: () => pass.dispose(),
    }
  },
}

// Cells around drifting points: each cell lights with its own frequency, the borders glow
// and the kick brightens them.
const CELLS_FS = `
uniform float uScale;
vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453);
}
void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y * uScale;
  vec2 g = floor(uv);
  vec2 f = fract(uv);
  float d1 = 8.0, d2 = 8.0;
  vec2 id = vec2(0.0);
  for (int j = -1; j <= 1; j++)
  for (int i = -1; i <= 1; i++) {
    vec2 o = vec2(float(i), float(j));
    vec2 h = hash2(g + o);
    vec2 pt = o + 0.5 + 0.4 * sin(uTime * 0.8 + 6.2831853 * h);
    float d = length(pt - f);
    if (d < d1) { d2 = d1; d1 = d; id = g + o; }
    else if (d < d2) d2 = d;
  }
  float h = hash2(id).x;
  float band = spectrum(h);
  float border = smoothstep(0.06 + 0.04 * uBeat, 0.0, d2 - d1);
  float hue = fract(uHue + 0.5 + h * 0.3 + band * 0.2);
  vec3 c = hsl2rgb(hue, 0.75, 0.08 + 0.45 * band) * (1.0 - d1 * 0.6) + hsl2rgb(hue, 0.9, 0.7) * border * (0.4 + uBeat * 0.6);
  outColor = vec4(c * uIntensity, 1.0);
}`

export const cells: VisualGL = {
  id: 'cells',
  label: 'visual.cells',
  category: 'geometric',
  kind: 'gl',
  params: [{ id: 'scale', label: 'param.scale', min: 2, max: 16, default: 6 }],
  create(gl) {
    const pass = new ShaderPass(gl, CELLS_FS, ['uScale'] as const)
    let t = 0
    return {
      render(f, p, s) {
        const d = drive(f, p)
        t += d.dt * (0.6 + d.energy * 2)
        pass.use(s, d, t, f.dt)
        gl.uniform1f(pass.u.uScale, p.scale)
        pass.draw()
      },
      dispose: () => pass.dispose(),
    }
  },
}
