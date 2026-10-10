import { createStore } from '../../core/store'
import type { MessageKey } from '../../i18n'
import type { Player } from '../player/player'
import { getGraph } from './graph'

// Where the analysed audio comes from. The player is the default; the others pause it.
export type InputKind = 'player' | 'mic' | 'screen' | 'stream'

export interface InputDevice {
  id: string
  // Empty until the user has granted microphone access once.
  label: string
}

export interface InputsState {
  kind: InputKind
  status: 'idle' | 'connecting' | 'active'
  devices: InputDevice[]
  deviceId: string
  // Linear gain on the analysis input: 1 is unchanged.
  gain: number
  streamUrl: string
  error: MessageKey | null
  // Incremented on every source switch (not on error changes), so the UI can follow it.
  switches: number
}

export const MAX_INPUT_GAIN = 4

function errorKey(err: unknown): MessageKey {
  const name = err instanceof DOMException ? err.name : ''
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'input.error.denied'
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'input.error.notFound'
  return 'input.error.generic'
}

export class Inputs {
  readonly state = createStore<InputsState>({
    kind: 'player',
    status: 'idle',
    devices: [],
    deviceId: '',
    gain: 1,
    streamUrl: '',
    error: null,
    switches: 0,
  })

  private stream: MediaStream | null = null
  private element: HTMLAudioElement | null = null
  private elementNode: AudioNode | null = null
  private readonly player: Player

  constructor(player: Player) {
    this.player = player
    navigator.mediaDevices?.addEventListener?.('devicechange', () => void this.refreshDevices())
  }

  get micSupported(): boolean {
    return !!navigator.mediaDevices?.getUserMedia
  }

  get screenSupported(): boolean {
    return !!navigator.mediaDevices?.getDisplayMedia
  }

  // Screen capture with audio exists only in Chromium browsers (MDN compat data, 2026-10):
  // Firefox and Safari share the screen but never an audio track. userAgentData is
  // Chromium-only too, so it stands in for a check the API itself does not offer.
  get screenAudioSupported(): boolean {
    return this.screenSupported && 'userAgentData' in navigator
  }

  async refreshDevices(): Promise<void> {
    if (!navigator.mediaDevices?.enumerateDevices) return
    const all = await navigator.mediaDevices.enumerateDevices()
    const devices = all.filter((d) => d.kind === 'audioinput').map((d) => ({ id: d.deviceId, label: d.label }))
    this.state.set((s) => ({ ...s, devices }))
  }

  async useMic(deviceId = this.state.get().deviceId): Promise<void> {
    await this.connect('mic', async () => {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          // Voice processing flattens music.
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      })
      this.state.set((s) => ({ ...s, deviceId }))
      return stream
    })
    // Labels are only exposed after the first permission grant.
    await this.refreshDevices()
  }

  async useScreen(): Promise<void> {
    if (!this.screenAudioSupported) {
      this.state.set((s) => ({ ...s, error: 'input.error.screenUnsupported' }))
      return
    }
    await this.connect('screen', async () => {
      // Chrome only offers audio together with video; the video track is dropped right away.
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
        systemAudio: 'include',
      } as DisplayMediaStreamOptions)
      for (const t of stream.getVideoTracks()) t.stop()
      if (stream.getAudioTracks().length === 0) {
        for (const t of stream.getTracks()) t.stop()
        throw new DOMException('No audio shared', 'NoAudio')
      }
      return stream
    })
  }

  async useStream(url: string): Promise<void> {
    this.state.set((s) => ({ ...s, streamUrl: url }))
    await this.connect('stream', async () => {
      const graph = getGraph()
      const el = new Audio()
      // Without CORS headers the load fails here instead of feeding silence to the analysers.
      el.crossOrigin = 'anonymous'
      el.src = url
      await el.play()
      const node = graph.ctx.createMediaElementSource(el)
      node.connect(graph.playerBus)
      this.element = el
      this.elementNode = node
      return null
    })
  }

  clearError(): void {
    if (this.state.get().error) this.state.set((s) => ({ ...s, error: null }))
  }

  // Back to the player as the analysed source.
  usePlayer(): void {
    this.release()
    this.state.set((s) => ({ ...s, kind: 'player', status: 'idle', error: null, switches: s.switches + 1 }))
  }

  setGain(gain: number): void {
    const value = Math.max(0, Math.min(MAX_INPUT_GAIN, gain))
    this.state.set((s) => ({ ...s, gain: value }))
    const graph = getGraph()
    graph.setGain(graph.inputGain.gain, value)
  }

  private async connect(kind: Exclude<InputKind, 'player'>, open: () => Promise<MediaStream | null>): Promise<void> {
    const graph = getGraph()
    await graph.resume()
    this.player.pause()
    this.release()
    this.state.set((s) => ({ ...s, kind, status: 'connecting', error: null, switches: s.switches + 1 }))
    try {
      const stream = await open()
      if (stream) {
        this.stream = stream
        graph.setExternal(graph.ctx.createMediaStreamSource(stream))
        // Ending the share from the browser bar, or unplugging the device, ends the track.
        for (const t of stream.getAudioTracks()) t.addEventListener('ended', () => this.stream === stream && this.usePlayer())
      }
      graph.setGain(graph.inputGain.gain, this.state.get().gain)
      this.state.set((s) => ({ ...s, status: 'active' }))
    } catch (err) {
      this.release()
      const key = err instanceof DOMException && err.name === 'NoAudio' ? 'input.error.noScreenAudio' : kind === 'stream' ? 'input.error.stream' : errorKey(err)
      this.state.set((s) => ({ ...s, kind: 'player', status: 'idle', error: key }))
    }
  }

  private release(): void {
    getGraph().setExternal(null)
    for (const t of this.stream?.getTracks() ?? []) t.stop()
    this.stream = null
    this.elementNode?.disconnect()
    this.elementNode = null
    if (this.element) {
      this.element.pause()
      this.element.removeAttribute('src')
      this.element.load()
      this.element = null
    }
  }
}
