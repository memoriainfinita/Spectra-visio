import { createStore } from '../core/store'
import { setVisualSource } from '../engine/render/visualInput'
import { attachHls } from '../engine/tv/hls'

// The visual input: a camera, a video file (looped, silent), an image or a live TV channel
// (silent). Not kept between visits: the camera asks for permission again and files have
// to be chosen again.

export type InputKind = 'none' | 'camera' | 'video' | 'image' | 'tv'
export type InputError = 'cameraDenied' | 'cameraMissing' | 'cameraFailed' | 'unsupported' | 'badFile' | 'tvFailed' | 'tvTimeout' | null

export interface VisualInputState {
  kind: InputKind
  // File name, camera label or channel name.
  name: string
  // The channel's stream, while a channel is the input.
  url: string
  width: number
  height: number
  error: InputError
}

export const visualInputStore = createStore<VisualInputState>({ kind: 'none', name: '', url: '', width: 0, height: 0, error: null })
// The element being shown, for the panel's preview.
export const previewStore = createStore<HTMLVideoElement | HTMLImageElement | null>(null)

let stream: MediaStream | null = null
let objectUrl: string | null = null
let stopHls: (() => void) | null = null
let op = 0

function release(): void {
  stream?.getTracks().forEach((t) => t.stop())
  stream = null
  if (objectUrl) URL.revokeObjectURL(objectUrl)
  objectUrl = null
  stopHls?.()
  stopHls = null
  setVisualSource(null)
  previewStore.set(null)
}

export function stopVisualInput(): void {
  op++
  release()
  visualInputStore.set({ kind: 'none', name: '', url: '', width: 0, height: 0, error: null })
}

const fail = (error: InputError) => visualInputStore.set((s) => ({ ...s, error }))

function videoElement(): HTMLVideoElement {
  const v = document.createElement('video')
  v.muted = true
  v.playsInline = true
  v.loop = true
  return v
}

// Resolves when the video knows its size and is playing.
async function play(v: HTMLVideoElement): Promise<void> {
  if (v.readyState < 1) await new Promise<void>((resolve, reject) => {
    v.addEventListener('loadedmetadata', () => resolve(), { once: true })
    v.addEventListener('error', () => reject(new Error('video')), { once: true })
  })
  await v.play()
}

export async function cameraDevices(): Promise<MediaDeviceInfo[]> {
  try {
    return (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput')
  } catch {
    return []
  }
}

export async function startCamera(deviceId?: string): Promise<void> {
  if (!navigator.mediaDevices?.getUserMedia) return fail('unsupported')
  const mine = ++op
  release()
  try {
    const s = await navigator.mediaDevices.getUserMedia({ video: deviceId ? { deviceId: { exact: deviceId } } : true, audio: false })
    if (mine !== op) {
      s.getTracks().forEach((t) => t.stop())
      return
    }
    stream = s
    const v = videoElement()
    v.srcObject = s
    await play(v)
    if (mine !== op) return
    const track = s.getVideoTracks()[0]
    // Unplugged or revoked: the input goes away instead of freezing on the last frame.
    track?.addEventListener('ended', () => {
      if (mine === op) stopVisualInput()
    })
    setVisualSource({ element: v, width: v.videoWidth, height: v.videoHeight, live: true })
    previewStore.set(v)
    visualInputStore.set({ kind: 'camera', name: track?.label ?? '', url: '', width: v.videoWidth, height: v.videoHeight, error: null })
  } catch (err) {
    if (mine !== op) return
    release()
    const name = err instanceof DOMException ? err.name : ''
    visualInputStore.set({ kind: 'none', name: '', url: '', width: 0, height: 0, error: name === 'NotAllowedError' ? 'cameraDenied' : name === 'NotFoundError' || name === 'OverconstrainedError' ? 'cameraMissing' : 'cameraFailed' })
  }
}

export async function openVisualFile(file: File): Promise<void> {
  const mine = ++op
  release()
  const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v|ogv|mkv)$/i.test(file.name)
  objectUrl = URL.createObjectURL(file)
  try {
    if (isVideo) {
      const v = videoElement()
      v.src = objectUrl
      await play(v)
      if (mine !== op) return
      setVisualSource({ element: v, width: v.videoWidth, height: v.videoHeight, live: true })
      previewStore.set(v)
      visualInputStore.set({ kind: 'video', name: file.name, url: '', width: v.videoWidth, height: v.videoHeight, error: null })
    } else {
      const img = new Image()
      img.src = objectUrl
      await img.decode()
      if (mine !== op) return
      setVisualSource({ element: img, width: img.naturalWidth, height: img.naturalHeight, live: false })
      previewStore.set(img)
      visualInputStore.set({ kind: 'image', name: file.name, url: '', width: img.naturalWidth, height: img.naturalHeight, error: null })
    }
  } catch {
    if (mine !== op) return
    release()
    visualInputStore.set({ kind: 'none', name: '', url: '', width: 0, height: 0, error: 'badFile' })
  }
}

// A channel that has not started by then is given up.
const TV_START_TIMEOUT_MS = 20000

export async function startTv(url: string, name: string): Promise<void> {
  const mine = ++op
  release()
  visualInputStore.set((s) => ({ ...s, error: null }))
  const v = videoElement()
  v.loop = false
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const stop = await attachHls(v, url)
    if (mine !== op) return stop()
    stopHls = stop
    const late = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new DOMException('No picture yet', 'TvTimeout')), TV_START_TIMEOUT_MS)
    })
    await Promise.race([play(v), late])
    if (mine !== op) return
    setVisualSource({ element: v, width: v.videoWidth, height: v.videoHeight, live: true })
    previewStore.set(v)
    visualInputStore.set({ kind: 'tv', name, url, width: v.videoWidth, height: v.videoHeight, error: null })
    // A channel that stops for good leaves the input instead of freezing on its last frame.
    v.addEventListener('error', () => {
      if (mine === op) {
        stopVisualInput()
        fail('tvFailed')
      }
    })
  } catch (err) {
    if (mine !== op) return
    release()
    const timeout = err instanceof DOMException && err.name === 'TvTimeout'
    visualInputStore.set({ kind: 'none', name: '', url: '', width: 0, height: 0, error: timeout ? 'tvTimeout' : 'tvFailed' })
  } finally {
    clearTimeout(timer)
  }
}
