import { createStore } from '../../core/store'
import { BEAT_SLOTS, WAVE_SIZE, type AnalysisFrame } from '../analysis/analyzer'
import { Modulator } from '../modulation/modulation'
import { visualSettings, type SceneState } from '../scene/scene'
import { Compositor, Layer } from './compositor'
import { fromUnit, getVisual, paramsOf, toUnit } from './registry'
import type { Params, Surface, VisualFrame } from './visual'

// Longest frame step the visuals see; longer gaps (a hidden tab) count as this.
const MAX_DT_S = 0.05
// Internal resolution cap: 2560 × 1440 worth of pixels.
const MAX_PIXELS = 2560 * 1440

export interface RendererStatus {
  // Error key or message when WebGL2 is missing or a visualization failed to start.
  error: 'noWebgl' | string | null
  fps: number
}

// Draws the scene once per animation frame: evaluates modulations, renders the layers that
// are visible through the crossfader and composites them onto the output canvas.
export class Renderer {
  readonly status = createStore<RendererStatus>({ error: null, fps: 0 })
  // Effective value of each parameter in 0–1 of its range, per layer, for the panel.
  readonly live: [Map<string, number>, Map<string, number>] = [new Map(), new Map()]

  private readonly scene: () => SceneState
  private readonly analysis: (now: number) => AnalysisFrame | null
  private readonly modulator = new Modulator()
  private canvas: HTMLCanvasElement | null = null
  private compositor: Compositor | null = null
  private layers: [Layer | null, Layer | null] = [null, null]
  private failed: [string | null, string | null] = [null, null]
  private surface: Surface = { width: 1, height: 1, dpr: 1 }
  private readonly seen = new Uint32Array(BEAT_SLOTS)
  private seenValid = false
  private readonly frame: VisualFrame = { time: 0, dt: 0, analysis: null, wave: new Float32Array(WAVE_SIZE), hits: new Array(BEAT_SLOTS).fill(false) }
  private raf = 0
  private last: number | null = null
  private fpsFrames = 0
  private fpsStart = 0

  constructor(scene: () => SceneState, analysis: (now: number) => AnalysisFrame | null) {
    this.scene = scene
    this.analysis = analysis
  }

  attach(canvas: HTMLCanvasElement): void {
    this.detach()
    this.canvas = canvas
    canvas.addEventListener('webglcontextlost', this.onLost)
    canvas.addEventListener('webglcontextrestored', this.onRestored)
    this.init()
  }

  detach(): void {
    this.stop()
    this.release()
    this.canvas?.removeEventListener('webglcontextlost', this.onLost)
    this.canvas?.removeEventListener('webglcontextrestored', this.onRestored)
    this.canvas = null
  }

  // CSS size of the canvas and the device pixel ratio; the internal size follows, capped.
  resize(cssWidth: number, cssHeight: number, dpr: number): void {
    let scale = dpr
    const pixels = cssWidth * cssHeight * scale * scale
    if (pixels > MAX_PIXELS) scale *= Math.sqrt(MAX_PIXELS / pixels)
    const width = Math.max(1, Math.round(cssWidth * scale))
    const height = Math.max(1, Math.round(cssHeight * scale))
    this.surface = { width, height, dpr: scale }
    if (this.canvas && (this.canvas.width !== width || this.canvas.height !== height)) {
      this.canvas.width = width
      this.canvas.height = height
    }
  }

  private init(): void {
    const gl = this.canvas?.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false })
    if (!gl) {
      this.status.set((s) => ({ ...s, error: 'noWebgl' }))
      return
    }
    try {
      this.compositor = new Compositor(gl)
      this.status.set((s) => ({ ...s, error: null }))
      this.start()
    } catch (err) {
      this.status.set((s) => ({ ...s, error: String(err) }))
    }
  }

  private start(): void {
    if (this.raf) return
    const loop = (now: number) => {
      this.raf = requestAnimationFrame(loop)
      this.draw(now)
    }
    this.raf = requestAnimationFrame(loop)
  }

  private stop(): void {
    cancelAnimationFrame(this.raf)
    this.raf = 0
    this.last = null
  }

  private release(): void {
    for (const l of this.layers) l?.dispose()
    this.layers = [null, null]
    this.compositor?.dispose()
    this.compositor = null
  }

  private readonly onLost = (e: Event) => {
    // Without preventDefault the browser never restores the context.
    e.preventDefault()
    this.stop()
    this.layers = [null, null]
    this.failed = [null, null]
    this.compositor = null
  }

  private readonly onRestored = () => this.init()

  private draw(now: number): void {
    const compositor = this.compositor
    if (!compositor) return
    const dt = this.last === null ? 0 : Math.min(MAX_DT_S, (now - this.last) / 1000)
    this.last = now
    this.countFps(now)

    const a = this.analysis(now)
    const f = this.frame
    f.time = now / 1000
    f.dt = dt
    f.analysis = a
    if (a) {
      for (let i = 0; i < WAVE_SIZE; i++) f.wave[i] = (a.waveL[i] + a.waveR[i]) / 2
      for (let i = 0; i < BEAT_SLOTS; i++) {
        f.hits[i] = this.seenValid && a.beats[i] !== this.seen[i]
        this.seen[i] = a.beats[i]
      }
      this.seenValid = true
    } else {
      f.wave.fill(0)
      f.hits.fill(false)
    }
    this.modulator.advance(f.time, dt, a)

    const scene = this.scene()
    const x = scene.crossfade
    const textures: [WebGLTexture | null, WebGLTexture | null] = [null, null]
    for (const i of [0, 1] as const) {
      if (i === 0 ? x >= 1 : x <= 0) continue
      const layer = this.layerFor(i, scene.layers[i].visual)
      if (!layer) continue
      layer.render(f, this.params(i, scene), this.surface)
      textures[i] = layer.texture
    }
    compositor.composite(textures[0], textures[1], x, scene.blend, this.surface.width, this.surface.height)
  }

  // Base values plus modulation, clamped to each parameter's range.
  private params(i: 0 | 1, scene: SceneState): Params {
    const layer = scene.layers[i]
    const def = getVisual(layer.visual)
    if (!def) return {}
    const settings = visualSettings(layer)
    const out: Params = {}
    const live = this.live[i]
    live.clear()
    for (const p of paramsOf(def)) {
      const base = settings.params[p.id] ?? p.default
      const mods = settings.mods[p.id]
      let unit = toUnit(p, base)
      if (mods?.length) unit += this.modulator.sum(`${i}:${layer.visual}:${p.id}`, mods)
      out[p.id] = fromUnit(p, unit)
      live.set(p.id, toUnit(p, out[p.id]))
    }
    return out
  }

  private layerFor(i: 0 | 1, visualId: string): Layer | null {
    const current = this.layers[i]
    if (current?.visualId === visualId) return current
    // A visualization that failed to start is not retried every frame.
    if (this.failed[i] === visualId) return null
    current?.dispose()
    this.layers[i] = null
    const def = getVisual(visualId)
    if (!def || !this.compositor) return null
    try {
      this.layers[i] = new Layer(this.compositor.gl, def)
      this.failed[i] = null
    } catch (err) {
      this.failed[i] = visualId
      this.status.set((s) => ({ ...s, error: String(err) }))
    }
    return this.layers[i]
  }

  private countFps(now: number): void {
    this.fpsFrames++
    if (now - this.fpsStart < 1000) return
    const fps = Math.round((this.fpsFrames * 1000) / (now - this.fpsStart))
    this.fpsStart = now
    this.fpsFrames = 0
    if (fps !== this.status.get().fps) this.status.set((s) => ({ ...s, fps }))
  }
}
