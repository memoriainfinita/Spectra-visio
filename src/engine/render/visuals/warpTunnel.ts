import { ShaderPass } from '../shader'
import { drive, type VisualGL } from '../visual'

// Flight down a tiled tube: depth is 1/r on the screen. Each angle glows with its part of
// the spectrum, the tiles flash on the kick and the far end fades into fog.
const FS = `
uniform float uDepth, uTwist, uTiles;
void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  float r = max(length(p), 1e-3);
  float z = 0.6 / r;
  float a = atan(p.y, p.x) / 6.2831853 + uTwist * z * 0.05 + uTime * 0.03;
  vec2 tile = vec2(a * uTiles, z + uDepth);
  vec2 cell = floor(tile);
  vec2 f = fract(tile);
  float check = mod(cell.x + cell.y, 2.0);
  float band = spectrum(abs(fract(a) * 2.0 - 1.0));
  float border = 1.0 - smoothstep(0.0, 0.06, min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y)));
  float fog = smoothstep(0.0, 0.45, r);
  float fill = 0.03 + 0.22 * band * (0.4 + 0.6 * check) + 0.2 * check * uBeat;
  float lum = mix(fill, 0.25 + 0.45 * band, border);
  float hue = fract(uHue + 0.55 + z * 0.02 + band * 0.25);
  vec3 c = hsl2rgb(hue, 0.85, clamp(lum, 0.0, 0.7)) * fog;
  outColor = vec4(c * uIntensity, 1.0);
}`

export const warpTunnel: VisualGL = {
  id: 'warpTunnel',
  label: 'visual.warpTunnel',
  category: 'space',
  kind: 'gl',
  params: [
    { id: 'tiles', label: 'param.segments', min: 4, max: 32, default: 12, int: true },
    { id: 'twist', label: 'param.twist', min: -4, max: 4, default: 1 },
  ],
  create(gl) {
    const pass = new ShaderPass(gl, FS, ['uDepth', 'uTwist', 'uTiles'] as const)
    let t = 0
    let depth = 0
    return {
      render(f, p, s) {
        const d = drive(f, p)
        t += d.dt
        depth += d.dt * (1.5 + d.energy * 5)
        pass.use(s, d, t, f.dt)
        gl.uniform1f(pass.u.uDepth, depth)
        gl.uniform1f(pass.u.uTwist, p.twist)
        gl.uniform1f(pass.u.uTiles, p.tiles)
        pass.draw()
      },
      dispose: () => pass.dispose(),
    }
  },
}
