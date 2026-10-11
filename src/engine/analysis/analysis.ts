import { createStore } from '../../core/store'
import type { AnalysisSettings } from '../../storage/settings'
import { peekGraph } from '../audio/graph'
import { Analyzer, FFT_SIZE, createFrame, type AnalysisFrame, type ExternalClock, type TempoMode, type TrackClock } from './analyzer'
import { DelayLine } from './delay'

// 256 frames hold over a second at 240 fps, more than the longest delay.
const RING_SIZE = 256
export const MAX_DELAY_MS = 1000
const PUBLISH_EVERY_MS = 250

// Without outputLatency the browser gives no usable figure; the manual offset covers it.
export const latencyReported = typeof AudioContext !== 'undefined' && 'outputLatency' in AudioContext.prototype

export interface TempoState {
  bpm: number | null
  confidence: number
  mode: TempoMode
}

export interface LatencyState {
  // What the browser reports (base + output latency); null where it reports nothing.
  reported: number | null
  // Delay applied to the visuals.
  applied: number
}

// Runs the analysis once per animation frame and keeps the frames for delayed reading.
// UI-facing values (tempo, latency) are published a few times a second, not per frame.
export class Analysis {
  readonly tempo = createStore<TempoState>({ bpm: null, confidence: 0, mode: 'auto' })
  readonly latency = createStore<LatencyState>({ reported: null, applied: 0 })

  private readonly analyzer = new Analyzer()
  private readonly line = new DelayLine(RING_SIZE, createFrame)
  private readonly specL = new Float32Array(FFT_SIZE / 2)
  private readonly specR = new Float32Array(FFT_SIZE / 2)
  private readonly waveL = new Float32Array(FFT_SIZE)
  private readonly waveR = new Float32Array(FFT_SIZE)
  private readonly settings: () => AnalysisSettings
  private raf = 0
  private lastPublish = -Infinity
  // The file playing with what its analysis beforehand found; set by the app.
  trackSource: (() => TrackClock | null) | null = null
  // An external clock read at a given time; set by the app.
  clockSource: ((time: number) => ExternalClock | null) | null = null

  constructor(settings: () => AnalysisSettings) {
    this.settings = settings
  }

  start(): void {
    if (this.raf) return
    const loop = (now: number) => {
      this.tick(now)
      this.raf = requestAnimationFrame(loop)
    }
    this.raf = requestAnimationFrame(loop)
  }

  stop(): void {
    cancelAnimationFrame(this.raf)
    this.raf = 0
  }

  tick(now: number): void {
    const graph = peekGraph()
    if (!graph) return
    graph.analyserL.getFloatFrequencyData(this.specL)
    graph.analyserR.getFloatFrequencyData(this.specR)
    graph.analyserL.getFloatTimeDomainData(this.waveL)
    graph.analyserR.getFloatTimeDomainData(this.waveR)
    const input = {
      specL: this.specL,
      specR: this.specR,
      waveL: this.waveL,
      waveR: this.waveR,
      sampleRate: graph.ctx.sampleRate,
      track: this.trackSource?.() ?? null,
      // The frame is seen after the output delay: the clock is read for that moment.
      clock: this.clockSource?.(now + this.delayMs()) ?? null,
    }
    this.analyzer.process(input, now, this.settings(), this.line.next())
    if (now - this.lastPublish >= PUBLISH_EVERY_MS) {
      this.lastPublish = now
      this.publish()
    }
  }

  // The frame matching the audio heard now.
  frame(now = performance.now()): AnalysisFrame | null {
    return this.line.read(now, this.delayMs())
  }

  delayMs(): number {
    const s = this.settings()
    const auto = s.autoLatency ? (this.reportedLatency() ?? 0) : 0
    return Math.max(0, Math.min(MAX_DELAY_MS, auto + s.latencyOffset))
  }

  // Taps follow what is heard, so they are moved back onto the analysis clock.
  tap(now = performance.now()): void {
    this.analyzer.tap(now - this.delayMs())
    this.publish()
  }

  useAutoTempo(): void {
    this.analyzer.useAutoTempo()
    this.publish()
  }

  // Null before the AudioContext exists (first play) or where the browser reports nothing.
  private reportedLatency(): number | null {
    const ctx = peekGraph()?.ctx
    if (!ctx || !latencyReported) return null
    return (ctx.baseLatency + ctx.outputLatency) * 1000
  }

  private publish(): void {
    const newest = this.line.newest()
    const bpm = this.analyzer.bpm()
    const tempo: TempoState = {
      bpm: bpm === null ? null : Math.round(bpm * 10) / 10,
      confidence: Math.round((newest?.tempoConfidence ?? 0) * 20) / 20,
      mode: this.analyzer.tempoMode,
    }
    const t = this.tempo.get()
    if (t.bpm !== tempo.bpm || t.confidence !== tempo.confidence || t.mode !== tempo.mode) this.tempo.set(tempo)
    const reported = this.reportedLatency()
    const latency = { reported: reported === null ? null : Math.round(reported), applied: Math.round(this.delayMs()) }
    const l = this.latency.get()
    if (l.reported !== latency.reported || l.applied !== latency.applied) this.latency.set(latency)
  }
}
