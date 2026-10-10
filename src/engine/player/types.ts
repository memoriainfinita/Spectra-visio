import type { MessageKey } from '../../i18n'
import type { Repeat } from './queue'

export interface TrackMeta {
  title?: string
  artist?: string
  album?: string
  duration?: number
  // Object URL of the embedded cover, revoked when the track is removed.
  cover?: string
  // Synced lyrics from the tags, as LRC text.
  lyrics?: string
}

export interface Track {
  id: string
  // File name without extension: shown until the tags are read.
  name: string
  // Null when the track was restored from a previous session and its file is not readable yet.
  file: File | null
  size: number
  meta: TrackMeta | null
  failed: boolean
}

export type PlayerStatus = 'idle' | 'loading' | 'playing' | 'paused'

export interface PlayerError {
  key: MessageKey
  name?: string
}

export interface PlayerState {
  tracks: Track[]
  currentId: string | null
  status: PlayerStatus
  duration: number
  volume: number
  muted: boolean
  shuffle: boolean
  repeat: Repeat
  // Seconds of overlap between tracks; 0 is plain gapless.
  crossfade: number
  error: PlayerError | null
}

export function trackTitle(track: Track): string {
  return track.meta?.title || track.name
}
