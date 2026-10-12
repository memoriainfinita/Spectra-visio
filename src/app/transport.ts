import { connectMediaSession } from '../engine/player/mediaSession'
import { translate } from '../i18n'
import { inputs, player } from './engine'
import { stepStation } from './radio'
import { settingsStore } from './settings'

// Play, pause, previous and next follow what is playing: a stream in the Stream source
// (paused, it is still the source), otherwise the player. The buttons, the shortcuts, the
// touch bar and the system media controls all come through here.

export function streamIsSource(): boolean {
  const s = inputs.state.get()
  return s.kind === 'stream' && s.status !== 'idle'
}

export function streamPlaying(): boolean {
  const s = inputs.state.get()
  return s.kind === 'stream' && (s.status === 'active' || s.status === 'connecting')
}

export const transport = {
  toggle(): void {
    if (!streamIsSource()) return void player.toggle()
    if (inputs.state.get().status === 'paused') void inputs.resumeStream()
    else inputs.pauseStream()
  },
  play(): void {
    if (streamIsSource()) void inputs.resumeStream()
    else void player.play()
  },
  pause(): void {
    if (streamIsSource()) inputs.pauseStream()
    else player.pause()
  },
  stop(): void {
    if (streamIsSource()) inputs.pauseStream()
    else player.stop()
  },
  // With a stream, the neighbouring favourite station.
  next(): void {
    if (streamIsSource()) void stepStation(1)
    else void player.next()
  },
  previous(): void {
    if (streamIsSource()) void stepStation(-1)
    else void player.previous()
  },
}

export function initTransport(): void {
  connectMediaSession(player, {
    ...transport,
    live: () => {
      if (!streamIsSource()) return null
      const s = inputs.state.get()
      return { title: s.streamName, artist: translate(settingsStore.get().lang, 'player.live'), playing: streamPlaying() }
    },
    subscribe: (listener) => {
      inputs.state.subscribe(listener)
    },
  })
}
