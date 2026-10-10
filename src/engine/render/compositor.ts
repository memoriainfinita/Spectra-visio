import type { BlendMode } from '../scene/scene'
import { BLEND_MODES } from '../scene/scene'
import { drawFullscreen, program, uniforms, type Target } from './gl'
import type { Params, Surface, VisualDef, VisualFrame, VisualInstance } from './visual'

// One visualization drawn into a texture. Canvas 2D ones draw on a hidden canvas that is
// uploaded each frame; WebGL ones render straight into the texture through a framebuffer.
export class Layer {
  readonly visualId: string
  readonly texture: WebGLTexture
  private readonly gl: WebGL2RenderingContext
  private readonly instance: VisualInstance
  private readonly canvas: HTMLCanvasElement | null = null
  private readonly ctx: CanvasRenderingContext2D | null = null
  private readonly fbo: WebGLFramebuffer | null = null
  private width = 0
  private height = 0

  constructor(gl: WebGL2RenderingContext, def: VisualDef) {
    this.gl = gl
    this.visualId = def.id
    this.texture = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, this.texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    if (def.kind === '2d') {
      this.canvas = document.createElement('canvas')
      this.ctx = this.canvas.getContext('2d', { alpha: false })!
      this.instance = def.create(this.ctx)
    } else {
      this.fbo = gl.createFramebuffer()
      this.instance = def.create(gl)
    }
  }

  render(frame: VisualFrame, params: Params, s: Surface): void {
    const gl = this.gl
    if (s.width !== this.width || s.height !== this.height) this.resize(s)
    if (this.ctx && this.canvas) {
      // Visualizations change transforms, composite modes and shadows: isolate them.
      this.ctx.save()
      this.instance.render(frame, params, s)
      this.ctx.restore()
      gl.bindTexture(gl.TEXTURE_2D, this.texture)
      // Canvas rows run top-down, GL textures bottom-up.
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.canvas)
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo)
      gl.viewport(0, 0, s.width, s.height)
      this.instance.render(frame, params, s)
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    }
  }

  dispose(): void {
    this.instance.dispose?.()
    this.gl.deleteTexture(this.texture)
    if (this.fbo) this.gl.deleteFramebuffer(this.fbo)
  }

  private resize(s: Surface): void {
    const gl = this.gl
    this.width = s.width
    this.height = s.height
    if (this.canvas) {
      this.canvas.width = s.width
      this.canvas.height = s.height
      this.ctx!.fillStyle = '#000'
      this.ctx!.fillRect(0, 0, s.width, s.height)
      return
    }
    gl.bindTexture(gl.TEXTURE_2D, this.texture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, s.width, s.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture, 0)
    gl.clearColor(0, 0, 0, 1)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  }
}

// Crossfade with a blend mode: at 0 only A, at 1 only B, and at 0.5 the blend of both.
// Between them it fades linearly, so "normal" is a plain crossfade.
const COMPOSITE_FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uA, uB;
uniform float uX;
uniform int uMode;
out vec4 outColor;
vec3 blend(vec3 a, vec3 b) {
  if (uMode == 1) return min(a + b, 1.0);
  if (uMode == 2) return 1.0 - (1.0 - a) * (1.0 - b);
  if (uMode == 3) return a * b;
  if (uMode == 4) return abs(a - b);
  if (uMode == 5) return max(a, b);
  return (a + b) * 0.5;
}
void main() {
  vec3 a = texture(uA, vUv).rgb;
  vec3 b = texture(uB, vUv).rgb;
  vec3 m = blend(a, b);
  vec3 c = uX < 0.5 ? mix(a, m, uX * 2.0) : mix(m, b, uX * 2.0 - 1.0);
  outColor = vec4(c, 1.0);
}`

export class Compositor {
  readonly gl: WebGL2RenderingContext
  private readonly prog: WebGLProgram
  private readonly u: Record<'uA' | 'uB' | 'uX' | 'uMode', WebGLUniformLocation | null>
  private readonly vao: WebGLVertexArrayObject
  private readonly black: WebGLTexture

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl
    this.prog = program(gl, COMPOSITE_FS)
    this.u = uniforms(gl, this.prog, ['uA', 'uB', 'uX', 'uMode'] as const)
    this.vao = gl.createVertexArray()!
    this.black = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, this.black)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]))
  }

  // Draws on `target`, or on the canvas when it is null.
  composite(a: WebGLTexture | null, b: WebGLTexture | null, crossfade: number, mode: BlendMode, width: number, height: number, target: Target | null = null): void {
    const gl = this.gl
    if (target) target.bind()
    else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      gl.viewport(0, 0, width, height)
    }
    gl.useProgram(this.prog)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, a ?? this.black)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, b ?? this.black)
    gl.uniform1i(this.u.uA, 0)
    gl.uniform1i(this.u.uB, 1)
    gl.uniform1f(this.u.uX, crossfade)
    gl.uniform1i(this.u.uMode, BLEND_MODES.indexOf(mode))
    drawFullscreen(gl, this.vao)
    gl.activeTexture(gl.TEXTURE0)
  }

  dispose(): void {
    const gl = this.gl
    gl.deleteProgram(this.prog)
    gl.deleteVertexArray(this.vao)
    gl.deleteTexture(this.black)
  }
}
