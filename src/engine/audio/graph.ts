// One AudioContext for the whole app.
//
//   tracks / stream ─► playerBus ─► volume ─► speakers
//                          │
//   mic / screen ─────► inputGain ─► splitter ─► analyser L / analyser R
//
// The volume sits after the analysis branch, so turning it down never changes what the
// visuals see. External inputs (mic, screen capture) go to analysis only: playing the mic
// back would feed back, and captured tab audio is already audible in its own tab.

export class AudioGraph {
  readonly ctx: AudioContext
  readonly playerBus: GainNode
  readonly volume: GainNode
  readonly inputGain: GainNode
  readonly analyserL: AnalyserNode
  readonly analyserR: AnalyserNode
  private external: AudioNode | null = null

  constructor() {
    this.ctx = new AudioContext()
    const ctx = this.ctx
    this.playerBus = ctx.createGain()
    this.volume = ctx.createGain()
    this.inputGain = ctx.createGain()
    // Mono inputs (most microphones) are spread to both channels before the split.
    this.inputGain.channelCount = 2
    this.inputGain.channelCountMode = 'explicit'
    this.inputGain.channelInterpretation = 'speakers'
    const splitter = ctx.createChannelSplitter(2)
    this.analyserL = ctx.createAnalyser()
    this.analyserR = ctx.createAnalyser()
    for (const a of [this.analyserL, this.analyserR]) {
      a.fftSize = 2048
      a.smoothingTimeConstant = 0.8
    }
    this.playerBus.connect(this.volume).connect(ctx.destination)
    this.playerBus.connect(this.inputGain)
    this.inputGain.connect(splitter)
    splitter.connect(this.analyserL, 0)
    splitter.connect(this.analyserR, 1)
  }

  async resume(): Promise<void> {
    if (this.ctx.state === 'suspended') await this.ctx.resume()
  }

  // Replaces the current external input; null leaves analysis on the player bus only.
  setExternal(node: AudioNode | null): void {
    this.external?.disconnect()
    this.external = node
    node?.connect(this.inputGain)
  }

  // Smoothed so slider moves do not click.
  setGain(param: AudioParam, value: number): void {
    param.setTargetAtTime(value, this.ctx.currentTime, 0.015)
  }
}

let graph: AudioGraph | null = null

// Created on first use: browsers only let an AudioContext start after a user gesture.
export function getGraph(): AudioGraph {
  graph ??= new AudioGraph()
  return graph
}

export function peekGraph(): AudioGraph | null {
  return graph
}
