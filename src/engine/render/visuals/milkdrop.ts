import type { AudioLevels, Butterchurn, MilkdropVisualizer } from 'butterchurn'
import { WAVE_SIZE } from '../../analysis/analyzer'
import { TONE_FS, drawFullscreen, program, uniforms } from '../gl'
import type { VisualGL } from '../visual'
import { MILKDROP_PRESETS } from './milkdropPresets'

// Milkdrop through Butterchurn, on its own canvas and WebGL context. It reads the app's
// analysis (delayed like every visualization) instead of an audio node, so latency
// compensation, thumbnails and the sensitivity parameter work as for the others.

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
    const tex = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    const canvas = document.createElement('canvas')
    const levels: AudioLevels = {
      timeByteArray: new Uint8Array(WAVE_SIZE).fill(128),
      timeByteArrayL: new Uint8Array(WAVE_SIZE).fill(128),
      timeByteArrayR: new Uint8Array(WAVE_SIZE).fill(128),
    }
    let viz: MilkdropVisualizer | null = null
    let disposed = false
    let preset = -1
    let width = 0
    let height = 0
    const start = (lib: Library) => {
      if (disposed) return
      canvas.width = Math.max(1, width)
      canvas.height = Math.max(1, height)
      viz = lib.butterchurn.createVisualizer(null, canvas, { width: canvas.width, height: canvas.height, pixelRatio: 1, textureRatio: 1 })
    }
    if (library) start(library)
    else load().then(start, () => undefined)

    return {
      render(f, p, s) {
        const k = Math.min(1, Math.sqrt(MAX_PIXELS / (s.width * s.height)))
        const w = Math.max(1, Math.round(s.width * k))
        const h = Math.max(1, Math.round(s.height * k))
        if (w !== width || h !== height) {
          width = w
          height = h
          if (viz) {
            canvas.width = w
            canvas.height = h
            viz.setRendererSize(w, h, { pixelRatio: 1, textureRatio: 1 })
          }
        }
        if (!viz || !library) {
          gl.clearColor(0, 0, 0, 1)
          gl.clear(gl.COLOR_BUFFER_BIT)
          return
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

        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, tex)
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas)
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
        gl.useProgram(prog)
        gl.uniform1i(u.uSrc, 0)
        gl.uniform1f(u.uHue, ((p.hue ?? 0) * Math.PI) / 180)
        gl.uniform1f(u.uIntensity, p.intensity ?? 1)
        drawFullscreen(gl, vao)
      },
      dispose() {
        disposed = true
        gl.deleteProgram(prog)
        gl.deleteVertexArray(vao)
        gl.deleteTexture(tex)
        // Contexts are scarce: free Milkdrop's at once instead of waiting for collection.
        if (viz) canvas.getContext('webgl2')?.getExtension('WEBGL_lose_context')?.loseContext()
        viz = null
      },
    }
  },
}
