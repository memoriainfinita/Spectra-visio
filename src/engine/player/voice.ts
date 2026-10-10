// A voice plays one track once, from an offset, at a scheduled AudioContext time.
// BufferVoice plays decoded audio and is sample-exact, which gapless and crossfades need.
// ElementVoice streams through <audio> for tracks too long to keep decoded in memory;
// its start is timer-driven and leaves a gap of a few milliseconds.

export interface Voice {
  readonly duration: number
  // Per-voice gain, used for crossfades.
  readonly fade: GainNode
  start(when: number, offset: number): void
  stop(): void
  dispose(): void
  onEnded: (() => void) | null
}

export class BufferVoice implements Voice {
  readonly fade: GainNode
  onEnded: (() => void) | null = null
  private node: AudioBufferSourceNode | null = null
  private readonly ctx: BaseAudioContext
  private readonly buffer: AudioBuffer

  constructor(ctx: BaseAudioContext, buffer: AudioBuffer, destination: AudioNode) {
    this.ctx = ctx
    this.buffer = buffer
    this.fade = ctx.createGain()
    this.fade.connect(destination)
  }

  get duration(): number {
    return this.buffer.duration
  }

  start(when: number, offset: number): void {
    this.stop()
    // A source node plays once; every start needs a new one.
    const node = this.ctx.createBufferSource()
    node.buffer = this.buffer
    node.connect(this.fade)
    node.onended = () => {
      if (this.node === node) {
        this.node = null
        this.onEnded?.()
      }
    }
    node.start(when, Math.min(offset, this.buffer.duration))
    this.node = node
  }

  stop(): void {
    const node = this.node
    this.node = null
    if (!node) return
    node.onended = null
    try {
      node.stop()
    } catch {
      // Already stopped.
    }
    node.disconnect()
  }

  dispose(): void {
    this.stop()
    this.fade.disconnect()
  }
}

export class ElementVoice implements Voice {
  readonly fade: GainNode
  onEnded: (() => void) | null = null
  private readonly el: HTMLAudioElement
  private readonly source: MediaElementAudioSourceNode
  private readonly ctx: AudioContext
  private readonly knownDuration: number
  private readonly url: string
  private timer: ReturnType<typeof setTimeout> | undefined

  constructor(ctx: AudioContext, file: File, duration: number, destination: AudioNode) {
    this.ctx = ctx
    this.url = URL.createObjectURL(file)
    this.el = new Audio()
    this.el.preload = 'auto'
    this.el.src = this.url
    this.source = ctx.createMediaElementSource(this.el)
    this.fade = ctx.createGain()
    this.source.connect(this.fade).connect(destination)
    this.knownDuration = duration
    this.el.addEventListener('ended', () => this.onEnded?.())
  }

  get duration(): number {
    return Number.isFinite(this.el.duration) ? this.el.duration : this.knownDuration
  }

  start(when: number, offset: number): void {
    this.stop()
    this.el.currentTime = offset
    const delay = Math.max(0, (when - this.ctx.currentTime) * 1000)
    this.timer = setTimeout(() => {
      void this.el.play().catch(() => this.onEnded?.())
    }, delay)
  }

  stop(): void {
    clearTimeout(this.timer)
    this.el.pause()
  }

  dispose(): void {
    this.stop()
    this.source.disconnect()
    this.fade.disconnect()
    this.el.removeAttribute('src')
    this.el.load()
    URL.revokeObjectURL(this.url)
  }
}
