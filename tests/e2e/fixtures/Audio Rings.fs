/*{
  "DESCRIPTION": "Rings from the spectrum with a feedback buffer",
  "CREDIT": "SpectraVisio test",
  "ISFVSN": "2",
  "INPUTS": [
    { "NAME": "fft", "TYPE": "audioFFT", "MAX": 128 },
    { "NAME": "decay", "LABEL": "Decay", "TYPE": "float", "MIN": 0.5, "MAX": 0.99, "DEFAULT": 0.9 },
    { "NAME": "center", "LABEL": "Center", "TYPE": "point2D", "DEFAULT": [0.5, 0.5], "MIN": [0, 0], "MAX": [1, 1] },
    { "NAME": "tint", "LABEL": "Tint", "TYPE": "color", "DEFAULT": [0.3, 0.8, 1.0, 1.0] }
  ],
  "PASSES": [
    { "TARGET": "trail", "PERSISTENT": true },
    {}
  ]
}*/

void main() {
  vec2 uv = isf_FragNormCoord;
  if (PASSINDEX == 0) {
    vec2 p = (gl_FragCoord.xy - center * RENDERSIZE) / RENDERSIZE.y;
    float r = length(p);
    float level = IMG_NORM_PIXEL(fft, vec2(clamp(r, 0.0, 1.0), 0.25)).r;
    float ring = smoothstep(0.02, 0.0, abs(fract(r * 6.0 - TIME * 0.5) - 0.5) - 0.45) * level;
    vec4 prev = IMG_NORM_PIXEL(trail, (uv - 0.5) * 0.99 + 0.5);
    gl_FragColor = max(prev * decay, vec4(tint.rgb * ring * 1.5, 1.0));
  } else {
    gl_FragColor = vec4(IMG_THIS_PIXEL(trail).rgb, 1.0);
  }
}
