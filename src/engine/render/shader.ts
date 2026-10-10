import { HSL_GLSL, drawFullscreen, program, uniforms } from './gl'
import type { Drive, Surface } from './visual'

// Samples of spectrum and waveform handed to the shader visualizations.
export const AUDIO_SIZE = 512

// Shared by the shader visualizations: frame uniforms, the audio texture (row 0 the log
// spectrum 0–1, row 1 the waveform) and the HSL helper.
export const SHADER_PRELUDE = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uTime, uBass, uMid, uTreble, uEnergy, uBeat, uHue, uIntensity;
uniform sampler2D uAudio;
out vec4 outColor;
float spectrum(float x) { return texture(uAudio, vec2(x, 0.25)).r; }
float wave(float x) { return texture(uAudio, vec2(x, 0.75)).r * 2.0 - 1.0; }
${HSL_GLSL}
`

const COMMON = ['uRes', 'uTime', 'uBass', 'uMid', 'uTreble', 'uEnergy', 'uBeat', 'uHue', 'uIntensity', 'uAudio'] as const

// A fullscreen fragment shader fed with the frame's audio. `use` binds it and sets the
// common uniforms; the caller sets its own through `u`, then calls `draw`.
export class ShaderPass<K extends string = never> {
  readonly u: Record<K, WebGLUniformLocation | null>
  private readonly gl: WebGL2RenderingContext
  private readonly prog: WebGLProgram
  private readonly common: Record<(typeof COMMON)[number], WebGLUniformLocation | null>
  private readonly vao: WebGLVertexArrayObject
  private readonly audio: WebGLTexture
  private readonly data = new Uint8Array(AUDIO_SIZE * 2)
  // Kick envelope, 1 on the kick and decaying.
  private beat = 0

  constructor(gl: WebGL2RenderingContext, body: string, names: readonly K[] = []) {
    this.gl = gl
    this.prog = program(gl, SHADER_PRELUDE + body)
    this.common = uniforms(gl, this.prog, COMMON)
    this.u = uniforms(gl, this.prog, names)
    this.vao = gl.createVertexArray()!
    this.audio = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, this.audio)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, AUDIO_SIZE, 2, 0, gl.RED, gl.UNSIGNED_BYTE, null)
  }

  // `time` is the visualization's own clock; `dt` the real frame time, for the beat decay.
  use(s: Surface, d: Drive, time: number, dt: number): void {
    const gl = this.gl
    const n = AUDIO_SIZE
    for (let i = 0; i < n; i++) {
      this.data[i] = d.spectrum(i / (n - 1)) * 255
      this.data[n + i] = (d.wave(i / (n - 1)) * 0.5 + 0.5) * 255
    }
    this.beat = d.beat ? 1 : this.beat * Math.exp(-dt * 8)
    gl.useProgram(this.prog)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.audio)
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, n, 2, gl.RED, gl.UNSIGNED_BYTE, this.data)
    const u = this.common
    gl.uniform1i(u.uAudio, 0)
    gl.uniform2f(u.uRes, s.width, s.height)
    gl.uniform1f(u.uTime, time)
    gl.uniform1f(u.uBass, d.bass)
    gl.uniform1f(u.uMid, d.mid)
    gl.uniform1f(u.uTreble, d.treble)
    gl.uniform1f(u.uEnergy, d.energy)
    gl.uniform1f(u.uBeat, this.beat)
    gl.uniform1f(u.uHue, d.hue / 360)
    gl.uniform1f(u.uIntensity, d.intensity)
  }

  draw(): void {
    drawFullscreen(this.gl, this.vao)
  }

  dispose(): void {
    this.gl.deleteProgram(this.prog)
    this.gl.deleteVertexArray(this.vao)
    this.gl.deleteTexture(this.audio)
  }
}
