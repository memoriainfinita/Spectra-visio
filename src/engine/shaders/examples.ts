import type { ShaderFormat } from './userVisual'

// Shaders that come with the app, to try the importer and the two formats with: the audio
// and the visual input in Shadertoy, parameters, events and a pass that keeps its image in
// ISF. Written for it, under the project's license. Added to the user's list with one click.

export interface ShaderExample {
  id: string
  name: string
  format: ShaderFormat
  source: string
}

const tunnel = `// Spectrum tunnel: rings that rush towards the viewer and glow with the bands.
// iChannel0 is the audio: row 0 (y = 0.25) the spectrum, row 1 (y = 0.75) the waveform.
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
  float r = length(uv);
  float a = atan(uv.y, uv.x);
  float side = abs(a) / 3.14159265;
  float level = texture(iChannel0, vec2(side, 0.25)).x;
  float bass = texture(iChannel0, vec2(0.04, 0.25)).x;
  float z = 0.35 / max(r, 0.001) + iTime * 0.6;
  float rings = smoothstep(0.55, 0.95, 0.5 + 0.5 * sin(z * 9.42477796));
  float spokes = 0.5 + 0.5 * cos(a * 12.0 + iTime * 0.5 + z);
  vec3 hue = 0.5 + 0.5 * cos(6.2831853 * (z * 0.08 + vec3(0.0, 0.33, 0.67)));
  float glow = rings * (0.25 + 1.5 * level) + spokes * 0.12 * level;
  vec3 col = hue * glow * smoothstep(0.0, 0.5, r);
  col += bass * 0.25 * exp(-r * 4.0) * vec3(1.0, 0.6, 0.3);
  fragColor = vec4(col, 1.0);
}
`

const split = `// Chromatic split and scanlines over the visual input, pushed outwards by the bass.
// iChannel0 is the audio, iChannel1 the visual input of the layer (black when it has none).
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;
  float bass = texture(iChannel0, vec2(0.04, 0.25)).x;
  float push = 0.004 + 0.03 * bass;
  vec2 dir = normalize(uv - 0.5 + 0.0001);
  float r = texture(iChannel1, uv + dir * push).r;
  float g = texture(iChannel1, uv).g;
  float b = texture(iChannel1, uv - dir * push).b;
  vec3 col = vec3(r, g, b);
  col *= 0.9 + 0.1 * sin(fragCoord.y * 1.5 + iTime * 6.0);
  col *= smoothstep(1.1, 0.3, length(uv - 0.5) * 1.3);
  fragColor = vec4(col, 1.0);
}
`

const stripes = `/*{
  "DESCRIPTION": "Moving stripes that widen and brighten with every kick.",
  "CREDIT": "SpectraVisio",
  "INPUTS": [
    { "NAME": "count", "LABEL": "Cantidad", "TYPE": "float", "MIN": 2, "MAX": 60, "DEFAULT": 18 },
    { "NAME": "speed", "LABEL": "Velocidad", "TYPE": "float", "MIN": -2, "MAX": 2, "DEFAULT": 0.4 },
    { "NAME": "angle", "LABEL": "Ángulo", "TYPE": "float", "MIN": 0, "MAX": 3.1416, "DEFAULT": 0.6 },
    { "NAME": "tint", "LABEL": "Color", "TYPE": "color", "DEFAULT": [0.2, 0.8, 1.0, 1.0] },
    { "NAME": "kick", "LABEL": "Golpe", "TYPE": "event" }
  ],
  "PASSES": [
    { "TARGET": "pulse", "PERSISTENT": true, "FLOAT": true, "WIDTH": 1, "HEIGHT": 1 },
    {}
  ]
}*/
void main() {
  if (PASSINDEX == 0) {
    // One pixel that jumps to 1 on each kick and falls back.
    float prev = IMG_NORM_PIXEL(pulse, vec2(0.5)).r;
    float v = kick ? 1.0 : prev * exp(-6.0 * TIMEDELTA);
    gl_FragColor = vec4(v, v, v, 1.0);
    return;
  }
  vec2 p = isf_FragNormCoord - 0.5;
  p.x *= RENDERSIZE.x / RENDERSIZE.y;
  float u = p.x * cos(angle) + p.y * sin(angle);
  float flash = IMG_NORM_PIXEL(pulse, vec2(0.5)).r;
  float f = fract(u * count + TIME * speed);
  float w = 0.25 + 0.2 * flash;
  float line = smoothstep(0.5 - w, 0.55 - w, f) * (1.0 - smoothstep(0.45 + w, 0.5 + w, f));
  gl_FragColor = vec4(tint.rgb * line * (0.6 + 0.8 * flash), 1.0);
}
`

const flow = `/*{
  "DESCRIPTION": "Warped noise that flows, with the bass pushing it.",
  "CREDIT": "SpectraVisio",
  "INPUTS": [
    { "NAME": "zoom", "LABEL": "Zoom", "TYPE": "float", "MIN": 0.5, "MAX": 6.0, "DEFAULT": 2.5 },
    { "NAME": "flow", "LABEL": "Flujo", "TYPE": "float", "MIN": 0.0, "MAX": 2.0, "DEFAULT": 0.5 },
    { "NAME": "palette", "LABEL": "Paleta", "TYPE": "long", "VALUES": [0, 1, 2], "LABELS": ["Fuego", "Océano", "Neón"], "DEFAULT": 2 },
    { "NAME": "audio", "LABEL": "Audio", "TYPE": "audioFFT", "MAX": 64 }
  ]
}*/
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.0 + vec2(7.3, 1.7);
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = isf_FragNormCoord - 0.5;
  uv.x *= RENDERSIZE.x / RENDERSIZE.y;
  float bass = IMG_NORM_PIXEL(audio, vec2(0.04, 0.25)).r;
  float t = TIME * flow;
  vec2 p = uv * zoom;
  vec2 q = vec2(fbm(p + vec2(0.0, t)), fbm(p + vec2(5.2, 1.3 - t)));
  float n = fbm(p + 2.0 * q + bass * 1.5);
  vec3 phase = palette == 0 ? vec3(0.0, 0.1, 0.2) : (palette == 1 ? vec3(0.5, 0.6, 0.7) : vec3(0.0, 0.33, 0.67));
  vec3 col = 0.5 + 0.5 * cos(6.2831853 * (n + phase));
  col *= smoothstep(0.1, 0.9, n) * (0.8 + bass);
  gl_FragColor = vec4(col, 1.0);
}
`

export const SHADER_EXAMPLES: readonly ShaderExample[] = [
  { id: 'tunnel', name: 'Túnel de espectro', format: 'shadertoy', source: tunnel },
  { id: 'split', name: 'Aberración sobre la entrada', format: 'shadertoy', source: split },
  { id: 'stripes', name: 'Rayas al golpe', format: 'isf', source: stripes },
  { id: 'flow', name: 'Flujo de ruido', format: 'isf', source: flow },
]
