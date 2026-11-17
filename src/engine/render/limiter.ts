import { Target, bindTextures, drawFullscreen, program, uniforms } from './gl'
import { RISE_LUMINANCE_PER_S, RISE_RED_PER_S } from './flashModel'

// Reduce flashes (WCAG 2.3.1). The image is read as a grid of cells, each with its mean
// luminance (linear) and its mean red excess (R − G − B). A cell may fall at once but only
// rise at RISE_LUMINANCE_PER_S and RISE_RED_PER_S; a cell brighter than allowed is scaled down.
// The mean of any area is then limited too, as it is the mean of its cells. A flash becomes a
// short fade, and fast alternation, of the whole image or of one part, stays dark.
// The arithmetic is in flashModel.ts, with its tests.

// The grid is the 16 × 9 level of the mipmaps of a 256 × 144 copy of the image.
const SMALL_W = 256
const SMALL_H = 144
const LEVEL = 4
const GRID_W = SMALL_W >> LEVEL
const GRID_H = SMALL_H >> LEVEL

const SRGB_GLSL = `
vec3 toLinear(vec3 c) { return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); }
vec3 toSrgb(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }`

// One texel of the small copy: x = relative luminance, y = red excess.
const COPY_FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uSrc;
out vec4 outColor;
${SRGB_GLSL}
void main() {
  vec3 c = clamp(texture(uSrc, vUv).rgb, 0.0, 1.0);
  float y = dot(toLinear(c), vec3(0.2126, 0.7152, 0.0722));
  outColor = vec4(y, max(0.0, c.r - c.g - c.b), 0.0, 1.0);
}`

// One texel per cell: r, g = what may be shown (luminance, red); b, a = the gain for each.
const STATE_FS = `#version 300 es
precision highp float;
uniform sampler2D uSmall, uPrev;
uniform float uLevel, uStepY, uStepR, uFirst;
out vec4 outColor;
void main() {
  ivec2 cell = ivec2(gl_FragCoord.xy);
  vec2 m = texelFetch(uSmall, cell, int(uLevel)).rg;
  vec2 prev = texelFetch(uPrev, cell, 0).rg;
  vec2 allowed = uFirst > 0.5 ? m : min(m, prev + vec2(uStepY, uStepR));
  vec2 gain = mix(vec2(1.0), min(vec2(1.0), allowed / max(m, vec2(0.0005))), step(vec2(0.0005), m));
  outColor = vec4(allowed, gain);
}`

const APPLY_FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uSrc, uState;
out vec4 outColor;
${SRGB_GLSL}
void main() {
  vec2 g = texture(uState, vUv).ba;
  vec3 c = clamp(texture(uSrc, vUv).rgb, 0.0, 1.0);
  outColor = vec4(toSrgb(toLinear(c) * g.x) * g.y, 1.0);
}`

export class FlashLimiter {
  private readonly gl: WebGL2RenderingContext
  private readonly small: WebGLTexture
  private readonly smallFbo: WebGLFramebuffer
  private readonly state: [Target, Target]
  private readonly out: Target
  private readonly copyProg: WebGLProgram
  private readonly copyU: Record<'uSrc', WebGLUniformLocation | null>
  private readonly stateProg: WebGLProgram
  private readonly stateU: Record<'uSmall' | 'uPrev' | 'uLevel' | 'uStepY' | 'uStepR' | 'uFirst', WebGLUniformLocation | null>
  private readonly applyProg: WebGLProgram
  private readonly applyU: Record<'uSrc' | 'uState', WebGLUniformLocation | null>
  private readonly vao: WebGLVertexArrayObject
  private current = 0
  private first = true

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl
    const float = !!gl.getExtension('EXT_color_buffer_float')
    this.small = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, this.small)
    // Half float where possible: the luminance of a dark cell is lost in 8 bits.
    gl.texStorage2D(gl.TEXTURE_2D, LEVEL + 1, float ? gl.RGBA16F : gl.RGBA8, SMALL_W, SMALL_H)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    this.smallFbo = gl.createFramebuffer()!
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.smallFbo)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.small, 0)
    this.state = [new Target(gl, true), new Target(gl, true)]
    for (const t of this.state) t.size(GRID_W, GRID_H)
    this.out = new Target(gl)
    this.copyProg = program(gl, COPY_FS)
    this.copyU = uniforms(gl, this.copyProg, ['uSrc'] as const)
    this.stateProg = program(gl, STATE_FS)
    this.stateU = uniforms(gl, this.stateProg, ['uSmall', 'uPrev', 'uLevel', 'uStepY', 'uStepR', 'uFirst'] as const)
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
    gl.uniform1f(this.stateU.uLevel, LEVEL)
    gl.uniform1f(this.stateU.uStepY, RISE_LUMINANCE_PER_S * dt)
    gl.uniform1f(this.stateU.uStepR, RISE_RED_PER_S * dt)
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
