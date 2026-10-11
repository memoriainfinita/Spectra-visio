import type { BlendMode } from '../scene/scene'
import { BLEND_MODES } from '../scene/scene'
import { bindTextures, drawFullscreen, program, uniforms, type Target } from './gl'
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

/// One layer drawn onto the layers below: `uAmount` of the blend over the base. A layer that
// is changing visualization mixes its outgoing image into the new one first.
const LAYER_FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uBase, uLayer, uOut;
uniform float uT, uAmount;
uniform int uMode;
out vec4 outColor;
vec3 blend(vec3 b, vec3 l) {
  if (uMode == 1) return min(b + l, 1.0);
  if (uMode == 2) return 1.0 - (1.0 - b) * (1.0 - l);
  if (uMode == 3) return b * l;
  if (uMode == 4) return abs(b - l);
  if (uMode == 5) return max(b, l);
  return l;
}
void main() {
  vec3 b = texture(uBase, vUv).rgb;
  vec3 l = mix(texture(uOut, vUv).rgb, texture(uLayer, vUv).rgb, uT);
  outColor = vec4(mix(b, blend(b, l), uAmount), 1.0);
}`

// Transparent output: brightness becomes alpha, so black is see-through and the image adds
// over what is behind it. The colour is already premultiplied by that alpha.
const KEY_FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uSrc;
out vec4 outColor;
void main() {
  vec3 c = texture(uSrc, vUv).rgb;
  outColor = vec4(c, max(c.r, max(c.g, c.b)));
}`

// What one layer contributes: its image and, while it changes visualization, the outgoing
// image with the progress of the fade (0 outgoing only, 1 new only).
export interface LayerImage {
  texture: WebGLTexture | null
  outgoing: WebGLTexture | null
  progress: number
}

export class Compositor {
  readonly gl: WebGL2RenderingContext
  readonly black: WebGLTexture
  readonly white: WebGLTexture
  private readonly prog: WebGLProgram
  private readonly u: Record<'uBase' | 'uLayer' | 'uOut' | 'uT' | 'uAmount' | 'uMode', WebGLUniformLocation | null>
  private readonly keyProg: WebGLProgram
  private readonly keyU: Record<'uSrc', WebGLUniformLocation | null>
  private readonly vao: WebGLVertexArrayObject

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl
    this.prog = program(gl, LAYER_FS)
    this.u = uniforms(gl, this.prog, ['uBase', 'uLayer', 'uOut', 'uT', 'uAmount', 'uMode'] as const)
    this.keyProg = program(gl, KEY_FS)
    this.keyU = uniforms(gl, this.keyProg, ['uSrc'] as const)
    this.vao = gl.createVertexArray()!
    this.black = solid(gl, 0)
    this.white = solid(gl, 255)
  }

  // Draws `image` over `base` (black when null) on `target`, or on the canvas when it is null.
  draw(base: WebGLTexture | null, image: LayerImage, amount: number, mode: BlendMode, width: number, height: number, target: Target | null = null): void {
    const gl = this.gl
    if (target) target.bind()
    else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      gl.viewport(0, 0, width, height)
    }
    gl.useProgram(this.prog)
    bindTextures(gl, [this.u.uBase, this.u.uLayer, this.u.uOut], [base ?? this.black, image.texture ?? this.black, image.outgoing ?? this.black])
    gl.uniform1f(this.u.uT, image.outgoing ? image.progress : 1)
    gl.uniform1f(this.u.uAmount, amount)
    gl.uniform1i(this.u.uMode, BLEND_MODES.indexOf(mode))
    drawFullscreen(gl, this.vao)
  }

  // `image` on the canvas with its brightness as alpha.
  key(image: WebGLTexture, width: number, height: number): void {
    const gl = this.gl
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, width, height)
    gl.useProgram(this.keyProg)
    bindTextures(gl, [this.keyU.uSrc], [image])
    drawFullscreen(gl, this.vao)
  }

  dispose(): void {
    const gl = this.gl
    gl.deleteProgram(this.prog)
    gl.deleteProgram(this.keyProg)
    gl.deleteVertexArray(this.vao)
    gl.deleteTexture(this.black)
    gl.deleteTexture(this.white)
  }
}

function solid(gl: WebGL2RenderingContext, v: number): WebGLTexture {
  const t = gl.createTexture()!
  gl.bindTexture(gl.TEXTURE_2D, t)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([v, v, v, 255]))
  return t
}
