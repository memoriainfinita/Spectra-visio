import { createStore } from '../../core/store'
import { getGraph, peekGraph } from '../audio/graph'
import { readMeta, releaseMeta } from './metadata'
import { following, moveItem, preceding, shuffled, syncShuffled, type Repeat } from './queue'
import { baseName } from './files'
import type { PlayerPrefs } from '../../storage/session'
import type { PlayerState, Track, TrackMeta } from './types'
import { BufferVoice, ElementVoice, type Voice } from './voice'

// Decoded audio takes ~23 MB per stereo minute at 48 kHz. Longer tracks stream instead.
export const LONG_TRACK_S = 20 * 60
// Used when the duration is unknown: larger files stream.
export const LONG_TRACK_BYTES = 100 * 1024 * 1024
// Lead time for scheduled starts, so the first samples are never late.
const START_DELAY = 0.05
// Time constant (s) of a level change on a playing track.
const LEVEL_RAMP = 0.3
// "Previous" restarts the track instead when past this point.
const RESTART_THRESHOLD = 3
const META_CONCURRENCY = 2

type Source = { kind: 'buffer'; buffer: AudioBuffer } | { kind: 'element'; file: File; duration: number }

export class Player {
  readonly state = createStore<PlayerState>({
    tracks: [],
    currentId: null,
    status: 'idle',
    duration: 0,
    volume: 0.8,
    muted: false,
    shuffle: false,
    repeat: 'off',
    crossfade: 0,
    normalize: true,
    error: null,
  })

  // Levelling gain in dB for a track, from its analysis; null while it is not known. Set
  // by the app, which owns the analysis.
  levelOf: (id: string) => number | null = () => null

  private order: string[] = []
  private readonly voiceTrack = new WeakMap<Voice, string>()
  private voice: Voice | null = null
  private nextVoice: Voice | null = null
  private nextId: string | null = null
  private nextAt = 0
  private startedAt = 0
  private startOffset = 0
  private pausedAt = 0
  // Incremented by every user action; async work started under an older value is dropped.
  private op = 0
  private failures = 0
  private promoteTimer: ReturnType<typeof setTimeout> | undefined
  private readonly cache = new Map<string, Promise<Source>>()
  private readonly metaJobs = new Map<string, Promise<TrackMeta | null>>()
  private metaQueue: string[] = []
  private metaRunning = 0

  // ---- Queue -------------------------------------------------------------------------

  // Returns the new track ids, in the order of `files`.
  add(files: File[]): string[] {
    if (files.length === 0) return []
    const wasEmpty = this.state.get().tracks.length === 0
    const added: Track[] = files.map((file) => ({
      id: crypto.randomUUID(),
      name: baseName(file.name),
      file,
      size: file.size,
      meta: null,
      failed: false,
    }))
    this.setTracks([...this.state.get().tracks, ...added])
    for (const t of added) this.requestMeta(t.id)
    if (wasEmpty) void this.play(added[0].id)
    return added.map((t) => t.id)
  }

  prefs(): PlayerPrefs {
    const { volume, muted, shuffle, repeat, crossfade, normalize } = this.state.get()
    return { volume, muted, shuffle, repeat, crossfade, normalize }
  }

  applyPrefs(prefs: PlayerPrefs): void {
    this.state.set((s) => ({ ...s, ...prefs }))
    const s = this.state.get()
    const ids = s.tracks.map((t) => t.id)
    this.order = s.shuffle ? shuffled(ids, s.currentId) : ids
    this.applyVolume()
  }

  // Adds tracks restored from storage, keeping their ids. They do not start playing.
  restore(tracks: Track[], currentId: string | null, position: number): void {
    this.setTracks(tracks)
    for (const t of tracks) if (t.file) this.requestMeta(t.id)
    if (currentId && tracks.some((t) => t.id === currentId)) {
      this.pausedAt = position
      this.state.set((s) => ({ ...s, currentId, status: 'paused', duration: 0 }))
    }
  }

  // Gives a restored track its file once it is readable.
  attachFile(id: string, file: File): void {
    this.metaJobs.delete(id)
    this.updateTrack(id, (t) => ({ ...t, file, size: file.size, failed: false }))
    this.requestMeta(id)
  }

  remove(id: string): void {
    const s = this.state.get()
    const track = s.tracks.find((t) => t.id === id)
    if (!track) return
    if (s.currentId === id) {
      const after = following(this.order, id, s.repeat, false)
      const playing = s.status === 'playing' || s.status === 'loading'
      this.stopVoices()
      this.voice?.dispose()
      this.voice = null
      this.pausedAt = 0
      this.state.set((st) => ({ ...st, currentId: after === id ? null : after, status: 'idle', duration: 0 }))
      if (playing && after && after !== id) void this.play(after)
    }
    releaseMeta(track.meta)
    this.cache.delete(id)
    this.metaJobs.delete(id)
    this.setTracks(this.state.get().tracks.filter((t) => t.id !== id))
    if (this.state.get().tracks.length === 0) this.stop()
    else this.rescheduleNext()
  }

  move(from: number, to: number): void {
    this.setTracks(moveItem(this.state.get().tracks, from, to))
    this.rescheduleNext()
  }

  clear(): void {
    this.stop()
    for (const t of this.state.get().tracks) releaseMeta(t.meta)
    this.cache.clear()
    this.metaJobs.clear()
    this.metaQueue = []
    this.setTracks([])
    this.state.set((s) => ({ ...s, currentId: null, error: null }))
  }

  private setTracks(tracks: Track[]): void {
    const ids = tracks.map((t) => t.id)
    const s = this.state.get()
    this.order = s.shuffle ? syncShuffled(this.order, ids, s.currentId) : ids
    this.state.set((st) => ({ ...st, tracks }))
  }

  private updateTrack(id: string, update: (t: Track) => Track): void {
    this.state.set((s) => ({ ...s, tracks: s.tracks.map((t) => (t.id === id ? update(t) : t)) }))
  }

  // ---- Transport ---------------------------------------------------------------------

  position(): number {
    const graph = peekGraph()
    const s = this.state.get()
    if (s.status !== 'playing' || !graph || !this.voice) return this.pausedAt
    const p = this.startOffset + Math.max(0, graph.ctx.currentTime - this.startedAt)
    return Math.min(p, this.voice.duration)
  }

  async play(id?: string): Promise<void> {
    const s = this.state.get()
    const target = id ?? s.currentId ?? this.order[0] ?? null
    if (!target) return
    if (id === undefined && target === s.currentId && this.voice && s.status === 'paused') {
      await this.resumeAt(this.pausedAt)
      return
    }
    await this.load(target, id === undefined && target === s.currentId ? this.pausedAt : 0)
  }

  pause(): void {
    if (this.state.get().status !== 'playing') return
    this.pausedAt = this.position()
    this.op++
    this.stopVoices()
    this.state.set((s) => ({ ...s, status: 'paused' }))
  }

  toggle(): void {
    if (this.state.get().status === 'playing') this.pause()
    else void this.play()
  }

  stop(): void {
    this.op++
    this.stopVoices()
    this.voice?.dispose()
    this.voice = null
    this.pausedAt = 0
    this.state.set((s) => ({ ...s, status: 'idle' }))
  }

  seek(seconds: number): void {
    const s = this.state.get()
    const t = Math.max(0, Math.min(seconds, s.duration || seconds))
    if (s.status === 'playing') {
      void this.resumeAt(t)
    } else {
      this.pausedAt = t
      // Re-render the position while paused.
      this.state.set((st) => ({ ...st }))
    }
  }

  next(): void {
    const s = this.state.get()
    const target = following(this.order, s.currentId, s.repeat, false)
    this.jump(target)
  }

  previous(): void {
    if (this.position() > RESTART_THRESHOLD) {
      this.seek(0)
      return
    }
    const s = this.state.get()
    this.jump(preceding(this.order, s.currentId, s.repeat))
  }

  private jump(target: string | null): void {
    const s = this.state.get()
    if (!target) {
      this.stop()
      return
    }
    if (s.status === 'playing' || s.status === 'loading') {
      void this.load(target, 0)
      return
    }
    this.op++
    this.stopVoices()
    this.voice?.dispose()
    this.voice = null
    this.pausedAt = 0
    this.state.set((st) => ({ ...st, currentId: target, status: st.status === 'idle' ? 'idle' : 'paused', duration: 0 }))
  }

  // ---- Options -----------------------------------------------------------------------

  setVolume(volume: number): void {
    this.state.set((s) => ({ ...s, volume: Math.max(0, Math.min(1, volume)) }))
    this.applyVolume()
  }

  setMuted(muted: boolean): void {
    this.state.set((s) => ({ ...s, muted }))
    this.applyVolume()
  }

  setShuffle(shuffle: boolean): void {
    const s = this.state.get()
    const ids = s.tracks.map((t) => t.id)
    this.order = shuffle ? shuffled(ids, s.currentId) : ids
    this.state.set((st) => ({ ...st, shuffle }))
    this.rescheduleNext()
  }

  setRepeat(repeat: Repeat): void {
    this.state.set((s) => ({ ...s, repeat }))
    this.rescheduleNext()
  }

  setCrossfade(seconds: number): void {
    this.state.set((s) => ({ ...s, crossfade: Math.max(0, Math.min(12, seconds)) }))
    this.rescheduleNext()
  }

  setNormalize(normalize: boolean): void {
    this.state.set((s) => ({ ...s, normalize }))
    this.refreshLevels()
  }

  // dB that levelling adds to a track now; 0 when it is off or the track is not analysed.
  appliedLevel(id: string): number {
    return this.state.get().normalize ? (this.levelOf(id) ?? 0) : 0
  }

  // Applies the levels again, for an analysis that has just finished.
  refreshLevels(): void {
    for (const voice of [this.voice, this.nextVoice]) if (voice) this.applyLevel(voice, false)
  }

  applyVolume(): void {
    const graph = peekGraph()
    if (!graph) return
    const s = this.state.get()
    graph.setGain(graph.volume.gain, s.muted ? 0 : s.volume)
  }

  // ---- Playback internals ------------------------------------------------------------

  private async load(id: string, offset: number): Promise<void> {
    const op = ++this.op
    this.stopVoices()
    this.voice?.dispose()
    this.voice = null
    this.pausedAt = offset
    this.state.set((s) => ({ ...s, currentId: id, status: 'loading', duration: 0, error: null }))
    const graph = getGraph()
    this.applyVolume()
    await graph.resume()
    let source: Source
    try {
      source = await this.source(id)
    } catch {
      if (op !== this.op) return
      this.trackFailed(id)
      return
    }
    if (op !== this.op) return
    this.failures = 0
    this.voice = this.makeVoice(source, id)
    this.startVoice(offset)
  }

  private async resumeAt(offset: number): Promise<void> {
    const id = this.state.get().currentId
    if (!this.voice || !id) {
      if (id) await this.load(id, offset)
      return
    }
    this.op++
    const op = this.op
    this.stopVoices()
    // position() reports the target right away, not the old point, while the context resumes.
    const graph = getGraph()
    this.startOffset = offset
    this.startedAt = graph.ctx.currentTime + START_DELAY
    await graph.resume()
    if (op === this.op) this.startVoice(offset)
  }

  private startVoice(offset: number): void {
    const voice = this.voice
    if (!voice) return
    const ctx = getGraph().ctx
    const when = ctx.currentTime + START_DELAY
    voice.fade.gain.cancelScheduledValues(0)
    voice.fade.gain.setValueAtTime(1, ctx.currentTime)
    voice.onEnded = () => this.voiceEnded(voice)
    voice.start(when, offset)
    this.startedAt = when
    this.startOffset = offset
    this.state.set((s) => ({ ...s, status: 'playing', duration: voice.duration }))
    void this.prepareNext()
  }

  // Decodes the following track and schedules it to start exactly when the current one
  // ends, or `crossfade` seconds earlier with gain ramps on both.
  private async prepareNext(): Promise<void> {
    const op = this.op
    const s = this.state.get()
    const current = s.currentId
    const nextId = following(this.order, current, s.repeat, true)
    this.evict([current, nextId])
    if (!nextId || !this.voice) return
    let source: Source
    try {
      source = await this.source(nextId)
    } catch {
      return
    }
    const voice = this.voice
    if (op !== this.op || this.state.get().currentId !== current || !voice || this.nextVoice) return
    const ctx = getGraph().ctx
    const next = this.makeVoice(source, nextId)
    const endAt = this.startedAt + (voice.duration - this.startOffset)
    let fade = Math.min(this.state.get().crossfade, voice.duration / 2, next.duration / 2)
    let at = endAt - fade
    if (at < ctx.currentTime + START_DELAY) {
      at = ctx.currentTime + START_DELAY
      fade = Math.max(0, Math.min(fade, endAt - at))
    }
    if (fade > 0) {
      next.fade.gain.setValueAtTime(0, ctx.currentTime)
      next.fade.gain.setValueAtTime(0, at)
      next.fade.gain.linearRampToValueAtTime(1, at + fade)
      voice.fade.gain.setValueAtTime(1, at)
      voice.fade.gain.linearRampToValueAtTime(0, at + fade)
    } else {
      next.fade.gain.setValueAtTime(1, ctx.currentTime)
    }
    next.onEnded = () => this.voiceEnded(next)
    next.start(at, 0)
    this.nextVoice = next
    this.nextId = nextId
    this.nextAt = at
    this.promoteTimer = setTimeout(() => this.promote(), Math.max(0, (at - ctx.currentTime) * 1000))
  }

  // The scheduled next voice has started: it becomes the current one.
  private promote(): void {
    const next = this.nextVoice
    const nextId = this.nextId
    if (!next || !nextId) return
    clearTimeout(this.promoteTimer)
    const old = this.voice
    if (old) {
      old.onEnded = null
      // Leave it to finish its fade-out, then free it.
      const left = Math.max(0, this.startedAt + (old.duration - this.startOffset) - getGraph().ctx.currentTime)
      setTimeout(() => old.dispose(), (left + 0.5) * 1000)
    }
    this.voice = next
    this.nextVoice = null
    this.nextId = null
    this.startedAt = this.nextAt
    this.startOffset = 0
    this.state.set((s) => ({ ...s, currentId: nextId, duration: next.duration }))
    void this.prepareNext()
  }

  private voiceEnded(voice: Voice): void {
    if (voice !== this.voice) return
    if (this.nextVoice) {
      this.promote()
      return
    }
    // Nothing scheduled: either the end of the list or the next track was not ready.
    const s = this.state.get()
    const target = following(this.order, s.currentId, s.repeat, true)
    if (target) {
      void this.load(target, 0)
    } else {
      this.voice?.dispose()
      this.voice = null
      this.pausedAt = 0
      this.state.set((st) => ({ ...st, status: 'idle' }))
    }
  }

  private rescheduleNext(): void {
    if (this.state.get().status !== 'playing' || !this.voice) return
    clearTimeout(this.promoteTimer)
    this.nextVoice?.dispose()
    this.nextVoice = null
    this.nextId = null
    const ctx = getGraph().ctx
    this.voice.fade.gain.cancelScheduledValues(0)
    this.voice.fade.gain.setValueAtTime(1, ctx.currentTime)
    void this.prepareNext()
  }

  private stopVoices(): void {
    clearTimeout(this.promoteTimer)
    this.voice?.stop()
    this.nextVoice?.dispose()
    this.nextVoice = null
    this.nextId = null
  }

  private trackFailed(id: string): void {
    const track = this.state.get().tracks.find((t) => t.id === id)
    this.updateTrack(id, (t) => ({ ...t, failed: true }))
    this.cache.delete(id)
    this.failures++
    this.state.set((s) => ({ ...s, status: 'idle', error: { key: 'player.error.decode', name: track?.name } }))
    // Skip to the next one, unless every track has failed in a row.
    if (this.failures >= this.state.get().tracks.length) {
      this.failures = 0
      return
    }
    const target = following(this.order, id, this.state.get().repeat, false)
    if (target && target !== id) void this.load(target, 0)
  }

  private makeVoice(source: Source, id: string): Voice {
    const graph = getGraph()
    const voice =
      source.kind === 'buffer'
        ? new BufferVoice(graph.ctx, source.buffer, graph.playerBus)
        : new ElementVoice(graph.ctx, source.file, source.duration, graph.playerBus)
    this.voiceTrack.set(voice, id)
    this.applyLevel(voice, true)
    return voice
  }

  // Sets a voice's levelling gain: at once for a new voice, smoothly for one that plays.
  private applyLevel(voice: Voice, now: boolean): void {
    const id = this.voiceTrack.get(voice)
    const graph = peekGraph()
    if (!id || !graph) return
    const gain = 10 ** (this.appliedLevel(id) / 20)
    if (now) voice.level.gain.value = gain
    else voice.level.gain.setTargetAtTime(gain, graph.ctx.currentTime, LEVEL_RAMP)
  }

  private source(id: string): Promise<Source> {
    let job = this.cache.get(id)
    if (!job) {
      job = this.decode(id)
      this.cache.set(id, job)
      job.catch(() => this.cache.delete(id))
    }
    return job
  }

  private async decode(id: string): Promise<Source> {
    const track = this.state.get().tracks.find((t) => t.id === id)
    if (!track?.file) throw new Error('no file')
    const meta = await this.meta(id)
    const duration = meta?.duration
    const long = duration !== undefined ? duration > LONG_TRACK_S : track.size > LONG_TRACK_BYTES
    if (long) return { kind: 'element', file: track.file, duration: duration ?? 0 }
    const buffer = await getGraph().ctx.decodeAudioData(await track.file.arrayBuffer())
    return { kind: 'buffer', buffer }
  }

  // Keeps decoded audio only for the current and next tracks.
  private evict(keep: (string | null)[]): void {
    for (const id of this.cache.keys()) if (!keep.includes(id)) this.cache.delete(id)
  }

  // ---- Metadata ----------------------------------------------------------------------

  private requestMeta(id: string): void {
    if (this.metaJobs.has(id) || this.metaQueue.includes(id)) return
    this.metaQueue.push(id)
    this.pumpMeta()
  }

  // Tags are read a couple at a time so a large folder does not stall playback.
  private pumpMeta(): void {
    while (this.metaRunning < META_CONCURRENCY && this.metaQueue.length) {
      const id = this.metaQueue.shift()!
      this.metaRunning++
      void this.meta(id).finally(() => {
        this.metaRunning--
        this.pumpMeta()
      })
    }
  }

  private meta(id: string): Promise<TrackMeta | null> {
    let job = this.metaJobs.get(id)
    if (!job) {
      this.metaQueue = this.metaQueue.filter((q) => q !== id)
      job = this.readTrackMeta(id)
      this.metaJobs.set(id, job)
    }
    return job
  }

  private async readTrackMeta(id: string): Promise<TrackMeta | null> {
    const track = this.state.get().tracks.find((t) => t.id === id)
    if (!track?.file) return null
    let meta: TrackMeta
    try {
      meta = await readMeta(track.file)
    } catch {
      meta = {}
    }
    if (!this.state.get().tracks.some((t) => t.id === id)) {
      releaseMeta(meta)
      return null
    }
    this.updateTrack(id, (t) => ({ ...t, meta }))
    if (this.state.get().currentId === id) this.state.set((s) => ({ ...s }))
    return meta
  }
}
