import type { PixelSize } from '../output/format'

// Recording of the output canvas with the sound, through MediaRecorder. The pieces it hands
// out go to a sink as they come, so a long recording never sits in memory.

export const RECORD_FPS = [30, 60] as const
export type RecordFps = (typeof RECORD_FPS)[number]

export const RECORD_QUALITIES = ['standard', 'high', 'max'] as const
export type RecordQuality = (typeof RECORD_QUALITIES)[number]

export interface RecordSettings {
  fps: RecordFps
  quality: RecordQuality
}

export const DEFAULT_RECORD: RecordSettings = { fps: 60, quality: 'high' }

export function normalizeRecord(raw: unknown): RecordSettings {
  if (typeof raw !== 'object' || raw === null) return { ...DEFAULT_RECORD }
  const r = raw as Record<string, unknown>
  return {
    fps: (RECORD_FPS as readonly unknown[]).includes(r.fps) ? (r.fps as RecordFps) : DEFAULT_RECORD.fps,
    quality: (RECORD_QUALITIES as readonly unknown[]).includes(r.quality) ? (r.quality as RecordQuality) : DEFAULT_RECORD.quality,
  }
}

// Bits per pixel per frame for each quality: 1080p at 60 fps is 7.5, 12.4 and 24.9 Mbps.
const BITS_PER_PIXEL: Record<RecordQuality, number> = { standard: 0.06, high: 0.1, max: 0.2 }
const MAX_VIDEO_BPS = 120_000_000
const MIN_VIDEO_BPS = 2_000_000
const AUDIO_BPS: Record<RecordQuality, number> = { standard: 160_000, high: 192_000, max: 320_000 }

// Containers that hand out data as it is recorded come first: Chrome's MP4 holds the whole
// recording in memory until it stops, and nothing would survive a crash. Matroska with
// H.264 turns into MP4 without re-encoding (`ffmpeg -i in.mkv -c copy out.mp4`).
const MIME_TYPES = [
  'video/x-matroska;codecs=avc1,opus',
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
  'video/mp4;codecs=avc1.640033,mp4a.40.2',
  'video/mp4',
] as const

export function pickMime(supported: (type: string) => boolean): string | null {
  return MIME_TYPES.find((t) => supported(t)) ?? null
}

export function extensionOf(mime: string): string {
  if (mime.startsWith('video/mp4')) return 'mp4'
  return mime.startsWith('video/x-matroska') ? 'mkv' : 'webm'
}

// For the panel: container and video codec.
export function formatLabel(mime: string): string {
  const codec = mime.includes('avc1') ? 'H.264' : mime.includes('vp9') ? 'VP9' : mime.includes('vp8') ? 'VP8' : ''
  return [extensionOf(mime).toUpperCase(), codec].filter(Boolean).join(' · ')
}

export function bitrates(size: PixelSize, fps: RecordFps, quality: RecordQuality): { video: number; audio: number } {
  const video = Math.round(size.width * size.height * fps * BITS_PER_PIXEL[quality])
  return { video: Math.max(MIN_VIDEO_BPS, Math.min(MAX_VIDEO_BPS, video)), audio: AUDIO_BPS[quality] }
}

// spectravisio-20261011-213005.mp4
export function recordingName(date: Date, ext: string): string {
  const p = (n: number) => String(n).padStart(2, '0')
  const day = `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}`
  const time = `${p(date.getHours())}${p(date.getMinutes())}${p(date.getSeconds())}`
  return `spectravisio-${day}-${time}.${ext}`
}

// Where the pieces go. Writes are awaited in order by the recorder.
export interface RecordSink {
  write(chunk: Blob): Promise<void>
  // The finished file.
  close(): Promise<File>
  abort(): Promise<void>
}

export class MemorySink implements RecordSink {
  private readonly chunks: Blob[] = []
  constructor(
    private readonly name: string,
    private readonly type: string,
  ) {}
  async write(chunk: Blob): Promise<void> {
    this.chunks.push(chunk)
  }
  async close(): Promise<File> {
    return new File(this.chunks, this.name, { type: this.type })
  }
  async abort(): Promise<void> {
    this.chunks.length = 0
  }
}

// How often MediaRecorder hands out a piece.
const TIMESLICE_MS = 1000

export interface RecorderOptions {
  canvas: HTMLCanvasElement
  // The sound, or null to record the picture alone.
  audio: MediaStreamTrack | null
  mime: string
  fps: RecordFps
  bitrates: { video: number; audio: number }
  sink: RecordSink
  // Bytes written so far, after each piece.
  onProgress?: (bytes: number) => void
  // MediaRecorder stopped by itself (the encoder failed, the canvas went away).
  onError?: (message: string) => void
}

export class Recorder {
  private readonly media: MediaRecorder
  private readonly stream: MediaStream
  private readonly sink: RecordSink
  private writes: Promise<void> = Promise.resolve()
  private bytes = 0
  private failed: string | null = null
  private stopped: Promise<void>

  constructor(o: RecorderOptions) {
    this.sink = o.sink
    this.stream = o.canvas.captureStream(o.fps)
    if (o.audio) this.stream.addTrack(o.audio)
    this.media = new MediaRecorder(this.stream, {
      mimeType: o.mime,
      videoBitsPerSecond: o.bitrates.video,
      audioBitsPerSecond: o.bitrates.audio,
    })
    this.media.ondataavailable = (e) => {
      if (!e.data.size) return
      const chunk = e.data
      this.writes = this.writes.then(async () => {
        if (this.failed) return
        try {
          await this.sink.write(chunk)
          this.bytes += chunk.size
          o.onProgress?.(this.bytes)
        } catch (err) {
          this.failed = String(err)
          o.onError?.(this.failed)
          if (this.media.state !== 'inactive') this.media.stop()
        }
      })
    }
    this.stopped = new Promise((resolve) => {
      this.media.onstop = () => resolve()
    })
    this.media.onerror = (e) => {
      this.failed = (e as ErrorEvent).message || 'MediaRecorder error'
      o.onError?.(this.failed)
    }
    this.media.start(TIMESLICE_MS)
  }

  get active(): boolean {
    return this.media.state !== 'inactive'
  }

  // Stops and hands back the file; null when nothing usable was written.
  async stop(): Promise<File | null> {
    if (this.media.state !== 'inactive') this.media.stop()
    await this.stopped
    await this.writes
    for (const t of this.stream.getVideoTracks()) t.stop()
    if (this.failed || !this.bytes) {
      await this.sink.abort()
      return null
    }
    return this.sink.close()
  }
}
