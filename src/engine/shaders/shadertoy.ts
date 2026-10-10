import { SOURCE_MAX, ShaderError } from './isf'

// Pasted Shadertoy code: a single image pass with `mainImage` and the usual uniforms.
// iChannel0 is the audio as Shadertoy gives it (512 × 2: spectrum row, then waveform),
// iChannel1 the visual input, iChannel2 and iChannel3 black. Buffers are not supported.

export const isShadertoy = (source: string) => /\bvoid\s+mainImage\s*\(/.test(source)

export function checkShadertoy(source: string): void {
  if (source.length > SOURCE_MAX) throw new ShaderError('tooLong')
  if (!isShadertoy(source)) throw new ShaderError('noMain')
}

export function shadertoyFragment(code: string): string {
  return `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
uniform vec3 iResolution;
uniform float iTime;
uniform float iTimeDelta;
uniform float iFrameRate;
uniform int iFrame;
uniform vec4 iMouse;
uniform vec4 iDate;
uniform float iSampleRate;
uniform float iChannelTime[4];
uniform vec3 iChannelResolution[4];
uniform sampler2D iChannel0;
uniform sampler2D iChannel1;
uniform sampler2D iChannel2;
uniform sampler2D iChannel3;
out vec4 shadertoy_out;
${code.replace(/^[ \t]*#version[^\n]*\n?/gm, '')}
void main() {
  vec4 c = vec4(0.0, 0.0, 0.0, 1.0);
  mainImage(c, gl_FragCoord.xy);
  shadertoy_out = vec4(c.rgb, 1.0);
}`
}
