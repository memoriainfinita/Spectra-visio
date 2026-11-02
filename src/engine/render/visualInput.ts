// The visual input: an image, video or camera for each layer, read by the visualizations
// and effects of that layer (imported shaders, the input visualization, the input mix).
// Each WebGL context keeps its own copy of the textures.

export interface VisualSource {
  element: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement | ImageBitmap
  width: number
  height: number
  // Video and camera change every frame; images only when replaced.
  live: boolean
}

// By layer id.
const sources = new Map<string, VisualSource>()
// The layer being drawn: what it reads is its own input.
let drawing: string | null = null

export function setVisualSource(layer: string, source: VisualSource | null): void {
  if (source) sources.set(layer, source)
  else sources.delete(layer)
}

export const visualSourceOf = (layer: string): VisualSource | null => sources.get(layer) ?? null

// The map itself, for the output window to follow.
export const visualSources = (): ReadonlyMap<string, VisualSource> => sources

// Set by the renderer around each layer, and around the composition's effects with the
// layer whose input they read.
export function setInputLayer(layer: string | null): void {
  drawing = layer
}

// By property, not instanceof: in the output window the element belongs to the main window.
const ready = (s: VisualSource) => !('readyState' in s.element) || s.element.readyState >= 2

// The input as a texture of one context: black until there is a source.
export class InputTexture {
  readonly texture: WebGLTexture
  width = 1
  height = 1
  private readonly gl: WebGL2RenderingContext
  // The source last uploaded: null for none; undefined before the first look.
  private seen: VisualSource | null | undefined

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl
    this.texture = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, this.texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]))
  }

  // Uploads the source of the layer being drawn when it changed or plays; leaves the
  // texture bound.
  update(): WebGLTexture {
    const gl = this.gl
    const s = drawing === null ? null : (sources.get(drawing) ?? null)
    gl.bindTexture(gl.TEXTURE_2D, this.texture)
    if (this.seen === s && !(s?.live && ready(s))) return this.texture
    if (!s) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]))
      this.width = this.height = 1
      this.seen = null
      return this.texture
    }
    if (!ready(s)) return this.texture
    // Image rows run top-down, GL textures bottom-up.
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
    try {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, s.element)
      this.width = s.width
      this.height = s.height
    } catch {
      // A source from another origin without CORS cannot be read: it stays black.
    }
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
    this.seen = s
    return this.texture
  }

  dispose(): void {
    this.gl.deleteTexture(this.texture)
  }
}

// Where a pixel of an output of size `res` falls in the input of size `src`: cover fills the
// output and crops, contain shows the whole input with bars. `flip` mirrors it.
export const FIT_GLSL = `
vec2 fitUv(vec2 frag, vec2 res, vec2 src, float cover, float flip) {
  float s = cover > 0.5 ? max(res.x / src.x, res.y / src.y) : min(res.x / src.x, res.y / src.y);
  vec2 uv = (frag - 0.5 * res) / (src * s) + 0.5;
  if (flip > 0.5) uv.x = 1.0 - uv.x;
  return uv;
}
float inside(vec2 uv) { return step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0); }`
