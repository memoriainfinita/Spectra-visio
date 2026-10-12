import { createStore } from '../core/store'
import { previewStore, visualInputStore } from './visualInput'

// Playback of a video in the visual input (a file or one found online; not the camera or a
// live channel): play and pause, position, a trimmed span, direction, what happens at the
// end of the span, and speed. Not kept between visits, like the input itself.

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

let video: HTMLVideoElement | null = null
let frame = 0
// Backwards, the browser cannot play: the video is paused and stepped back by seeking. One
// seek at a time; the next goes as far back as the time since the last one asks.
let seeking = false
let stepFrom = 0

const endOf = (s: VideoControlState) => (s.end > 0 ? Math.min(s.end, s.duration) : s.duration)
const set = (patch: Partial<VideoControlState>) => videoControlStore.set((s) => ({ ...s, ...patch }))

// Reached one edge of the span going one way: loop, turn round or stop.
function edge(v: HTMLVideoElement, s: VideoControlState): void {
  const a = s.start
  const b = endOf(s)
  if (s.atEnd === 'loop') {
    seeking = true
    v.currentTime = s.backwards ? b : a
  } else if (s.atEnd === 'pingpong') {
    set({ backwards: !s.backwards })
    stepFrom = performance.now()
  } else {
    v.pause()
    v.currentTime = s.backwards ? a : Math.max(a, b - 0.05)
    set({ playing: false })
  }
}

// Every frame: timeupdate comes too seldom for a short span, and going backwards needs a
// step per frame.
function watch(now: number): void {
  frame = requestAnimationFrame(watch)
  const v = video
  if (!v) return
  const s = videoControlStore.get()
  const a = s.start
  const b = endOf(s)
  if (!s.playing) {
    if (!v.paused) v.pause()
  } else if (!s.backwards) {
    if (v.playbackRate !== s.rate) v.playbackRate = s.rate
    // A video that reaches its very end is paused by the browser, so `ended` is checked apart.
    if (b > 0 && (v.currentTime >= b - 0.02 || v.ended)) edge(v, s)
    else if (v.paused) void v.play().catch(() => {})
  } else {
    if (!v.paused) v.pause()
    if (!seeking) {
      const target = v.currentTime - ((now - stepFrom) / 1000) * s.rate
      stepFrom = now
      if (target <= a + 0.02) edge(v, s)
      else {
        seeking = true
        v.currentTime = target
      }
    }
  }
  // The position for the panel, a few times a second is enough.
  if (Math.abs(v.currentTime - s.time) > 0.2) set({ time: v.currentTime })
}

function attach(v: HTMLVideoElement | null): void {
  if (v === video) return
  cancelAnimationFrame(frame)
  video = v
  seeking = false
  if (!v) {
    videoControlStore.set(initial)
    return
  }
  // The span decides when to go back; the browser's own loop would skip it.
  v.loop = false
  v.playbackRate = 1
  v.addEventListener('seeked', () => {
    seeking = false
  })
  videoControlStore.set({ ...initial, active: true, playing: !v.paused, time: v.currentTime, duration: Number.isFinite(v.duration) ? v.duration : 0 })
  stepFrom = performance.now()
  frame = requestAnimationFrame(watch)
}

export function initVideoControl(): void {
  const update = () => {
    const kind = visualInputStore.get().kind
    const el = previewStore.get()
    attach(kind === 'video' && el instanceof HTMLVideoElement ? el : null)
  }
  visualInputStore.subscribe(update)
  previewStore.subscribe(update)
  update()
}

export function toggleVideo(): void {
  const v = video
  if (!v) return
  const s = videoControlStore.get()
  if (s.playing) {
    v.pause()
    set({ playing: false })
    return
  }
  // Stopped at the far edge of a single run: start it again.
  const a = s.start
  const b = endOf(s)
  if (!s.backwards && v.currentTime >= b - 0.1) v.currentTime = a
  if (s.backwards && v.currentTime <= a + 0.1) v.currentTime = b
  stepFrom = performance.now()
  set({ playing: true })
}

export function seekVideo(time: number): void {
  const v = video
  if (!v) return
  const s = videoControlStore.get()
  v.currentTime = Math.max(s.start, Math.min(endOf(s), time))
  stepFrom = performance.now()
  set({ time: v.currentTime })
}

export function setVideoDirection(direction: VideoDirection): void {
  stepFrom = performance.now()
  set({ direction, backwards: direction === 'backward' })
}

export function setVideoEnd(atEnd: VideoEnd): void {
  // Leaving ping-pong goes back to the chosen direction.
  videoControlStore.set((s) => ({ ...s, atEnd, backwards: atEnd === 'pingpong' ? s.backwards : s.direction === 'backward' }))
}

export function setVideoRate(rate: number): void {
  if (video && !videoControlStore.get().backwards) video.playbackRate = rate
  set({ rate })
}

// The span, kept inside the video and at least a tenth of a second long; end 0 is the end.
export function setVideoSpan(start: number, end: number): void {
  const s = videoControlStore.get()
  const d = s.duration
  let a = Math.max(0, Math.min(start, d))
  let b = end > 0 ? Math.max(0, Math.min(end, d)) : 0
  if (b > 0 && b - a < 0.1) {
    if (start !== s.start) a = Math.max(0, b - 0.1)
    else b = Math.min(d, a + 0.1)
  }
  if (b >= d) b = 0
  set({ start: a, end: b })
  const v = video
  if (v && (v.currentTime < a || v.currentTime > endOf(videoControlStore.get()))) v.currentTime = a
}

export const markVideoStart = () => video && setVideoSpan(video.currentTime, videoControlStore.get().end)
export const markVideoEnd = () => video && setVideoSpan(videoControlStore.get().start, video.currentTime)
export const clearVideoSpan = () => setVideoSpan(0, 0)
