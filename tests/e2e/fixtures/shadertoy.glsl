// Spectrum bars and the waveform, from Shadertoy's sound texture.
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;
  float fft = texture(iChannel0, vec2(uv.x, 0.25)).x;
  float wave = texture(iChannel0, vec2(uv.x, 0.75)).x;
  vec3 col = vec3(0.0);
  col += vec3(1.0, 0.4, 0.1) * step(uv.y, fft);
  col += vec3(0.2, 0.9, 1.0) * smoothstep(0.01, 0.0, abs(uv.y - wave));
  col *= 0.6 + 0.4 * sin(iTime + uv.x * 6.2831);
  fragColor = vec4(col, 1.0);
}
