import { Target } from '../render/gl'
import type { Params, Surface, VisualFrame } from '../render/visual'
import type { EffectInstance } from './effect'
import { getEffect } from './registry'

export interface ChainStep {
  // Instance id from the scene: keeps the history of trails and feedback per entry.
  id: string
  type: string
  params: Params
}

// Runs the enabled effects of one chain in order: a layer's or the composition's.
// Instances live while their entry stays enabled; a disabled or removed one is dropped,
// so turning it back on starts from a clean history.
export class EffectChain {
  // Free for the caller to draw the chain's input into.
  readonly input: Target
  private readonly gl: WebGL2RenderingContext
  private readonly scratch: [Target, Target]
  private readonly instances = new Map<string, { type: string; instance: EffectInstance }>()
  private readonly failed = new Set<string>()
  onError: (message: string) => void = () => {}

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl
    this.input = new Target(gl)
    this.scratch = [new Target(gl), new Target(gl)]
  }

  resize(s: Surface): void {
    this.input.size(s.width, s.height)
    for (const t of this.scratch) t.size(s.width, s.height)
  }

  // Drops instances that are no longer in `steps`.
  sync(steps: readonly ChainStep[]): void {
    for (const [id, entry] of this.instances) {
      if (!steps.some((s) => s.id === id && s.type === entry.type)) {
        entry.instance.dispose()
        this.instances.delete(id)
      }
    }
    for (const id of this.failed) if (!steps.some((s) => s.id === id)) this.failed.delete(id)
  }

  // Runs the steps over `src` and returns the texture holding the result.
  run(src: WebGLTexture, steps: readonly ChainStep[], frame: VisualFrame, surface: Surface): WebGLTexture {
    for (const step of steps) {
      const instance = this.instanceFor(step)
      if (!instance) continue
      const out = this.scratch[0].texture === src ? this.scratch[1] : this.scratch[0]
      src = instance.render({ src, out, params: step.params, frame, surface })
    }
    return src
  }

  dispose(): void {
    for (const { instance } of this.instances.values()) instance.dispose()
    this.instances.clear()
    this.input.dispose()
    for (const t of this.scratch) t.dispose()
  }

  private instanceFor(step: ChainStep): EffectInstance | null {
    const entry = this.instances.get(step.id)
    if (entry) return entry.instance
    // An effect that failed to start is not retried every frame.
    if (this.failed.has(step.id)) return null
    const def = getEffect(step.type)
    if (!def) return null
    try {
      const instance = def.create(this.gl)
      this.instances.set(step.id, { type: step.type, instance })
      return instance
    } catch (err) {
      this.failed.add(step.id)
      this.onError(String(err))
      return null
    }
  }
}
