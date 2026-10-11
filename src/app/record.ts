import { createStore } from '../core/store'
import { getGraph } from '../engine/audio/graph'
import { formatPixels } from '../engine/output/format'
import { deleteLastRecording, lastRecording, OpfsSink } from '../engine/record/opfsSink'
import { MemorySink, Recorder, bitrates, extensionOf, pickMime, recordingName, type RecordSink } from '../engine/record/recorder'
import { opfsSupported } from '../storage/opfs'
import { analysis, renderer } from './engine'
import { settingsStore } from './settings'

// Recording the output with its sound. The file goes into OPFS as it is made and is
// downloaded when it stops; the last one stays there to download again, or to recover when
// the page closed mid-recording.

export interface Kept {
  name: string
  size: number
}

export interface RecordState {
  status: 'idle' | 'starting' | 'recording' | 'saving'
  // performance.now() when it started.
  started: number
  bytes: number
  mime: string | null
  error: string | null
  // The recording kept in OPFS.
  kept: Kept | null
}

export const mimeSupported = typeof MediaRecorder !== 'undefined' ? pickMime((t) => MediaRecorder.isTypeSupported(t)) : null

export const recordStore = createStore<RecordState>({ status: 'idle', started: 0, bytes: 0, mime: mimeSupported, error: null, kept: null })

let recorder: Recorder | null = null
let audioOut: MediaStreamAudioDestinationNode | null = null
let delay: DelayNode | null = null
// The size the composition followed before the recording fixed it.
let restoreAuto = false

export async function initRecord(): Promise<void> {
  if (!opfsSupported) return
  const file = await lastRecording()
  // Cut short before anything was written.
  if (file && !file.size) await deleteLastRecording()
  else if (file) recordStore.set((s) => ({ ...s, kept: { name: file.name, size: file.size } }))
}

export function toggleRecording(): void {
  const s = recordStore.get().status
  if (s === 'recording') void stopRecording()
  else if (s === 'idle') void startRecording()
}

export async function startRecording(): Promise<void> {
  const canvas = renderer.element
  const mime = mimeSupported
  if (!canvas || !mime || recordStore.get().status !== 'idle') return
  recordStore.set((s) => ({ ...s, status: 'starting', error: null, bytes: 0 }))
  const { fps, quality } = settingsStore.get().record
  // An encoder wants one size from start to end: a window-sized composition stays at its
  // current size (made even) while recording.
  if (!formatPixels(settingsStore.get().format)) {
    const p = renderer.pixels
    renderer.setFixedSize({ width: p.width - (p.width % 2), height: p.height - (p.height % 2) })
    restoreAuto = true
  }
  const name = recordingName(new Date(), extensionOf(mime))
  const type = mime.split(';')[0]
  let sink: RecordSink
  try {
    sink = opfsSupported ? await OpfsSink.open(name, type) : new MemorySink(name, type)
  } catch {
    sink = new MemorySink(name, type)
  }
  try {
    // The sound waits as long as the visuals do, so both match in the file.
    const graph = getGraph()
    audioOut = graph.ctx.createMediaStreamDestination()
    delay = graph.ctx.createDelay(1)
    delay.delayTime.value = analysis.delayMs() / 1000
    graph.mix.connect(delay).connect(audioOut)
    recorder = new Recorder({
      canvas,
      audio: audioOut.stream.getAudioTracks()[0] ?? null,
      mime,
      fps,
      bitrates: bitrates(renderer.pixels, fps, quality),
      sink,
      onProgress: (bytes) => recordStore.set((s) => ({ ...s, bytes })),
      onError: (message) => {
        recordStore.set((s) => ({ ...s, error: message }))
        void stopRecording()
      },
    })
    recordStore.set((s) => ({ ...s, status: 'recording', started: performance.now(), kept: null }))
  } catch (err) {
    await sink.abort()
    cleanUp()
    recordStore.set((s) => ({ ...s, status: 'idle', error: String(err) }))
  }
}

export async function stopRecording(): Promise<void> {
  const r = recorder
  if (!r || recordStore.get().status !== 'recording') return
  recordStore.set((s) => ({ ...s, status: 'saving' }))
  let file: File | null = null
  try {
    file = await r.stop()
  } catch (err) {
    recordStore.set((s) => ({ ...s, error: String(err) }))
  }
  cleanUp()
  recordStore.set((s) => ({ ...s, status: 'idle', kept: file && opfsSupported ? { name: file.name, size: file.size } : null }))
  if (file) download(file)
}

function cleanUp(): void {
  recorder = null
  delay?.disconnect()
  audioOut?.stream.getTracks().forEach((t) => t.stop())
  delay = null
  audioOut = null
  if (restoreAuto) renderer.setFixedSize(null)
  restoreAuto = false
}

export async function downloadKept(): Promise<void> {
  const file = await lastRecording()
  if (file) download(file)
  else recordStore.set((s) => ({ ...s, kept: null }))
}

export async function deleteKept(): Promise<void> {
  await deleteLastRecording()
  recordStore.set((s) => ({ ...s, kept: null }))
}

function download(file: File): void {
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  a.click()
  // The download has its own copy of the reference once started.
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
