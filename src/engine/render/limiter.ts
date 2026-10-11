import { LUMA_GLSL, Target, bindTextures, drawFullscreen, program, uniforms } from './gl'

// Reduce flashes: the mean brightness of the image may fall at once but only rise at
// RISE_PER_S; a frame brighter than allowed is scaled down as a whole. A white flash becomes
// a short fade and fast bright-dark alternation stays dark, whatever draws it.

// Mean brightness (0–1) gained per second at most: black to white in a second.
export const RISE_PER_S = 1
// The mean is read from a small copy of the image, averaged by its mipmaps.
const SMALL_W = 256
const SMALL_H = 144

const COPY_FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uSrc;
out vec4 outColor;
void main() { outColor = vec4(texture(uSrc, vUv).rgb, 1.0); }`

// One texel: the brightness allowed this frame.
const STATE_FS = `#version 300 es
precision highp float;
uniform sampler2D uSmall, uPrev;
uniform float uLevels, uStep, uFirst;
out vec4 outColor;
${LUMA_GLSL}
void main() {
  float mean = luma(textureLod(uSmall, vec2(0.5), uLevels).rgb);
  float prev = texture(uPrev, vec2(0.5)).r;
  float allowed = uFirst > 0.5 ? mean : min(mean, prev + uStep);
  outColor = vec4(allowed, mean, 0.0, 1.0);
}`

const APPLY_FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uSrc, uState;
out vec4 outColor;
void main() {
  vec2 s = texture(uState, vec2(0.5)).rg;
  float gain = s.y > 0.0005 ? min(1.0, s.x / s.y) : 1.0;
  outColor = vec4(texture(uSrc, vUv).rgb * gain, 1.0);
}`

export class FlashLimiter {
  private readonly gl: WebGL2RenderingContext
  private readonly small: WebGLTexture
  private readonly smallFbo: WebGLFramebuffer
  private readonly levels: number
  private readonly state: [Target, Target]
  private readonly out: Target
  private readonly copyProg: WebGLProgram
  private readonly copyU: Record<'uSrc', WebGLUniformLocation | null>
  private readonly stateProg: WebGLProgram
  private readonly stateU: Record<'uSmall' | 'uPrev' | 'uLevels' | 'uStep' | 'uFirst', WebGLUniformLocation | null>
  private readonly applyProg: WebGLProgram
  private readonly applyU: Record<'uSrc' | 'uState', WebGLUniformLocation | null>
  private readonly vao: WebGLVertexArrayObject
  private current = 0
  private first = true

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl
    this.levels = Math.floor(Math.log2(Math.max(SMALL_W, SMALL_H)))
    this.small = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, this.small)
    gl.texStorage2D(gl.TEXTURE_2D, this.levels + 1, gl.RGBA8, SMALL_W, SMALL_H)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    this.smallFbo = gl.createFramebuffer()!
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.smallFbo)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.small, 0)
    // Half float where possible: 8 bits round the per-frame step at high frame rates.
    this.state = [new Target(gl, true), new Target(gl, true)]
    for (const t of this.state) t.size(1, 1)
    this.out = new Target(gl)
    this.copyProg = program(gl, COPY_FS)
    this.copyU = uniforms(gl, this.copyProg, ['uSrc'] as const)
    this.stateProg = program(gl, STATE_FS)
    this.stateU = uniforms(gl, this.stateProg, ['uSmall', 'uPrev', 'uLevels', 'uStep', 'uFirst'] as const)
    this.applyProg = program(gl, APPLY_FS)
    this.applyU = uniforms(gl, this.applyProg, ['uSrc', 'uState'] as const)
    this.vao = gl.createVertexArray()!
  }

  // Starts again from the next image, as after a pause.
  reset(): void {
    this.first = true
  }

  // `image` limited, as a texture of the same size; `dt` in seconds.
  run(image: WebGLTexture, width: number, height: number, dt: number): WebGLTexture {
    const gl = this.gl
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.smallFbo)
    gl.viewport(0, 0, SMALL_W, SMALL_H)
    gl.useProgram(this.copyProg)
    bindTextures(gl, [this.copyU.uSrc], [image])
    drawFullscreen(gl, this.vao)
    gl.bindTexture(gl.TEXTURE_2D, this.small)
    gl.generateMipmap(gl.TEXTURE_2D)

    const prev = this.state[this.current]
    this.current = 1 - this.current
    const next = this.state[this.current]
    next.bind()
    gl.useProgram(this.stateProg)
    bindTextures(gl, [this.stateU.uSmall, this.stateU.uPrev], [this.small, prev.texture])
    gl.uniform1f(this.stateU.uLevels, this.levels)
    gl.uniform1f(this.stateU.uStep, RISE_PER_S * dt)
    gl.uniform1f(this.stateU.uFirst, this.first ? 1 : 0)
    drawFullscreen(gl, this.vao)
    this.first = false

    this.out.size(width, height)
    this.out.bind()
    gl.useProgram(this.applyProg)
    bindTextures(gl, [this.applyU.uSrc, this.applyU.uState], [image, next.texture])
    drawFullscreen(gl, this.vao)
    return this.out.texture
  }

  dispose(): void {
    const gl = this.gl
    gl.deleteTexture(this.small)
    gl.deleteFramebuffer(this.smallFbo)
    for (const t of this.state) t.dispose()
    this.out.dispose()
    gl.deleteProgram(this.copyProg)
    gl.deleteProgram(this.stateProg)
    gl.deleteProgram(this.applyProg)
    gl.deleteVertexArray(this.vao)
  }
}
