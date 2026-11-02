import { createStore } from '../../core/store'
import { BEAT_SLOTS, WAVE_SIZE, type AnalysisFrame } from '../analysis/analyzer'
import { EffectChain, type ChainStep } from '../effects/chain'
import type { OutputState } from '../live/live'
import { getEffect } from '../effects/registry'
import { Modulator } from '../modulation/modulation'
import { effectKey, opacityKey, paramKey } from '../modulation/shared'
import { setInputLayer, visualSourceOf } from './visualInput'
import { COMP } from '../scene/knobs'
import { fixedRatio, type PixelSize } from '../output/format'
import { OverlayRenderer, anyOverlay, type OverlayData } from '../overlay/overlay'
import { layerAmount, visualSettings, type EffectState, type LayerState, type SceneState, type VisualSettings } from '../scene/scene'
import { Compositor, Layer, type LayerImage } from './compositor'
import { Target } from './gl'
import { FlashLimiter } from './limiter'
import { FrameGate, QualityGovernor } from './quality'
import { fromUnit, getVisual, paramsOf, toUnit } from './registry'
import type { ParamDef, Params, Surface, VisualFrame } from './visual'

// Longest frame step the visuals see; longer gaps (a hidden tab) count as this.
const MAX_DT_S = 0.05
// Internal resolution cap: 2560 × 1440 worth of pixels.
const MAX_PIXELS = 2560 * 1440

interface Fade {
  layer: Layer
  // Seconds, in frame time.
  start: number
  duration: number
}

// What the renderer keeps per layer of the scene, by layer id.
interface Slot {
  layer: Layer | null
  // Visualization that failed to start, not retried every frame.
  failed: string | null
  // Visualization the layer is fading out of.
  outgoing: Fade | null
  chain: EffectChain | null
}

const smoothstep = (p: number) => p * p * (3 - 2 * p)

export interface RendererStatus {
  // Error key or message when WebGL2 is missing or a visualization failed to start.
  error: 'noWebgl' | string | null
  fps: number
  // Internal resolution as a fraction of each side, below 1 when lowered for speed.
  scale: number
}

// Draws the scene once per animation frame: evaluates modulations, renders the layers that
// show, runs each one's effects, blends them bottom to top, runs the composition effects
// and puts the result on the output canvas.
export class Renderer {
  readonly status = createStore<RendererStatus>({ error: null, fps: 0, scale: 1 })
  // Effective value of each parameter in 0–1 of its range, by layer id, for the panel.
  readonly live = new Map<string, Map<string, number>>()
  // The same per effect entry, by its id.
  readonly effectLive = new Map<string, Map<string, number>>()
  // What the overlays show; set by the app, which knows the player.
  overlaySource: (() => OverlayData) | null = null
  // Blackout, freeze and strobe for this frame; set by the app, which knows the switches.
  output: ((now: number, analysis: AnalysisFrame | null) => OutputState) | null = null
  // Stops drawing, for when the output window shows the image instead.
  paused = false
  // Brightness as alpha on a see-through canvas, for the OBS source. Set before attach.
  transparent = false
  // Frames a second at most; 0 every animation frame.
  fpsCap = 0

  private readonly scene: () => SceneState
  private readonly analysis: (now: number) => AnalysisFrame | null
  private readonly modulator = new Modulator()
  private canvas: HTMLCanvasElement | null = null
  private compositor: Compositor | null = null
  private chain: EffectChain | null = null
  private overlay: OverlayRenderer | null = null
  // The layers blended so far, ping-pong.
  private stack: [Target, Target] | null = null
  // The finished image before the transparency key.
  private final: Target | null = null
  private readonly slots = new Map<string, Slot>()
  private readonly outgoingLive = new Map<string, number>()
  private readonly evaluated = new Set<string>()
  // This frame's shared modulation of each parameter they reach, by `paramKey` or
  // `effectKey`, in units of its range.
  private readonly shared = new Map<string, number>()
  // Output of each shared modulator this frame, 0–1, for the Modulators dock.
  readonly modValues = new Map<string, number>()
  // The last image shown before the overlays, kept while the output is frozen.
  private shown: WebGLTexture | null = null
  private surface: Surface = { width: 1, height: 1, dpr: 1 }
  private css = { width: 1, height: 1, dpr: 1 }
  private fixed: PixelSize | null = null
  // Resolution lowered when the fps fall short, and the most low power allows.
  private adaptive = false
  private maxScale = 1
  private readonly governor = new QualityGovernor()
  private readonly gate = new FrameGate()
  private limiter: FlashLimiter | null = null
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

  // Values of MIDI controls for the modulations that follow them.
  set controls(read: (id: string) => number) {
    this.modulator.controls = read
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

  // CSS size of the canvas and the device pixel ratio; the internal size follows, capped,
  // unless a fixed size is set.
  resize(cssWidth: number, cssHeight: number, dpr: number): void {
    this.css = { width: cssWidth, height: cssHeight, dpr }
    this.applySize()
  }

  // Renders at exactly this many pixels whatever the canvas shows; null follows the canvas.
  setFixedSize(size: PixelSize | null): void {
    if (size === this.fixed || (size && this.fixed && size.width === this.fixed.width && size.height === this.fixed.height)) return
    this.fixed = size
    this.applySize()
  }

  // Lets the fps lower the resolution (never with a fixed size), up to `maxScale` of it.
  setQuality(adaptive: boolean, maxScale: number): void {
    if (adaptive === this.adaptive && maxScale === this.maxScale) return
    this.adaptive = adaptive
    this.maxScale = maxScale
    if (!adaptive) this.governor.reset()
    this.applySize()
  }

  // The output canvas, for recording.
  get element(): HTMLCanvasElement | null {
    return this.canvas
  }

  // The fixed size set, or null when following the canvas.
  get fixedSize(): PixelSize | null {
    return this.fixed
  }

  // The size the composition renders at now.
  get pixels(): PixelSize {
    return { width: this.surface.width, height: this.surface.height }
  }

  private applySize(): void {
    let surface: Surface
    let lowered = 1
    if (this.fixed) {
      surface = { width: this.fixed.width, height: this.fixed.height, dpr: fixedRatio(this.fixed) }
    } else {
      const { width: cssWidth, height: cssHeight, dpr } = this.css
      let scale = dpr
      const pixels = cssWidth * cssHeight * scale * scale
      if (pixels > MAX_PIXELS) scale *= Math.sqrt(MAX_PIXELS / pixels)
      lowered = Math.min(this.maxScale, this.adaptive ? this.governor.scale : 1)
      scale *= lowered
      surface = { width: Math.max(1, Math.round(cssWidth * scale)), height: Math.max(1, Math.round(cssHeight * scale)), dpr: scale }
    }
    this.surface = surface
    if (lowered !== this.status.get().scale) this.status.set((s) => ({ ...s, scale: lowered }))
    if (this.canvas && (this.canvas.width !== surface.width || this.canvas.height !== surface.height)) {
      this.canvas.width = surface.width
      this.canvas.height = surface.height
    }
  }

  private init(): void {
    const gl = this.canvas?.getContext('webgl2', { alpha: this.transparent, premultipliedAlpha: true, antialias: false, depth: false, stencil: false })
    if (!gl) {
      this.status.set((s) => ({ ...s, error: 'noWebgl' }))
      return
    }
    try {
      this.compositor = new Compositor(gl)
      this.chain = this.newChain(gl)
      this.overlay = new OverlayRenderer(gl)
      this.stack = [new Target(gl), new Target(gl)]
      this.final = this.transparent ? new Target(gl) : null
      this.status.set((s) => ({ ...s, error: null }))
      this.start()
    } catch (err) {
      this.status.set((s) => ({ ...s, error: String(err) }))
    }
  }

  private newChain(gl: WebGL2RenderingContext): EffectChain {
    const chain = new EffectChain(gl)
    chain.onError = (msg) => this.status.set((s) => ({ ...s, error: msg }))
    return chain
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
    for (const slot of this.slots.values()) this.disposeSlot(slot)
    this.slots.clear()
    this.compositor?.dispose()
    this.compositor = null
    this.chain?.dispose()
    this.chain = null
    this.overlay?.dispose()
    this.overlay = null
    for (const t of this.stack ?? []) t.dispose()
    this.stack = null
    this.final?.dispose()
    this.final = null
    this.limiter?.dispose()
    this.limiter = null
    this.shown = null
  }

  private disposeSlot(slot: Slot): void {
    slot.layer?.dispose()
    slot.outgoing?.layer.dispose()
    slot.chain?.dispose()
  }

  private readonly onLost = (e: Event) => {
    // Without preventDefault the browser never restores the context.
    e.preventDefault()
    this.stop()
    this.slots.clear()
    this.compositor = null
    this.chain = null
    this.overlay = null
    this.stack = null
    this.final = null
    this.limiter = null
    this.shown = null
  }

  private readonly onRestored = () => this.init()

  private draw(now: number): void {
    const compositor = this.compositor
    const stack = this.stack
    if (!compositor || !stack) return
    if (this.paused) {
      this.last = null
      if (this.status.get().fps) this.status.set((s) => ({ ...s, fps: 0 }))
      return
    }
    if (!this.gate.pass(now, this.fpsCap)) return
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
    const out = this.output?.(now, a) ?? { black: 0, flash: 0, freeze: false, reduceFlashes: false }
    const scene = this.scene()
    const { width, height } = this.surface
    // Frozen: nothing advances and the last image stays.
    if (out.freeze && this.shown) {
      this.present(compositor, this.shown, out, scene, f.time, dt)
      return
    }
    this.modulator.advance(f.time, dt, a)
    this.sharedModulation(scene)
    this.dropGoneLayers(scene)
    this.evaluated.clear()
    for (const t of stack) t.size(width, height)

    // Bottom to top, each layer onto the ones below.
    let base: WebGLTexture | null = null
    let next = 0
    scene.layers.forEach((l, i) => {
      const mod = this.shared.get(opacityKey(l.id))
      const amount = layerAmount(scene, i, mod === undefined ? l.opacity : Math.max(0, Math.min(1, l.opacity + mod)))
      if (amount <= 0) {
        this.hidden(l)
        return
      }
      const image = this.layerImage(l, f, scene.transition)
      if (!image) return
      compositor.draw(base, image, amount, l.blend, width, height, stack[next])
      base = stack[next].texture
      next = 1 - next
    })

    const steps = this.effectSteps(scene.effects, 'fx')
    const chain = this.chain
    chain?.sync(steps)
    if (chain && steps.length) {
      chain.resize(this.surface)
      // The composition's effects read the input of the topmost layer that has one.
      setInputLayer(scene.layers.findLast((l) => visualSourceOf(l.id))?.id ?? null)
      try {
        base = chain.run(base ?? compositor.black, steps, f, this.surface)
      } finally {
        setInputLayer(null)
      }
    }
    this.shown = base ?? compositor.black
    this.present(compositor, this.shown, out, scene, f.time, dt)

    for (const id of this.effectLive.keys()) if (!this.evaluated.has(id)) this.effectLive.delete(id)
    for (const id of this.live.keys()) if (!scene.layers.some((l) => l.id === id)) this.live.delete(id)
  }

  // The image on the canvas with the blackout and the strobe flash, then the overlays,
  // which go dark with the blackout too. Transparent, all of it goes through the key.
  // Reducing flashes, the image is limited first; the overlays are left as they are.
  private present(compositor: Compositor, image: WebGLTexture, out: OutputState, scene: SceneState, time: number, dt: number): void {
    const { width, height } = this.surface
    if (out.reduceFlashes) {
      this.limiter ??= new FlashLimiter(compositor.gl)
      image = this.limiter.run(image, width, height, dt)
    } else this.limiter?.reset()
    const target = this.final
    target?.size(width, height)
    compositor.draw(null, { texture: image, outgoing: null, progress: 1 }, 1 - out.black, 'normal', width, height, target)
    if (out.flash > 0) compositor.draw(null, { texture: compositor.white, outgoing: null, progress: 1 }, out.flash, 'normal', width, height, target)
    if (out.black < 0.5 && this.overlay && this.overlaySource && anyOverlay(scene.overlays)) this.overlay.draw(scene.overlays, this.overlaySource(), this.surface, time, target)
    if (target) compositor.key(target.texture, width, height)
  }

  // The layer rendered, with its fade and its effects; null when it cannot start.
  private layerImage(l: LayerState, f: VisualFrame, transition: number): LayerImage | null {
    // What the layer's visualization and effects read as the input is the layer's own.
    setInputLayer(l.id)
    try {
      return this.drawLayer(l, f, transition)
    } finally {
      setInputLayer(null)
    }
  }

  private drawLayer(l: LayerState, f: VisualFrame, transition: number): LayerImage | null {
    const slot = this.slotFor(l.id)
    const layer = this.layerFor(slot, l.visual, f.time, transition)
    if (!layer) return null
    let live = this.live.get(l.id)
    if (!live) this.live.set(l.id, (live = new Map()))
    const def = getVisual(l.visual)
    layer.render(f, def ? this.evaluate(paramsOf(def), visualSettings(l), `${l.id}:${l.visual}`, live, (p) => paramKey(l.id, l.visual, p)) : {}, this.surface)
    const image: LayerImage = { texture: layer.texture, outgoing: null, progress: 1 }
    const fade = slot.outgoing
    if (fade) {
      const p = (f.time - fade.start) / fade.duration
      if (p >= 1) {
        fade.layer.dispose()
        slot.outgoing = null
      } else {
        const outDef = getVisual(fade.layer.visualId)
        const settings = visualSettings(l, fade.layer.visualId)
        const params = outDef ? this.evaluate(paramsOf(outDef), settings, `${l.id}:${fade.layer.visualId}`, this.outgoingLive, (p) => paramKey(l.id, fade.layer.visualId, p)) : {}
        fade.layer.render(f, params, this.surface)
        image.outgoing = fade.layer.texture
        image.progress = smoothstep(p)
      }
    }

    const steps = this.effectSteps(l.effects, `${l.id}:fx`)
    if (!steps.length && !slot.chain) return image
    if (!slot.chain && this.compositor) slot.chain = this.newChain(this.compositor.gl)
    const chain = slot.chain!
    chain.sync(steps)
    if (!steps.length) return image
    chain.resize(this.surface)
    let src = image.texture!
    if (image.outgoing) {
      // The fade has to be one image before the effects see it.
      this.compositor!.draw(null, image, 1, 'normal', this.surface.width, this.surface.height, chain.input)
      src = chain.input.texture
    }
    return { texture: chain.run(src, steps, f, this.surface), outgoing: null, progress: 1 }
  }

  private effectSteps(effects: readonly EffectState[], key: string): ChainStep[] {
    const steps: ChainStep[] = []
    for (const e of effects) {
      const def = getEffect(e.type)
      if (!e.enabled || !def) continue
      let live = this.effectLive.get(e.id)
      if (!live) this.effectLive.set(e.id, (live = new Map()))
      this.evaluated.add(e.id)
      steps.push({ id: e.id, type: e.type, params: this.evaluate(def.params, e, `${key}:${e.id}`, live, (p) => effectKey(e.id, p)) })
    }
    return steps
  }

  // Each shared modulator worked out once, and added up onto the parameters it reaches. An
  // effect is found by its place in its chain, as knobs find it.
  private sharedModulation(scene: SceneState): void {
    this.shared.clear()
    this.modValues.clear()
    for (const m of scene.modulators) {
      const v = this.modulator.shared(m.id, m)
      this.modValues.set(m.id, v)
      for (const d of m.dests) {
        const t = d.target
        let key: string
        if (t.kind === 'param') key = paramKey(t.layer, t.visual, t.param)
        else if (t.kind === 'opacity') key = opacityKey(t.layer)
        else {
          const chain = t.owner === COMP ? scene.effects : scene.layers.find((l) => l.id === t.owner)?.effects
          let seen = -1
          const e = chain?.find((x) => x.type === t.type && ++seen === t.nth)
          if (!e) continue
          key = effectKey(e.id, t.param)
        }
        this.shared.set(key, (this.shared.get(key) ?? 0) + d.amount * v)
      }
    }
  }

  // Base values plus modulation, the parameter's own and the shared, clamped to each
  // parameter's range. `sharedKey` names a parameter for the shared modulation.
  private evaluate(defs: ParamDef[], settings: VisualSettings, key: string, live: Map<string, number>, sharedKey: (param: string) => string): Params {
    const out: Params = {}
    live.clear()
    for (const p of defs) {
      const base = settings.params[p.id] ?? p.default
      const mods = settings.mods[p.id]
      let unit = toUnit(p, base)
      if (mods?.length) unit += this.modulator.sum(`${key}:${p.id}`, mods)
      if (this.shared.size) unit += this.shared.get(sharedKey(p.id)) ?? 0
      out[p.id] = fromUnit(p, unit)
      live.set(p.id, toUnit(p, out[p.id]))
    }
    return out
  }

  private slotFor(id: string): Slot {
    let slot = this.slots.get(id)
    if (!slot) this.slots.set(id, (slot = { layer: null, failed: null, outgoing: null, chain: null }))
    return slot
  }

  private dropGoneLayers(scene: SceneState): void {
    for (const [id, slot] of this.slots) {
      if (scene.layers.some((l) => l.id === id)) continue
      this.disposeSlot(slot)
      this.slots.delete(id)
    }
  }

  // A change of visualization starts a fade of `duration` seconds from the current one.
  private layerFor(slot: Slot, visualId: string, time: number, duration: number): Layer | null {
    const current = slot.layer
    if (current?.visualId === visualId) return current
    if (slot.failed === visualId) return null
    const fade = slot.outgoing
    // Back to the one fading out: the fade turns round from where it is.
    if (fade && current && fade.layer.visualId === visualId) {
      const p = Math.min(1, (time - fade.start) / fade.duration)
      slot.layer = fade.layer
      slot.outgoing = { layer: current, start: time - (1 - p) * fade.duration, duration: fade.duration }
      return fade.layer
    }
    fade?.layer.dispose()
    slot.outgoing = current && duration > 0 ? { layer: current, start: time, duration } : null
    if (!slot.outgoing) current?.dispose()
    slot.layer = null
    const def = getVisual(visualId)
    if (!def || !this.compositor) return null
    try {
      slot.layer = new Layer(this.compositor.gl, def)
      slot.failed = null
    } catch (err) {
      slot.failed = visualId
      slot.outgoing?.layer.dispose()
      slot.outgoing = null
      this.status.set((s) => ({ ...s, error: String(err) }))
    }
    return slot.layer
  }

  // A layer that does not show changes visualization without a fade: nobody would see it,
  // and it would play when the layer comes back.
  private hidden(l: LayerState): void {
    const slot = this.slots.get(l.id)
    if (!slot) return
    slot.outgoing?.layer.dispose()
    slot.outgoing = null
    if (slot.layer && slot.layer.visualId !== l.visual) {
      slot.layer.dispose()
      slot.layer = null
    }
  }

  private countFps(now: number): void {
    // After a pause or a hidden tab, start counting again rather than report the gap.
    if (now - this.fpsStart > 2000) {
      this.fpsStart = now
      this.fpsFrames = 0
    }
    this.fpsFrames++
    if (now - this.fpsStart < 1000) return
    const fps = Math.round((this.fpsFrames * 1000) / (now - this.fpsStart))
    this.fpsStart = now
    this.fpsFrames = 0
    if (fps !== this.status.get().fps) this.status.set((s) => ({ ...s, fps }))
    if (this.adaptive && !this.fixed) {
      const before = this.governor.level
      this.governor.update(fps, this.fpsCap || 60, now / 1000)
      if (this.governor.level !== before) this.applySize()
    }
  }
}
