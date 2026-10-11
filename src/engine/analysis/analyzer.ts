import { BeatDetector } from './beat'
import { KICK_EDGES, MAX_HZ, MIN_HZ, NAMED_BANDS, NAMED_EDGES, bandPower, binWeights, dbToPower, logEdges, powerToDb, type BinWeights } from './bands'
import { AutoLevel, FIXED_REFERENCE_DB, dbToLevel, follow, smoothCoefficients } from './level'
import { stereoStats, type StereoStats } from './stereo'
import { ONSET_WINDOW_MS, TapTempo, beatPhase, estimateTempo, type TempoEstimate } from './tempo'

// 85 ms at 48 kHz: 11.7 Hz bins, enough to split the sub-bass from the bass.
export const FFT_SIZE = 4096
export const WAVE_SIZE = 1024
export const MAX_BANDS = 64
// Beat slots: one per named band, then the kick, then section changes (files analysed
// beforehand only).
export const KICK = NAMED_BANDS.length
export const SECTION = NAMED_BANDS.length + 1
export const BEAT_SLOTS = NAMED_BANDS.length + 2

const ESTIMATE_EVERY_MS = 500
// A kick this close to the predicted beat (share of a period) re-syncs the beat phase.
const RESYNC_WINDOW = 0.2
// Longest step between frames taken into account; longer gaps (a hidden tab) count as this.
const MAX_DT_S = 0.1
// A track position that moves by more than this between frames was a seek: no section
// change is reported for the stretch it skipped.
const MAX_SECTION_STEP_S = 0.5

export interface AnalysisOptions {
  bands: number
  // 0–1: 0 raw, 1 slowest.
  smoothing: number
  autoLevel: boolean
}

// 'track': the beat grid of a file analysed beforehand.
export type TempoMode = 'auto' | 'tap' | 'track'

// The file playing, when it was analysed beforehand.
export interface TrackClock {
  id: string
  // Seconds into the track at the moment analysed.
  position: number
  // Beat grid; bpm null when the track has none.
  bpm: number | null
  offset: number
  sections: readonly number[]
  // Level that maps to 1, from the track's loudness; null keeps the usual levelling.
  referenceDb: number | null
}

// Everything the visuals read, for one moment of the audio.
export interface AnalysisFrame {
  // performance.now() milliseconds when the audio was analysed.
  time: number
  bandCount: number
  // Log bands, smoothed, 0–1; only the first bandCount values are valid.
  bands: Float32Array
  bandsL: Float32Array
  bandsR: Float32Array
  // NAMED_BANDS order, smoothed, 0–1.
  named: Float32Array
  // Running onset count per named band, kick last. A consumer compares with the count it
  // saw before, so no onset is lost when it skips frames.
  beats: Uint32Array
  waveL: Float32Array
  waveR: Float32Array
  stereo: StereoStats
  // 0 while unknown.
  bpm: number
  tempoMode: TempoMode
  tempoConfidence: number
  // 0–1 position within the current beat.
  phase: number
  // Level that maps to 1, in dBFS.
  referenceDb: number
}

export function createFrame(): AnalysisFrame {
  return {
    time: 0,
    bandCount: 0,
    bands: new Float32Array(MAX_BANDS),
    bandsL: new Float32Array(MAX_BANDS),
    bandsR: new Float32Array(MAX_BANDS),
    named: new Float32Array(NAMED_BANDS.length),
    beats: new Uint32Array(BEAT_SLOTS),
    waveL: new Float32Array(WAVE_SIZE),
    waveR: new Float32Array(WAVE_SIZE),
    stereo: { rmsL: 0, rmsR: 0, balance: 0, correlation: 0 },
    bpm: 0,
    tempoMode: 'auto',
    tempoConfidence: 0,
    phase: 0,
    referenceDb: FIXED_REFERENCE_DB,
  }
}

export interface AnalyserInput {
  // Decibels per bin, FFT_SIZE / 2 values (getFloatFrequencyData).
  specL: Float32Array
  specR: Float32Array
  // Samples, FFT_SIZE values (getFloatTimeDomainData).
  waveL: Float32Array
  waveR: Float32Array
  sampleRate: number
  track?: TrackClock | null
}

interface Layout {
  sampleRate: number
  count: number
  bands: BinWeights[]
  named: BinWeights[]
  kick: BinWeights
}

export class Analyzer {
  private layout: Layout | null = null
  private readonly powL = new Float32Array(FFT_SIZE / 2)
  private readonly powR = new Float32Array(FFT_SIZE / 2)
  private readonly powMid = new Float32Array(FFT_SIZE / 2)
  private readonly sm = { mid: new Float32Array(MAX_BANDS), l: new Float32Array(MAX_BANDS), r: new Float32Array(MAX_BANDS), named: new Float32Array(NAMED_BANDS.length) }
  private readonly detectors = Array.from({ length: BEAT_SLOTS }, () => new BeatDetector())
  private readonly beatCounts = new Uint32Array(BEAT_SLOTS)
  private readonly autoLevel = new AutoLevel()
  private readonly stereo: StereoStats = { rmsL: 0, rmsR: 0, balance: 0, correlation: 0 }
  private readonly namedDb = new Float64Array(NAMED_BANDS.length)
  private onsets: number[] = []
  private estimate: TempoEstimate | null = null
  private lastEstimate = -Infinity
  private readonly taps = new TapTempo()
  private mode: 'auto' | 'tap' = 'auto'
  private anchor = 0
  private lastTime: number | null = null
  // The track playing, while its grid sets the tempo.
  private grid: TrackClock | null = null
  private trackId: string | null = null
  private trackPos = 0

  process(input: AnalyserInput, now: number, opts: AnalysisOptions, out: AnalysisFrame): void {
    const dt = this.lastTime === null ? 0 : Math.min(MAX_DT_S, Math.max(0, (now - this.lastTime) / 1000))
    this.lastTime = now
    const layout = this.layoutFor(input.sampleRate, opts.bands)
    dbToPower(input.specL, this.powL)
    dbToPower(input.specR, this.powR)
    for (let i = 0; i < this.powMid.length; i++) this.powMid[i] = (this.powL[i] + this.powR[i]) / 2

    let loudest = -Infinity
    for (let i = 0; i < layout.named.length; i++) {
      this.namedDb[i] = powerToDb(bandPower(this.powMid, layout.named[i]))
      loudest = Math.max(loudest, this.namedDb[i])
    }
    const track = input.track ?? null
    // The automatic level keeps following, ready for when the track's level no longer applies.
    const auto = this.autoLevel.update(loudest, dt)
    const ref = track?.referenceDb ?? (opts.autoLevel ? auto : FIXED_REFERENCE_DB)
    const k = smoothCoefficients(opts.smoothing, dt)

    for (let i = 0; i < layout.count; i++) {
      const band = layout.bands[i]
      this.sm.mid[i] = follow(this.sm.mid[i], dbToLevel(powerToDb(bandPower(this.powMid, band)), ref), k)
      this.sm.l[i] = follow(this.sm.l[i], dbToLevel(powerToDb(bandPower(this.powL, band)), ref), k)
      this.sm.r[i] = follow(this.sm.r[i], dbToLevel(powerToDb(bandPower(this.powR, band)), ref), k)
    }

    // Onsets read the raw levels: smoothing would blunt the attacks they look for.
    for (let i = 0; i < NAMED_BANDS.length; i++) {
      const level = dbToLevel(this.namedDb[i], ref)
      this.sm.named[i] = follow(this.sm.named[i], level, k)
      if (this.detectors[i].update(level, dt, now)) this.beatCounts[i]++
    }
    const kickLevel = dbToLevel(powerToDb(bandPower(this.powMid, layout.kick)), ref)
    if (this.detectors[KICK].update(kickLevel, dt, now)) {
      this.beatCounts[KICK]++
      this.onKick(now)
    }
    this.updateEstimate(now)
    this.followTrack(track)

    out.time = now
    out.bandCount = layout.count
    out.bands.set(this.sm.mid)
    out.bandsL.set(this.sm.l)
    out.bandsR.set(this.sm.r)
    out.named.set(this.sm.named)
    out.beats.set(this.beatCounts)
    out.waveL.set(input.waveL.subarray(input.waveL.length - WAVE_SIZE))
    out.waveR.set(input.waveR.subarray(input.waveR.length - WAVE_SIZE))
    Object.assign(out.stereo, stereoStats(input.waveL, input.waveR, this.stereo))
    const bpm = this.bpm()
    out.bpm = bpm ?? 0
    out.tempoMode = this.tempoMode
    out.tempoConfidence = this.mode === 'tap' || this.grid ? 1 : (this.estimate?.confidence ?? 0)
    out.phase = this.grid ? gridPhase(this.grid) : bpm ? beatPhase(now, this.anchor, bpm) : 0
    out.referenceDb = ref
  }

  bpm(): number | null {
    if (this.mode === 'tap') return this.taps.bpm()
    return this.grid?.bpm ?? this.estimate?.bpm ?? null
  }

  // `time` is on the analysis clock: the caller subtracts the output delay from the moment
  // of the tap, because the user taps along with what they hear.
  tap(time: number): void {
    if (this.taps.tap(time) === null) return
    this.mode = 'tap'
    this.anchor = time
  }

  useAutoTempo(): void {
    this.mode = 'auto'
    const last = this.onsets.at(-1)
    if (last !== undefined) this.anchor = last
  }

  get tempoMode(): TempoMode {
    return this.mode === 'auto' && this.grid ? 'track' : this.mode
  }

  // Counts the section changes the track position passed since the last frame, and takes
  // the track's grid for the tempo unless it is tapped.
  private followTrack(track: TrackClock | null): void {
    this.grid = track?.bpm && this.mode === 'auto' ? track : null
    if (!track) {
      this.trackId = null
      return
    }
    const from = this.trackPos
    const to = track.position
    if (track.id === this.trackId && to >= from && to - from < MAX_SECTION_STEP_S && track.sections.some((t) => t > from && t <= to)) {
      this.beatCounts[SECTION]++
    }
    this.trackId = track.id
    this.trackPos = to
  }

  private onKick(now: number): void {
    this.onsets.push(now)
    if (this.mode !== 'auto') return
    const bpm = this.estimate?.bpm
    if (!bpm) {
      this.anchor = now
      return
    }
    const p = beatPhase(now, this.anchor, bpm)
    if (p < RESYNC_WINDOW || p > 1 - RESYNC_WINDOW) this.anchor = now
  }

  private updateEstimate(now: number): void {
    if (now - this.lastEstimate < ESTIMATE_EVERY_MS) return
    this.lastEstimate = now
    while (this.onsets.length && now - this.onsets[0] > ONSET_WINDOW_MS) this.onsets.shift()
    this.estimate = estimateTempo(this.onsets)
  }

  private layoutFor(sampleRate: number, count: number): Layout {
    const n = Math.max(1, Math.min(MAX_BANDS, Math.round(count)))
    if (this.layout && this.layout.sampleRate === sampleRate && this.layout.count === n) return this.layout
    const edges = logEdges(n, MIN_HZ, MAX_HZ)
    this.layout = {
      sampleRate,
      count: n,
      bands: Array.from({ length: n }, (_, i) => binWeights(edges[i], edges[i + 1], sampleRate, FFT_SIZE)),
      named: NAMED_BANDS.map((b) => binWeights(NAMED_EDGES[b][0], NAMED_EDGES[b][1], sampleRate, FFT_SIZE)),
      kick: binWeights(KICK_EDGES[0], KICK_EDGES[1], sampleRate, FFT_SIZE),
    }
    return this.layout
  }
}

function gridPhase(g: TrackClock): number {
  const p = ((g.position - g.offset) * (g.bpm ?? 0)) / 60
  return p - Math.floor(p)
}
