import { createFrame, type AnalysisFrame } from '../engine/analysis/analyzer'
import type { OutputState } from '../engine/live/live'
import { decodeFrame } from '../engine/obs/codec'
import { FRAME_EVENT, STATE_EVENT, unwrap, type FrameMessage, type StateMessage } from '../engine/obs/messages'
import type { UserShader } from '../engine/shaders/userVisual'
import { startView, type ViewBridge } from '../output/view'

// The OBS source: a browser source in OBS pointed at `?source`. OBS gives it no microphone
// and its own storage, so everything comes from the app in the browser, through
// obs-websocket and obs-browser's custom events.

// No frame for this long: no audio.
const FRAME_STALE_MS = 500
// No message at all for this long: the app is gone.
const LOST_MS = 4000

const frame = createFrame()
let frameAt = -Infinity
let hasFrame = false
let state: StateMessage | null = null
let stateAt = -Infinity
let shaders: readonly UserShader[] = []
let shadersJson = '[]'
let out: OutputState = { black: 0, flash: 0, freeze: false, reduceFlashes: false }
let controls = new Map<string, number>()
let time = 0
let logo: HTMLImageElement | null = null
let logoUrl: string | null = null

window.addEventListener(FRAME_EVENT, (e) => {
  const m = unwrap<FrameMessage>((e as CustomEvent).detail)
  if (!m) return
  frameAt = performance.now()
  hasFrame = !!m.f
  if (m.f) decodeFrame(m.f, frame)
  out = m.out
  controls = new Map(m.c)
  time = m.time
})

window.addEventListener(STATE_EVENT, (e) => {
  const m = unwrap<StateMessage>((e as CustomEvent).detail)
  if (!m) return
  state = m
  stateAt = performance.now()
  // The same list keeps its identity, so the visuals are not rebuilt every few seconds.
  const json = JSON.stringify(m.shaders)
  if (json !== shadersJson) {
    shadersJson = json
    shaders = m.shaders
  }
  if (m.logo !== logoUrl) {
    logoUrl = m.logo
    logo = null
    if (m.logo) {
      const img = new Image()
      img.onload = () => {
        if (logoUrl === m.logo) logo = img
      }
      img.src = m.logo
    }
  }
})

function bridge(): ViewBridge | null {
  const now = performance.now()
  if (!state || now - Math.max(stateAt, frameAt) > LOST_MS) return null
  const s = state
  const live = hasFrame && now - frameAt < FRAME_STALE_MS
  return {
    scene: () => s.scene,
    frame: (): AnalysisFrame | null => (live ? frame : null),
    output: () => out,
    control: (id) => controls.get(id) ?? 0,
    overlay: () => ({ trackId: s.track.id, title: s.track.title, artist: s.track.artist, lyrics: s.track.lyrics, time: time + (live ? (now - frameAt) / 1000 : 0), logo }),
    visual: () => null,
    shaders: () => shaders,
    size: () => s.size,
    key: () => {},
  }
}

startView({ bridge, title: 'source.title', lost: 'source.waiting', transparent: new URLSearchParams(location.search).get('background') !== 'black' })
