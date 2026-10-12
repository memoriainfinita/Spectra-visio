import type { Player } from './player'
import { trackTitle } from './types'

// One second of silence, played in a loop while the player runs. Firefox only activates
// media keys and the system media controls for pages with a playing media element, and
// the player itself uses Web Audio (Mozilla bug 2067534).
function silentWav(): string {
  const rate = 8000
  const buf = new ArrayBuffer(44 + rate)
  const v = new DataView(buf)
  const w = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)))
  w(0, 'RIFF'); v.setUint32(4, 36 + rate, true); w(8, 'WAVE'); w(12, 'fmt ')
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true)
  v.setUint32(24, rate, true); v.setUint32(28, rate, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true)
  w(36, 'data'); v.setUint32(40, rate, true)
  new Uint8Array(buf, 44).fill(128)
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }))
}

// A live stream playing instead of the player.
export interface LiveNow {
  title: string
  artist: string
  playing: boolean
}

// Where the system controls go: the player, or a live stream when one is the source.
export interface MediaControl {
  play(): void
  pause(): void
  stop(): void
  previous(): void
  next(): void
  live(): LiveNow | null
  subscribe(listener: () => void): void
}

export function connectMediaSession(player: Player, control: MediaControl): void {
  if (!('mediaSession' in navigator)) return
  const session = navigator.mediaSession
  const keepAlive = new Audio(silentWav())
  keepAlive.loop = true

  const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
    ['play', () => control.play()],
    ['pause', () => control.pause()],
    ['stop', () => control.stop()],
    ['previoustrack', () => control.previous()],
    ['nexttrack', () => control.next()],
    ['seekbackward', (d) => player.seek(player.position() - (d.seekOffset ?? 10))],
    ['seekforward', (d) => player.seek(player.position() + (d.seekOffset ?? 10))],
    ['seekto', (d) => d.seekTime !== undefined && player.seek(d.seekTime)],
  ]
  for (const [action, handler] of handlers) {
    try {
      session.setActionHandler(action, handler)
    } catch {
      // Action not supported by this browser.
    }
  }

  const LIVE = Symbol('live')
  let lastTrack: unknown = null
  let lastLive = ''
  const update = () => {
    const live = control.live()
    if (live) {
      // The stream's own <audio> keeps the controls active; no position for a live stream.
      keepAlive.pause()
      const key = `${live.title}\n${live.artist}`
      if (key !== lastLive) {
        lastLive = key
        // Forces the player's metadata back once the stream stops being the source.
        lastTrack = LIVE
        session.metadata = new MediaMetadata({ title: live.title, artist: live.artist })
      }
      session.playbackState = live.playing ? 'playing' : 'paused'
      return
    }
    lastLive = ''
    const s = player.state.get()
    const track = s.tracks.find((t) => t.id === s.currentId) ?? null
    if (track !== lastTrack) {
      lastTrack = track
      session.metadata = track
        ? new MediaMetadata({
            title: trackTitle(track),
            artist: track.meta?.artist ?? '',
            album: track.meta?.album ?? '',
            artwork: track.meta?.cover ? [{ src: track.meta.cover }] : [],
          })
        : null
    }
    const playing = s.status === 'playing' || s.status === 'loading'
    session.playbackState = playing ? 'playing' : s.status === 'paused' ? 'paused' : 'none'
    if (playing) void keepAlive.play().catch(() => {})
    else keepAlive.pause()
    if (s.duration > 0 && s.status !== 'idle') {
      try {
        session.setPositionState({ duration: s.duration, position: Math.min(player.position(), s.duration), playbackRate: 1 })
      } catch {
        // Ignored: some browsers reject position updates during transitions.
      }
    }
  }
  player.state.subscribe(update)
  control.subscribe(update)
}
