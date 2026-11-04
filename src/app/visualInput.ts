import { createStore } from '../core/store'
import { translate } from '../i18n'
import { getVisual } from '../engine/render/registry'
import { setVisualSource } from '../engine/render/visualInput'
import { INPUT_VISUAL } from '../engine/scene/scene'
import { attachHls } from '../engine/tv/hls'
import { notify } from './notices'
import { sceneStore, setLayerContent } from './scene'
import { settingsStore } from './settings'

// The visual input of each layer: a camera, a video file (looped, silent), an image or a live
// TV channel (silent). Not kept between visits: the camera asks for permission again and
// files have to be chosen again. What the panels open goes to the selected layer, and what
// they show is the selected layer's.

export type InputKind = 'none' | 'camera' | 'video' | 'image' | 'tv'
export type InputError = 'cameraDenied' | 'cameraMissing' | 'cameraFailed' | 'unsupported' | 'badFile' | 'tvFailed' | 'tvTimeout' | 'mediaFailed' | null

export interface VisualInputState {
  kind: InputKind
  // File name, camera label or channel name.
  name: string
  // The channel's stream, while a channel is the input.
  url: string
  // The page of a video or image found online, with its licence and author.
  page: string
  width: number
  height: number
  error: InputError
}

type InputElement = HTMLVideoElement | HTMLImageElement

const EMPTY: VisualInputState = { kind: 'none', name: '', url: '', page: '', width: 0, height: 0, error: null }

// Every layer that has an input, or a failed try at one, by layer id.
export const inputsStore = createStore<Readonly<Record<string, VisualInputState>>>({})
// The elements that feed the inputs, by layer id.
export const elementsStore = createStore<ReadonlyMap<string, InputElement>>(new Map())
// The selected layer's input and element, for the panels.
export const visualInputStore = createStore<VisualInputState>(EMPTY)
export const previewStore = createStore<InputElement | null>(null)

interface Slot {
  // Bumped by every start and stop: work begun under an older value is dropped.
  op: number
  stream: MediaStream | null
  objectUrl: string | null
  stopHls: (() => void) | null
}

const slots = new Map<string, Slot>()
// The TV channel's video while one is an input, for its sound.
let tvVideo: HTMLVideoElement | null = null
let tvLayer: string | null = null

export const currentTvVideo = () => tvVideo

const slotOf = (layer: string): Slot => {
  let s = slots.get(layer)
  if (!s) slots.set(layer, (s = { op: 0, stream: null, objectUrl: null, stopHls: null }))
  return s
}

const selectedLayer = (): string => {
  const s = sceneStore.get()
  return s.layers[s.selected]?.id ?? ''
}

export const inputOf = (layer: string): VisualInputState => inputsStore.get()[layer] ?? EMPTY
export const layerHasInput = (layer: string): boolean => inputOf(layer).kind !== 'none'

function setState(layer: string, state: VisualInputState): void {
  if (state.kind === 'none' && !state.error) {
    if (!(layer in inputsStore.get())) return
    inputsStore.set(({ [layer]: _, ...rest }) => rest)
  } else inputsStore.set((s) => ({ ...s, [layer]: state }))
}

function setElement(layer: string, el: InputElement | null): void {
  elementsStore.set((m) => {
    if (el ? m.get(layer) === el : !m.has(layer)) return m
    const next = new Map(m)
    if (el) next.set(layer, el)
    else next.delete(layer)
    return next
  })
}

function syncSelected(): void {
  const id = selectedLayer()
  visualInputStore.set(inputOf(id))
  previewStore.set(elementsStore.get().get(id) ?? null)
}

inputsStore.subscribe(syncSelected)
elementsStore.subscribe(syncSelected)
sceneStore.subscribe(() => {
  syncSelected()
  // A layer that is gone takes its input with it.
  if (slots.size) {
    const ids = new Set(sceneStore.get().layers.map((l) => l.id))
    for (const id of [...slots.keys()]) if (!ids.has(id)) forget(id)
  }
})

function release(layer: string): void {
  const s = slots.get(layer)
  if (s) {
    s.stream?.getTracks().forEach((t) => t.stop())
    s.stream = null
    if (s.objectUrl) URL.revokeObjectURL(s.objectUrl)
    s.objectUrl = null
    s.stopHls?.()
    s.stopHls = null
  }
  if (tvLayer === layer) {
    tvVideo = null
    tvLayer = null
  }
  setVisualSource(layer, null)
  setElement(layer, null)
}

function forget(layer: string): void {
  const s = slots.get(layer)
  if (s) s.op++
  release(layer)
  slots.delete(layer)
  setState(layer, EMPTY)
}

export function stopVisualInput(layer = selectedLayer()): void {
  if (!layer) return
  slotOf(layer).op++
  release(layer)
  setState(layer, EMPTY)
}

// A new input is for seeing: the layer gets the input visualization, unless it already has it
// or runs a shader (imported shaders read the input themselves, Milkdrop is a deliberate pick).
// A crossfader that hides the layer is only said, never moved.
function surface(layer: string): void {
  const s = sceneStore.get()
  const i = s.layers.findIndex((l) => l.id === layer)
  const l = s.layers[i]
  if (!l) return
  const swap = l.visual !== INPUT_VISUAL && getVisual(l.visual)?.category !== 'shader'
  if (swap) setLayerContent(i, true)
  const hidden = (l.side === 'a' && s.crossfade >= 1) || (l.side === 'b' && s.crossfade <= 0)
  if (!swap && !hidden) return
  const key = swap ? (hidden ? 'vinput.shownHidden' : 'vinput.shown') : 'vinput.hidden'
  notify(translate(settingsStore.get().lang, key, { n: i + 1, side: (l.side ?? '').toUpperCase() }))
}

const fail = (layer: string, error: InputError) => setState(layer, { ...inputOf(layer), error })

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

export async function startCamera(deviceId?: string, layer = selectedLayer()): Promise<void> {
  if (!layer) return
  if (!navigator.mediaDevices?.getUserMedia) return fail(layer, 'unsupported')
  const slot = slotOf(layer)
  const mine = ++slot.op
  release(layer)
  try {
    const s = await navigator.mediaDevices.getUserMedia({ video: deviceId ? { deviceId: { exact: deviceId } } : true, audio: false })
    if (mine !== slot.op) {
      s.getTracks().forEach((t) => t.stop())
      return
    }
    slot.stream = s
    const v = videoElement()
    v.srcObject = s
    await play(v)
    if (mine !== slot.op) return
    const track = s.getVideoTracks()[0]
    // Unplugged or revoked: the input goes away instead of freezing on the last frame.
    track?.addEventListener('ended', () => {
      if (mine === slot.op) stopVisualInput(layer)
    })
    setVisualSource(layer, { element: v, width: v.videoWidth, height: v.videoHeight, live: true })
    setElement(layer, v)
    setState(layer, { kind: 'camera', name: track?.label ?? '', url: '', page: '', width: v.videoWidth, height: v.videoHeight, error: null })
    surface(layer)
  } catch (err) {
    if (mine !== slot.op) return
    release(layer)
    const name = err instanceof DOMException ? err.name : ''
    setState(layer, { ...EMPTY, error: name === 'NotAllowedError' ? 'cameraDenied' : name === 'NotFoundError' || name === 'OverconstrainedError' ? 'cameraMissing' : 'cameraFailed' })
  }
}

export async function openVisualFile(file: File, layer = selectedLayer()): Promise<void> {
  if (!layer) return
  const slot = slotOf(layer)
  const mine = ++slot.op
  release(layer)
  const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v|ogv|mkv)$/i.test(file.name)
  slot.objectUrl = URL.createObjectURL(file)
  try {
    if (isVideo) {
      const v = videoElement()
      v.src = slot.objectUrl
      await play(v)
      if (mine !== slot.op) return
      setVisualSource(layer, { element: v, width: v.videoWidth, height: v.videoHeight, live: true })
      setElement(layer, v)
      setState(layer, { kind: 'video', name: file.name, url: '', page: '', width: v.videoWidth, height: v.videoHeight, error: null })
      surface(layer)
    } else {
      const img = new Image()
      img.src = slot.objectUrl
      await img.decode()
      if (mine !== slot.op) return
      setVisualSource(layer, { element: img, width: img.naturalWidth, height: img.naturalHeight, live: false })
      setElement(layer, img)
      setState(layer, { kind: 'image', name: file.name, url: '', page: '', width: img.naturalWidth, height: img.naturalHeight, error: null })
      surface(layer)
    }
  } catch {
    if (mine !== slot.op) return
    release(layer)
    setState(layer, { ...EMPTY, error: 'badFile' })
  }
}

// A channel that has not started by then is given up.
const TV_START_TIMEOUT_MS = 20000

export async function startTv(url: string, name: string, layer = selectedLayer()): Promise<void> {
  if (!layer) return
  const slot = slotOf(layer)
  const mine = ++slot.op
  release(layer)
  if (inputOf(layer).error) setState(layer, { ...inputOf(layer), error: null })
  const v = videoElement()
  v.loop = false
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const stop = await attachHls(v, url)
    if (mine !== slot.op) return stop()
    slot.stopHls = stop
    const late = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new DOMException('No picture yet', 'TvTimeout')), TV_START_TIMEOUT_MS)
    })
    await Promise.race([play(v), late])
    if (mine !== slot.op) return
    setVisualSource(layer, { element: v, width: v.videoWidth, height: v.videoHeight, live: true })
    setElement(layer, v)
    tvVideo = v
    tvLayer = layer
    setState(layer, { kind: 'tv', name, url, page: '', width: v.videoWidth, height: v.videoHeight, error: null })
    surface(layer)
    // A channel that stops for good leaves the input instead of freezing on its last frame.
    v.addEventListener('error', () => {
      if (mine === slot.op) {
        stopVisualInput(layer)
        fail(layer, 'tvFailed')
      }
    })
  } catch (err) {
    if (mine !== slot.op) return
    release(layer)
    const timeout = err instanceof DOMException && err.name === 'TvTimeout'
    setState(layer, { ...EMPTY, error: timeout ? 'tvTimeout' : 'tvFailed' })
  } finally {
    clearTimeout(timer)
  }
}

// A video (looped, silent) or image found online, read with CORS so WebGL may use it.
export async function openVisualUrl(url: string, type: 'video' | 'image', name: string, page: string, layer = selectedLayer()): Promise<void> {
  if (!layer) return
  const slot = slotOf(layer)
  const mine = ++slot.op
  release(layer)
  if (inputOf(layer).error) setState(layer, { ...inputOf(layer), error: null })
  try {
    if (type === 'video') {
      const v = videoElement()
      v.crossOrigin = 'anonymous'
      v.src = url
      await play(v)
      if (mine !== slot.op) return
      setVisualSource(layer, { element: v, width: v.videoWidth, height: v.videoHeight, live: true })
      setElement(layer, v)
      setState(layer, { kind: 'video', name, url, page, width: v.videoWidth, height: v.videoHeight, error: null })
      surface(layer)
    } else {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.src = url
      await img.decode()
      if (mine !== slot.op) return
      setVisualSource(layer, { element: img, width: img.naturalWidth, height: img.naturalHeight, live: false })
      setElement(layer, img)
      setState(layer, { kind: 'image', name, url, page, width: img.naturalWidth, height: img.naturalHeight, error: null })
      surface(layer)
    }
  } catch {
    if (mine !== slot.op) return
    release(layer)
    setState(layer, { ...EMPTY, error: 'mediaFailed' })
  }
}
