import { BEAT_SLOTS, KICK, WAVE_SIZE, createFrame, type AnalysisFrame } from '../analysis/analyzer'
import { NAMED_BANDS } from '../analysis/bands'
import { Layer } from './compositor'
import { COPY_FS, bindTextures, drawFullscreen, program, uniforms } from './gl'
import { defaultParams } from './registry'
import type { VisualDef, VisualFrame } from './visual'

// Thumbnails for the visualization browser: each one rendered small with its default
// values, fed 1.5 s of made-up audio at 120 BPM so trails and motion have built up.

export const THUMB_WIDTH = 192
export const THUMB_HEIGHT = 108
const FRAMES = 90
const DT = 1 / 60
// Change when the test audio changes, so cached thumbnails are redrawn.
const AUDIO_VERSION = 1

// Cache key: changes with the visualization's code and parameters.
export function thumbKey(def: VisualDef): string {
  const text = `${AUDIO_VERSION}|${def.create.toString()}|${JSON.stringify(def.params)}`
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return `${def.id}:${(h >>> 0).toString(36)}`
}

// Test audio at frame `n`: bands that sway, a kick on every beat and a hat between.
export function testFrame(n: number, a: AnalysisFrame = createFrame()): AnalysisFrame {
  const t = n * DT
  a.time = t * 1000
  a.bandCount = 32
  for (let i = 0; i < a.bandCount; i++) {
    const v = 0.15 + 0.55 * (1 - i / 40) * (0.6 + 0.4 * Math.sin(t * 3 + i * 0.5))
    a.bands[i] = a.bandsL[i] = a.bandsR[i] = v
  }
  const beat = (t * 2) % 1
  const kick = Math.exp(-beat * 6)
  for (let i = 0; i < NAMED_BANDS.length; i++) a.named[i] = i < 2 ? 0.3 + 0.6 * kick : 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(t * 4 + i))
  const beats = Math.floor(t * 2)
  a.beats.fill(0)
  a.beats[KICK] = beats
  a.beats[1] = beats
  a.beats[5] = Math.floor(t * 2 + 0.5)
  for (let i = 0; i < WAVE_SIZE; i++) {
    const x = i / WAVE_SIZE
    a.waveL[i] = a.waveR[i] = 0.5 * Math.sin(2 * Math.PI * (x * 6 + t)) * (0.4 + 0.6 * kick)
  }
  a.bpm = 120
  a.tempoConfidence = 1
  a.phase = beat
  return a
}

// Draws the thumbnails one by one, yielding between them. Calls `done` with each PNG.
export async function renderThumbnails(defs: VisualDef[], done: (id: string, png: Blob) => void): Promise<void> {
  const canvas = document.createElement('canvas')
  canvas.width = THUMB_WIDTH
  canvas.height = THUMB_HEIGHT
  const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: true })
  if (!gl) return
  const copy = program(gl, COPY_FS)
  const src = uniforms(gl, copy, ['uSrc'] as const).uSrc
  const vao = gl.createVertexArray()!
  const surface = { width: THUMB_WIDTH, height: THUMB_HEIGHT, dpr: 1 }
  const analysis = createFrame()
  try {
    for (const def of defs) {
      let layer: Layer | null = null
      try {
        layer = new Layer(gl, def)
        const params = defaultParams(def)
        const seen = new Uint32Array(BEAT_SLOTS)
        const frame: VisualFrame = { time: 0, dt: DT, analysis, wave: new Float32Array(WAVE_SIZE), hits: new Array(BEAT_SLOTS).fill(false) }
        for (let n = 0; n < FRAMES; n++) {
          testFrame(n, analysis)
          frame.time = n * DT
          for (let i = 0; i < WAVE_SIZE; i++) frame.wave[i] = analysis.waveL[i]
          for (let i = 0; i < BEAT_SLOTS; i++) {
            frame.hits[i] = n > 0 && analysis.beats[i] !== seen[i]
            seen[i] = analysis.beats[i]
          }
          layer.render(frame, params, surface)
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
        gl.viewport(0, 0, THUMB_WIDTH, THUMB_HEIGHT)
        gl.useProgram(copy)
        bindTextures(gl, [src], [layer.texture])
        drawFullscreen(gl, vao)
        const png = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
        if (png) done(def.id, png)
      } catch {
        // A visualization that cannot start keeps its placeholder.
      } finally {
        layer?.dispose()
      }
      await new Promise((r) => setTimeout(r, 0))
    }
  } finally {
    gl.deleteProgram(copy)
    gl.deleteVertexArray(vao)
    gl.getExtension('WEBGL_lose_context')?.loseContext()
  }
}
