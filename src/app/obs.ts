import { createStore } from '../core/store'
import { encodeFrame } from '../engine/obs/codec'
import { FRAME_EVENT, SOURCE_PARAM, STATE_EVENT, wrap, type FrameMessage, type StateMessage } from '../engine/obs/messages'
import { ObsSocket, type ObsSocketError } from '../engine/obs/websocket'
import { analysis, renderer } from './engine'
import { liveOutput } from './live'
import { controlValues } from './midi'
import { logoStore, overlayData } from './overlays'
import { sceneStore } from './scene'
import { settingsStore } from './settings'
import { shadersStore } from './shaders'

// The link to OBS: this window sends the analysis, the scene and the live switches to the
// OBS source through obs-websocket, frame by frame.

export interface ObsState {
  status: 'off' | 'connecting' | 'on' | 'error'
  error: ObsSocketError | null
  // A request OBS refused: obs-browser missing or too old.
  requestError: string | null
}

export const obsStore = createStore<ObsState>({ status: 'off', error: null, requestError: null })

const RETRY_MS = [1000, 2000, 5000, 10000]
// The source catches up within this time when it starts after the app.
const STATE_EVERY_MS = 2000
// Frames are dropped while this much is waiting to go out.
const MAX_BACKLOG = 512 * 1024
const MIN_FRAME_GAP_MS = 15

let socket: ObsSocket | null = null
let retries = 0
let retryTimer = 0
let raf = 0
let lastFrame = 0
let lastState = -Infinity
let sent: unknown[] = []
const logoUrls = new WeakMap<object, string>()

export function sourceUrl(): string {
  const url = new URL(location.href)
  url.search = `?${SOURCE_PARAM}`
  url.hash = ''
  return url.href
}

export function initObs(): void {
  if (settingsStore.get().obs.enabled) connect()
}

export function setObsEnabled(on: boolean): void {
  settingsStore.set((s) => ({ ...s, obs: { ...s.obs, enabled: on } }))
  if (on) {
    retries = 0
    connect()
  } else disconnect()
}

export function setObsConnection(url: string, password: string): void {
  settingsStore.set((s) => ({ ...s, obs: { ...s.obs, url, password } }))
  if (settingsStore.get().obs.enabled) {
    disconnect()
    retries = 0
    connect()
  }
}

function connect(): void {
  clearTimeout(retryTimer)
  socket?.close()
  const { url, password } = settingsStore.get().obs
  obsStore.set((s) => ({ ...s, status: 'connecting', requestError: null }))
  let s: ObsSocket
  try {
    s = new ObsSocket(url, password, {
      onOpen: () => {
        retries = 0
        lastState = -Infinity
        obsStore.set({ status: 'on', error: null, requestError: null })
        startSending()
      },
      onClose: (error) => {
        if (socket !== s) return
        socket = null
        stopSending()
        if (!error) return
        obsStore.set((st) => ({ ...st, status: 'error', error }))
        // A wrong password does not get better by retrying.
        if (error === 'auth' || error === 'password' || !settingsStore.get().obs.enabled) return
        retryTimer = window.setTimeout(connect, RETRY_MS[Math.min(retries++, RETRY_MS.length - 1)])
      },
      onRequestError: (message) => {
        if (obsStore.get().requestError !== message) obsStore.set((st) => ({ ...st, requestError: message }))
      },
    })
  } catch {
    // A malformed address.
    obsStore.set({ status: 'error', error: 'closed', requestError: null })
    return
  }
  socket = s
}

function disconnect(): void {
  clearTimeout(retryTimer)
  stopSending()
  const s = socket
  socket = null
  s?.close()
  obsStore.set({ status: 'off', error: null, requestError: null })
}

function startSending(): void {
  if (raf) return
  const loop = (now: number) => {
    raf = requestAnimationFrame(loop)
    send(now)
  }
  raf = requestAnimationFrame(loop)
}

function stopSending(): void {
  cancelAnimationFrame(raf)
  raf = 0
}

function logoUrl(image: HTMLImageElement | null): string | null {
  if (!image) return null
  let url = logoUrls.get(image)
  if (!url) {
    const c = document.createElement('canvas')
    c.width = image.naturalWidth
    c.height = image.naturalHeight
    c.getContext('2d')?.drawImage(image, 0, 0)
    url = c.toDataURL('image/png')
    logoUrls.set(image, url)
  }
  return url
}

function send(now: number): void {
  const s = socket
  if (!s?.ready || now - lastFrame < MIN_FRAME_GAP_MS || s.backlog > MAX_BACKLOG) return
  lastFrame = now
  const overlay = overlayData()
  // What the state is made of; a change of any of them sends it at once.
  const parts = [sceneStore.get(), shadersStore.get(), renderer.fixedSize, overlay.trackId, overlay.title, overlay.artist, overlay.lyrics, logoStore.get().image]
  if (now - lastState >= STATE_EVERY_MS || parts.some((p, i) => p !== sent[i])) {
    lastState = now
    sent = parts
    const state: StateMessage = {
      scene: sceneStore.get(),
      shaders: shadersStore.get(),
      size: renderer.fixedSize,
      track: { id: overlay.trackId, title: overlay.title, artist: overlay.artist, lyrics: overlay.lyrics },
      logo: logoUrl(logoStore.get().image),
    }
    s.emit(STATE_EVENT, wrap(state))
  }
  const frame = analysis.frame(now)
  const message: FrameMessage = { f: frame ? encodeFrame(frame) : null, out: liveOutput(now, frame), c: controlValues(), time: overlay.time }
  s.emit(FRAME_EVENT, wrap(message))
}
