import type { MessageKey } from '../../i18n'
import { bindTextures, drawFullscreen, program, uniforms, type Target } from '../render/gl'
import type { ParamDef, Params, Surface, VisualFrame } from '../render/visual'

export interface EffectInput {
  // The image so far.
  src: WebGLTexture
  // Free target at the output size; an effect with its own history may ignore it.
  out: Target
  params: Params
  frame: VisualFrame
  surface: Surface
}

export interface EffectInstance {
  // Returns the texture holding the result.
  render(input: EffectInput): WebGLTexture
  dispose(): void
}

export interface EffectDef {
  id: string
  label: MessageKey
  params: ParamDef[]
  create(gl: WebGL2RenderingContext): EffectInstance
}

// An effect drawn in one pass from the input to the free target. The shader reads the input
// as `uSrc`; `set` fills the other uniforms.
export function singlePass<K extends string>(
  gl: WebGL2RenderingContext,
  fs: string,
  names: readonly K[],
  set: (u: Record<K, WebGLUniformLocation | null>, input: EffectInput) => void,
  extra?: { textures: WebGLTexture[]; samplers: string[]; dispose(): void },
): EffectInstance {
  const prog = program(gl, fs)
  const u = uniforms(gl, prog, names)
  const samplers = [gl.getUniformLocation(prog, 'uSrc'), ...(extra?.samplers ?? []).map((n) => gl.getUniformLocation(prog, n))]
  const vao = gl.createVertexArray()!
  return {
    render(input) {
      input.out.bind()
      gl.useProgram(prog)
      bindTextures(gl, samplers, [input.src, ...(extra?.textures ?? [])])
      set(u, input)
      drawFullscreen(gl, vao)
      return input.out.texture
    },
    dispose() {
      gl.deleteProgram(prog)
      gl.deleteVertexArray(vao)
      extra?.dispose()
    },
  }
}

// Per-frame keep factor for a trail of time constant `seconds`.
export function keepFactor(seconds: number, dt: number): number {
  return seconds <= 0 ? 0 : Math.exp(-dt / seconds)
}

// Subtracted on each fade so 8-bit rounding cannot leave a residue that never clears.
export function fadeFloor(dt: number): number {
  return (1.5 / 255) * dt * 60
}
