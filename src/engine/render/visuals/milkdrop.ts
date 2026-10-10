import type { AudioLevels, Butterchurn, MilkdropVisualizer } from 'butterchurn'
import { WAVE_SIZE } from '../../analysis/analyzer'
import { TONE_FS, Target, drawFullscreen, program, uniforms } from '../gl'
import type { VisualGL } from '../visual'
import { MILKDROP_PRESETS } from './milkdropPresets'

// Milkdrop through Butterchurn. It reads the app's analysis (delayed like every
// visualization) instead of an audio node, so latency compensation, thumbnails and the
// sensitivity parameter work as for the others.
//
// It draws with the app's own WebGL context, through a proxy that sends its screen output
// to a texture of ours. On a canvas of its own, copying each frame across contexts cost
// Firefox 18-19 ms (a read back from the GPU) and held it near 30 fps.

// Largest internal size; above it the layer scales the image up.
const MAX_PIXELS = 1920 * 1080
const DEFAULT_PRESET = Math.max(0, MILKDROP_PRESETS.indexOf('Flexi, martin + geiss - dedicated to the sherwin maxawow'))

interface Library {
  butterchurn: Butterchurn
  presets: Record<string, object>
}

let library: Library | null = null
let loading: Promise<Library> | null = null

// The packages are CommonJS: depending on the bundler the API sits on the module or on
// its default export.
function api<T extends object>(mod: unknown, key: string): T {
  let v = mod as Record<string, unknown> | undefined
  for (let i = 0; i < 3 && v && !(key in v); i++) v = v.default as Record<string, unknown> | undefined
  if (!v || !(key in v)) throw new Error(`Butterchurn: ${key} not found`)
  return v as T
}

// About 1 MB of code and presets, loaded the first time Milkdrop is used.
function load(): Promise<Library> {
  loading ??= Promise.all([import('butterchurn'), import('butterchurn-presets')]).then(
    ([b, p]) => {
      const presets = api<{ getPresets(): Record<string, object> }>(p, 'getPresets').getPresets()
      library = { butterchurn: api<Butterchurn>(b, 'createVisualizer'), presets }
      return library
    },
    (err: unknown) => {
      // A failed download can be retried by choosing the visualization again.
      loading = null
      throw err
    },
  )
  return loading
}

type GLObject = WebGLTexture | WebGLBuffer | WebGLFramebuffer | WebGLRenderbuffer | WebGLProgram | WebGLShader | WebGLSampler | WebGLVertexArrayObject

// GL objects Butterchurn creates, with the call that deletes each kind.
const DELETERS = {
  createTexture: 'deleteTexture',
  createBuffer: 'deleteBuffer',
  createFramebuffer: 'deleteFramebuffer',
  createRenderbuffer: 'deleteRenderbuffer',
  createProgram: 'deleteProgram',
  createShader: 'deleteShader',
  createSampler: 'deleteSampler',
  createVertexArray: 'deleteVertexArray',
} as const
type Created = [(typeof DELETERS)[keyof typeof DELETERS], GLObject]

// The app's context as Butterchurn sees it: the default framebuffer (its screen) becomes
// `screen()`, and every object it creates is recorded so it can be deleted.
function sharedContext(gl: WebGL2RenderingContext, screen: () => WebGLFramebuffer, created: Created[]): WebGL2RenderingContext {
  const fns = new Map<PropertyKey, unknown>()
  return new Proxy(gl, {
    get(target, key) {
      const hit = fns.get(key)
      if (hit) return hit
      const value: unknown = Reflect.get(target, key, target)
      if (typeof value !== 'function') return value
      let fn: unknown
      if (key === 'bindFramebuffer') {
        fn = (kind: number, fb: WebGLFramebuffer | null) => target.bindFramebuffer(kind, fb ?? screen())
      } else if (typeof key === 'string' && key in DELETERS) {
        const del = DELETERS[key as keyof typeof DELETERS]
        fn = (...args: unknown[]) => {
          const obj = (value as (...a: unknown[]) => GLObject | null).apply(target, args)
          if (obj) created.push([del, obj])
          return obj
        }
      } else {
        fn = (value as (...a: unknown[]) => unknown).bind(target)
      }
      fns.set(key, fn)
      return fn
    },
  })
}

// What Butterchurn leaves behind that the rest of the app does not expect: blending on,
// samplers bound to texture units (they override the textures' own filtering), and
// changed unpack settings.
function restoreState(gl: WebGL2RenderingContext): void {
  gl.bindVertexArray(null)
  gl.disable(gl.BLEND)
  for (let unit = 0; unit < 16; unit++) gl.bindSampler(unit, null)
  gl.activeTexture(gl.TEXTURE0)
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4)
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
}

const toByte = (v: number) => 128 + Math.max(-1, Math.min(1, v)) * 127

export const milkdrop: VisualGL = {
  id: 'milkdrop',
  label: 'visual.milkdrop',
  category: 'shader',
  kind: 'gl',
  params: [
    { id: 'preset', label: 'param.preset', min: 0, max: MILKDROP_PRESETS.length - 1, default: DEFAULT_PRESET, int: true, labels: MILKDROP_PRESETS },
    { id: 'blend', label: 'param.blend', min: 0, max: 10, default: 2.5 },
  ],
  prepare: () => load().then(() => undefined),
  create(gl) {
    const prog = program(gl, TONE_FS)
    const u = uniforms(gl, prog, ['uSrc', 'uHue', 'uIntensity'] as const)
    const vao = gl.createVertexArray()!
    // Butterchurn sets vertex attributes as if it had the default vertex array; it gets
    // one of its own so they never land in ours.
    const bcVao = gl.createVertexArray()!
    // Butterchurn's screen.
    const out = new Target(gl)
    const created: Created[] = []
    const shared = sharedContext(gl, () => out.framebuffer, created)
    const canvas = { getContext: () => shared } as unknown as HTMLCanvasElement
    const levels: AudioLevels = {
      timeByteArray: new Uint8Array(WAVE_SIZE).fill(128),
      timeByteArrayL: new Uint8Array(WAVE_SIZE).fill(128),
      timeByteArrayR: new Uint8Array(WAVE_SIZE).fill(128),
    }
    let viz: MilkdropVisualizer | null = null
    let preset = -1
    let width = 0
    let height = 0
    if (!library) void load().catch(() => undefined)

    return {
      render(f, p, s) {
        const layerFbo = gl.getParameter(gl.FRAMEBUFFER_BINDING) as WebGLFramebuffer | null
        if (!library) {
          gl.clearColor(0, 0, 0, 1)
          gl.clear(gl.COLOR_BUFFER_BIT)
          return
        }
        out.size(s.width, s.height)
        gl.bindVertexArray(bcVao)
        // Butterchurn's own textures stay within MAX_PIXELS; its output is full size.
        const ratio = Math.min(1, Math.sqrt(MAX_PIXELS / (s.width * s.height)))
        if (!viz) {
          viz = library.butterchurn.createVisualizer(null, canvas, { width: s.width, height: s.height, pixelRatio: 1, textureRatio: ratio })
          width = s.width
          height = s.height
        } else if (s.width !== width || s.height !== height) {
          width = s.width
          height = s.height
          viz.setRendererSize(width, height, { pixelRatio: 1, textureRatio: ratio })
        }
        const index = Math.round(p.preset)
        if (index !== preset) {
          const data = library.presets[MILKDROP_PRESETS[index]]
          // The first preset appears at once; later ones blend in.
          if (data) viz.loadPreset(data, preset < 0 ? 0 : p.blend)
          preset = index
        }
        const a = f.analysis
        const sens = p.sensitivity ?? 1
        for (let i = 0; i < WAVE_SIZE; i++) {
          const l = a ? a.waveL[i] * sens : 0
          const r = a ? a.waveR[i] * sens : 0
          levels.timeByteArrayL[i] = toByte(l)
          levels.timeByteArrayR[i] = toByte(r)
          levels.timeByteArray[i] = toByte((l + r) / 2)
        }
        // Speed scales Milkdrop's clock; zero would make it read the wall clock instead.
        viz.render({ audioLevels: levels, elapsedTime: Math.max(1e-4, f.dt * (p.speed ?? 1)) })
        restoreState(gl)

        gl.bindFramebuffer(gl.FRAMEBUFFER, layerFbo)
        gl.viewport(0, 0, s.width, s.height)
        gl.useProgram(prog)
        gl.bindTexture(gl.TEXTURE_2D, out.texture)
        gl.uniform1i(u.uSrc, 0)
        gl.uniform1f(u.uHue, ((p.hue ?? 0) * Math.PI) / 180)
        gl.uniform1f(u.uIntensity, p.intensity ?? 1)
        drawFullscreen(gl, vao)
      },
      dispose() {
        gl.deleteProgram(prog)
        gl.deleteVertexArray(vao)
        gl.deleteVertexArray(bcVao)
        out.dispose()
        // Butterchurn has no dispose: everything it created goes here.
        for (const [del, obj] of created) (gl[del] as (o: GLObject) => void).call(gl, obj)
        created.length = 0
        viz = null
      },
    }
  },
}
