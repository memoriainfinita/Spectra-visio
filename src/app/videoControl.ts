import { createStore } from '../core/store'
import { elementsStore, inputsStore, previewStore, visualInputStore } from './visualInput'

// Playback of a video in a layer's visual input (a file or one found online; not the camera
// or a live channel): play and pause, position, a trimmed span, direction, what happens at the
// end of the span, and speed. Not kept between visits, like the input itself. Every video
// that is an input keeps its own settings and its span is watched whether or not its layer
// is the selected one; the panels show the selected layer's.

export const VIDEO_RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2] as const
export type VideoDirection = 'forward' | 'backward'
// At the end of the span: start it again, turn round, or stop.
export type VideoEnd = 'loop' | 'pingpong' | 'once'

export interface VideoControlState {
  // A video is the input and these controls apply.
  active: boolean
  playing: boolean
  // Seconds.
  time: number
  duration: number
  // The span played; end 0 means up to the end of the video.
  start: number
  end: number
  direction: VideoDirection
  atEnd: VideoEnd
  rate: number
  // Moving backwards right now (ping-pong turns it round).
  backwards: boolean
}

const initial: VideoControlState = { active: false, playing: false, time: 0, duration: 0, start: 0, end: 0, direction: 'forward', atEnd: 'loop', rate: 1, backwards: false }
export const videoControlStore = createStore<VideoControlState>(initial)

// One video's settings and the bookkeeping of its steps.
interface Control {
  s: VideoControlState
  // Backwards, the browser cannot play: the video is paused and stepped back by seeking. One
  // seek at a time, and the next goes as far back as the time since the last one asks.
  seeking: boolean
  stepFrom: number
}

const controls = new Map<HTMLVideoElement, Control>()
// The selected layer's video, the one the panels show.
let shown: HTMLVideoElement | null = null
let frame = 0

const endOf = (s: VideoControlState) => (s.end > 0 ? Math.min(s.end, s.duration) : s.duration)

function current(): [HTMLVideoElement, Control] | null {
  const c = shown ? controls.get(shown) : undefined
  return shown && c ? [shown, c] : null
}

function patch(v: HTMLVideoElement, c: Control, p: Partial<VideoControlState>): void {
  c.s = { ...c.s, ...p }
  if (v === shown) videoControlStore.set(c.s)
}

// Reached one edge of the span going one way: loop, turn round or stop.
function edge(v: HTMLVideoElement, c: Control): void {
  const s = c.s
  const a = s.start
  const b = endOf(s)
  if (s.atEnd === 'loop') {
    c.seeking = true
    v.currentTime = s.backwards ? b : a
  } else if (s.atEnd === 'pingpong') {
    patch(v, c, { backwards: !s.backwards })
    c.stepFrom = performance.now()
  } else {
    v.pause()
    v.currentTime = s.backwards ? a : Math.max(a, b - 0.05)
    patch(v, c, { playing: false })
  }
}

// Every frame, for every video: timeupdate comes too seldom for a short span, and going
// backwards needs a step per frame.
function watch(now: number): void {
  frame = requestAnimationFrame(watch)
  for (const [v, c] of controls) {
    const s = c.s
    const a = s.start
    const b = endOf(s)
    if (!s.playing) {
      if (!v.paused) v.pause()
    } else if (!s.backwards) {
      if (v.playbackRate !== s.rate) v.playbackRate = s.rate
      // A video that reaches its very end is paused by the browser, so `ended` is checked apart.
      if (b > 0 && (v.currentTime >= b - 0.02 || v.ended)) edge(v, c)
      else if (v.paused) void v.play().catch(() => {})
    } else {
      if (!v.paused) v.pause()
      if (!c.seeking) {
        const target = v.currentTime - ((now - c.stepFrom) / 1000) * s.rate
        c.stepFrom = now
        if (target <= a + 0.02) edge(v, c)
        else {
          c.seeking = true
          v.currentTime = target
        }
      }
    }
    // The position for the panel, a few times a second is enough.
    if (v === shown && Math.abs(v.currentTime - s.time) > 0.2) patch(v, c, { time: v.currentTime })
  }
}

function add(v: HTMLVideoElement): void {
  if (controls.has(v)) return
  // The span decides when to go back; the browser's own loop would skip it.
  v.loop = false
  v.playbackRate = 1
  const c: Control = { s: { ...initial, active: true, playing: !v.paused, time: v.currentTime, duration: Number.isFinite(v.duration) ? v.duration : 0 }, seeking: false, stepFrom: performance.now() }
  v.addEventListener('seeked', () => {
    c.seeking = false
  })
  controls.set(v, c)
}

// The input videos there are now, and the one the panels show.
function update(): void {
  const inputs = inputsStore.get()
  const videos = new Set<HTMLVideoElement>()
  for (const [layer, el] of elementsStore.get()) if (el instanceof HTMLVideoElement && inputs[layer]?.kind === 'video') videos.add(el)
  for (const v of videos) add(v)
  for (const v of [...controls.keys()]) if (!videos.has(v)) controls.delete(v)
  const el = previewStore.get()
  shown = visualInputStore.get().kind === 'video' && el instanceof HTMLVideoElement && controls.has(el) ? el : null
  videoControlStore.set(shown ? controls.get(shown)!.s : initial)
  if (controls.size && !frame) frame = requestAnimationFrame(watch)
  else if (!controls.size && frame) {
    cancelAnimationFrame(frame)
    frame = 0
  }
}

export function initVideoControl(): void {
  visualInputStore.subscribe(update)
  previewStore.subscribe(update)
  inputsStore.subscribe(update)
  elementsStore.subscribe(update)
  update()
}

export function toggleVideo(): void {
  const cur = current()
  if (!cur) return
  const [v, c] = cur
  const s = c.s
  if (s.playing) {
    v.pause()
    patch(v, c, { playing: false })
    return
  }
  // Stopped at the far edge of a single run: start it again.
  const a = s.start
  const b = endOf(s)
  if (!s.backwards && v.currentTime >= b - 0.1) v.currentTime = a
  if (s.backwards && v.currentTime <= a + 0.1) v.currentTime = b
  c.stepFrom = performance.now()
  patch(v, c, { playing: true })
}

export function seekVideo(time: number): void {
  const cur = current()
  if (!cur) return
  const [v, c] = cur
  v.currentTime = Math.max(c.s.start, Math.min(endOf(c.s), time))
  c.stepFrom = performance.now()
  patch(v, c, { time: v.currentTime })
}

export function setVideoDirection(direction: VideoDirection): void {
  const cur = current()
  if (!cur) return
  cur[1].stepFrom = performance.now()
  patch(cur[0], cur[1], { direction, backwards: direction === 'backward' })
}

export function setVideoEnd(atEnd: VideoEnd): void {
  const cur = current()
  if (!cur) return
  // Leaving ping-pong goes back to the chosen direction.
  patch(cur[0], cur[1], { atEnd, backwards: atEnd === 'pingpong' ? cur[1].s.backwards : cur[1].s.direction === 'backward' })
}

export function setVideoRate(rate: number): void {
  const cur = current()
  if (!cur) return
  if (!cur[1].s.backwards) cur[0].playbackRate = rate
  patch(cur[0], cur[1], { rate })
}

// The span, kept inside the video and at least a tenth of a second long; end 0 is the end.
export function setVideoSpan(start: number, end: number): void {
  const cur = current()
  if (!cur) return
  const [v, c] = cur
  const s = c.s
  const d = s.duration
  let a = Math.max(0, Math.min(start, d))
  let b = end > 0 ? Math.max(0, Math.min(end, d)) : 0
  if (b > 0 && b - a < 0.1) {
    if (start !== s.start) a = Math.max(0, b - 0.1)
    else b = Math.min(d, a + 0.1)
  }
  if (b >= d) b = 0
  patch(v, c, { start: a, end: b })
  if (v.currentTime < a || v.currentTime > endOf(c.s)) v.currentTime = a
}

export const markVideoStart = () => shown && setVideoSpan(shown.currentTime, videoControlStore.get().end)
export const markVideoEnd = () => shown && setVideoSpan(videoControlStore.get().start, shown.currentTime)
export const clearVideoSpan = () => setVideoSpan(0, 0)
