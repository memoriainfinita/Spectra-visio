// Small WebGL2 helpers: programs and a fullscreen triangle drawn without vertex buffers.

export const FULLSCREEN_VS = `#version 300 es
out vec2 vUv;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type)
  if (!shader) throw new Error('createShader failed')
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS) && !gl.isContextLost()) {
    const log = gl.getShaderInfoLog(shader)
    gl.deleteShader(shader)
    throw new Error(`Shader: ${log}`)
  }
  return shader
}

export function program(gl: WebGL2RenderingContext, fs: string, vs = FULLSCREEN_VS): WebGLProgram {
  const p = gl.createProgram()
  if (!p) throw new Error('createProgram failed')
  const v = compile(gl, gl.VERTEX_SHADER, vs)
  const f = compile(gl, gl.FRAGMENT_SHADER, fs)
  gl.attachShader(p, v)
  gl.attachShader(p, f)
  gl.linkProgram(p)
  gl.deleteShader(v)
  gl.deleteShader(f)
  if (!gl.getProgramParameter(p, gl.LINK_STATUS) && !gl.isContextLost()) throw new Error(`Program: ${gl.getProgramInfoLog(p)}`)
  return p
}

// Uniform locations looked up once.
export function uniforms<K extends string>(gl: WebGL2RenderingContext, p: WebGLProgram, names: readonly K[]): Record<K, WebGLUniformLocation | null> {
  return Object.fromEntries(names.map((n) => [n, gl.getUniformLocation(p, n)])) as Record<K, WebGLUniformLocation | null>
}

// WebGL2 can draw without attributes, but some drivers want a vertex array bound.
export function drawFullscreen(gl: WebGL2RenderingContext, vao: WebGLVertexArrayObject): void {
  gl.bindVertexArray(vao)
  gl.drawArrays(gl.TRIANGLES, 0, 3)
}

export const HSL_GLSL = `
vec3 hsl2rgb(float h, float s, float l) {
  vec3 k = clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  return l + s * (k - 0.5) * (1.0 - abs(2.0 * l - 1.0));
}`

// A texture with its framebuffer, cleared to black whenever its size changes. Float targets
// are half float where the browser can render to them, 8 bits otherwise.
export class Target {
  readonly texture: WebGLTexture
  private readonly gl: WebGL2RenderingContext
  private readonly fbo: WebGLFramebuffer
  private readonly float: boolean
  width = 0
  height = 0

  constructor(gl: WebGL2RenderingContext, float = false) {
    this.gl = gl
    this.float = float && !!gl.getExtension('EXT_color_buffer_float')
    this.texture = gl.createTexture()!
    this.fbo = gl.createFramebuffer()!
    gl.bindTexture(gl.TEXTURE_2D, this.texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  }

  // Returns true when the size changed and the content was cleared.
  size(width: number, height: number): boolean {
    if (width === this.width && height === this.height) return false
    const gl = this.gl
    this.width = width
    this.height = height
    gl.bindTexture(gl.TEXTURE_2D, this.texture)
    if (this.float) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, width, height, 0, gl.RGBA, gl.HALF_FLOAT, null)
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture, 0)
    gl.clearColor(0, 0, 0, 1)
    gl.clear(gl.COLOR_BUFFER_BIT)
    return true
  }

  bind(): void {
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.fbo)
    this.gl.viewport(0, 0, this.width, this.height)
  }

  dispose(): void {
    this.gl.deleteTexture(this.texture)
    this.gl.deleteFramebuffer(this.fbo)
  }
}

// Binds `textures` to units 0, 1, … and points the sampler uniforms at them.
export function bindTextures(gl: WebGL2RenderingContext, samplers: (WebGLUniformLocation | null)[], textures: WebGLTexture[]): void {
  textures.forEach((t, i) => {
    gl.activeTexture(gl.TEXTURE0 + i)
    gl.bindTexture(gl.TEXTURE_2D, t)
    gl.uniform1i(samplers[i], i)
  })
  gl.activeTexture(gl.TEXTURE0)
}

export const COPY_FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uSrc;
out vec4 outColor;
void main() {
  outColor = vec4(texture(uSrc, vUv).rgb, 1.0);
}`

export const LUMA_GLSL = `
float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }`

// Hue rotation in YIQ space, angle in radians.
export const HUE_GLSL = `
vec3 hueRotate(vec3 c, float a) {
  const mat3 toYiq = mat3(0.299, 0.596, 0.211, 0.587, -0.274, -0.523, 0.114, -0.322, 0.312);
  const mat3 toRgb = mat3(1.0, 1.0, 1.0, 0.956, -0.272, -1.106, 0.621, -0.647, 1.703);
  vec3 yiq = toYiq * c;
  float s = sin(a), k = cos(a);
  yiq.yz = vec2(yiq.y * k - yiq.z * s, yiq.y * s + yiq.z * k);
  return toRgb * yiq;
}`

// Copies a texture with the common hue (radians) and intensity applied, for visualizations
// whose image comes from elsewhere: Milkdrop, imported shaders.
export const TONE_FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uSrc;
uniform float uHue, uIntensity;
out vec4 outColor;
${HUE_GLSL}
void main() {
  vec3 c = texture(uSrc, vUv).rgb;
  outColor = vec4(clamp(hueRotate(c, uHue), 0.0, 1.0) * uIntensity, 1.0);
}`
