import { createStore } from '../core/store'
import { previewStore, visualInputStore } from './visualInput'

// Playback of a video in the visual input (a file or one found online; not the camera or a
// live channel): play and pause, position, a trimmed span, loop or once, and speed. Not kept
// between visits, like the input itself.

export const VIDEO_RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2] as const

export interface VideoControlState {
  // A video is the input and these controls apply.
  active: boolean
  paused: boolean
  // Seconds.
  time: number
  duration: number
  // The span played; end 0 means up to the end of the video.
  start: number
  end: number
  loop: boolean
  rate: number
}

const initial: VideoControlState = { active: false, paused: false, time: 0, duration: 0, start: 0, end: 0, loop: true, rate: 1 }
export const videoControlStore = createStore<VideoControlState>(initial)

let video: HTMLVideoElement | null = null
let frame = 0

const endOf = (s: VideoControlState) => (s.end > 0 ? Math.min(s.end, s.duration) : s.duration)

// Keeps the video inside its span, every frame: timeupdate comes too seldom for a short one.
function watch(): void {
  frame = requestAnimationFrame(watch)
  const v = video
  if (!v) return
  const s = videoControlStore.get()
  const end = endOf(s)
  // A video that reaches its very end is paused by the browser, so `ended` is checked apart.
  if (end > 0 && ((!v.paused && v.currentTime >= end - 0.02) || v.ended)) {
    if (s.loop) {
      v.currentTime = s.start
      if (v.paused || v.ended) void v.play().catch(() => {})
    } else {
      v.pause()
      v.currentTime = Math.max(s.start, end - 0.05)
    }
  }
  // The position for the panel, a few times a second is enough.
  if (Math.abs(v.currentTime - s.time) > 0.2 || v.paused !== s.paused) videoControlStore.set((st) => ({ ...st, time: v.currentTime, paused: v.paused }))
}

function attach(v: HTMLVideoElement | null): void {
  if (v === video) return
  cancelAnimationFrame(frame)
  video = v
  if (!v) {
    videoControlStore.set(initial)
    return
  }
  // The span decides when to go back; the browser's own loop would skip the trim.
  v.loop = false
  v.playbackRate = 1
  videoControlStore.set({ ...initial, active: true, paused: v.paused, time: v.currentTime, duration: Number.isFinite(v.duration) ? v.duration : 0 })
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
  if (v.paused) {
    const s = videoControlStore.get()
    // Played once to the end: start the span again.
    if (v.currentTime >= endOf(s) - 0.1) v.currentTime = s.start
    void v.play().catch(() => {})
  } else v.pause()
}

export function seekVideo(time: number): void {
  const v = video
  if (!v) return
  const s = videoControlStore.get()
  v.currentTime = Math.max(s.start, Math.min(endOf(s), time))
  videoControlStore.set((st) => ({ ...st, time: v.currentTime }))
}

export function setVideoLoop(loop: boolean): void {
  videoControlStore.set((s) => ({ ...s, loop }))
}

export function setVideoRate(rate: number): void {
  if (video) video.playbackRate = rate
  videoControlStore.set((s) => ({ ...s, rate }))
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
  videoControlStore.set((st) => ({ ...st, start: a, end: b }))
  const v = video
  if (v && (v.currentTime < a || v.currentTime > endOf(videoControlStore.get()))) v.currentTime = a
}

export const markVideoStart = () => video && setVideoSpan(video.currentTime, videoControlStore.get().end)
export const markVideoEnd = () => video && setVideoSpan(videoControlStore.get().start, video.currentTime)
export const clearVideoSpan = () => setVideoSpan(0, 0)
