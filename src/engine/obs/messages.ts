import type { OutputState } from '../live/live'
import type { LrcLine } from '../overlay/lrc'
import type { PixelSize } from '../output/format'
import type { SceneState } from '../scene/scene'
import type { UserShader } from '../shaders/userVisual'
import type { WireFrame } from './codec'

// What the app sends to the OBS source. OBS passes event data through its own settings
// format, which only keeps arrays of objects, so each message travels as one JSON string.

export const SOURCE_PARAM = 'source'
export const FRAME_EVENT = 'spectravisio-frame'
export const STATE_EVENT = 'spectravisio-state'

// Every frame.
export interface FrameMessage {
  // Null without audio.
  f: WireFrame | null
  out: OutputState
  // MIDI control values the modulations may follow.
  c: [string, number][]
  // Playback position as heard, seconds.
  time: number
}

// On every change, and every few seconds for a source that starts later.
export interface StateMessage {
  scene: SceneState
  shaders: readonly UserShader[]
  size: PixelSize | null
  track: { id: string | null; title: string; artist: string; lyrics: readonly LrcLine[] | null }
  // PNG data URL.
  logo: string | null
}

export const wrap = (message: FrameMessage | StateMessage) => ({ p: JSON.stringify(message) })

export function unwrap<T>(detail: unknown): T | null {
  try {
    const p = (detail as { p?: unknown } | null)?.p
    return typeof p === 'string' ? (JSON.parse(p) as T) : null
  } catch {
    return null
  }
}
