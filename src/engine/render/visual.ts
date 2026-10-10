import type { MessageKey } from '../../i18n'
import { KICK, WAVE_SIZE, type AnalysisFrame } from '../analysis/analyzer'

export const TAU = Math.PI * 2

// A parameter as ISF declares its inputs: range and default. Integers are rounded.
export interface ParamDef {
  id: string
  label: MessageKey
  min: number
  max: number
  default: number
  int?: boolean
  // Names for the integer values min…max: the panel shows a list instead of a slider.
  options?: MessageKey[]
}

export type Params = Record<string, number>

export interface Surface {
  width: number
  height: number
  dpr: number
}

// What a visualization reads each frame: the delayed analysis plus frame timing.
export interface VisualFrame {
  // Seconds.
  time: number
  dt: number
  analysis: AnalysisFrame | null
  // Mono mix, -1 to 1.
  wave: Float32Array
  // Onsets since the previous rendered frame, per beat slot (named bands, then kick).
  hits: boolean[]
}

export interface VisualInstance {
  render(frame: VisualFrame, params: Params, surface: Surface): void
  dispose?(): void
}

export const CATEGORIES = ['geometric', 'spectrum', 'particles', 'shader'] as const
export type VisualCategory = (typeof CATEGORIES)[number]

interface VisualBase {
  id: string
  label: MessageKey
  category: VisualCategory
  // Specific parameters; the common ones are added by the registry.
  params: ParamDef[]
}

export interface Visual2D extends VisualBase {
  kind: '2d'
  create(ctx: CanvasRenderingContext2D): VisualInstance
}

// Draws into the bound framebuffer, viewport already set.
export interface VisualGL extends VisualBase {
  kind: 'gl'
  create(gl: WebGL2RenderingContext): VisualInstance
}

export type VisualDef = Visual2D | VisualGL

export const COMMON_PARAMS: ParamDef[] = [
  { id: 'speed', label: 'param.speed', min: 0, max: 3, default: 1 },
  { id: 'sensitivity', label: 'param.sensitivity', min: 0, max: 3, default: 1 },
  { id: 'intensity', label: 'param.intensity', min: 0, max: 1.5, default: 1 },
  { id: 'hue', label: 'param.hue', min: 0, max: 360, default: 0 },
]

// Audio and timing as the visualizations of v0 used them, with the common parameters
// applied: sensitivity scales every audio value, speed scales the time that drives motion.
export interface Drive {
  // Seconds, scaled by speed: for phases and motion.
  dt: number
  bass: number
  mid: number
  treble: number
  energy: number
  // Kick onset in this frame.
  beat: boolean
  intensity: number
  hue: number
  // 0–1 across the log spectrum.
  spectrum(p: number): number
  // -1 to 1 across the waveform.
  wave(p: number): number
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)

export function drive(f: VisualFrame, p: Params): Drive {
  const a = f.analysis
  const s = p.sensitivity ?? 1
  const n = a?.named
  const bass = n ? clamp01(Math.max(n[0], n[1]) * s) : 0
  const mid = n ? clamp01(Math.max(n[2], n[3]) * s) : 0
  const treble = n ? clamp01(Math.max(n[4], n[5], n[6]) * s) : 0
  return {
    dt: f.dt * (p.speed ?? 1),
    bass,
    mid,
    treble,
    energy: (bass + mid + treble) / 3,
    beat: f.hits[KICK] ?? false,
    intensity: p.intensity ?? 1,
    hue: p.hue ?? 0,
    spectrum(pos) {
      if (!a || a.bandCount === 0) return 0
      const x = clamp01(pos) * (a.bandCount - 1)
      const i = Math.floor(x)
      const j = Math.min(a.bandCount - 1, i + 1)
      return clamp01((a.bands[i] + (a.bands[j] - a.bands[i]) * (x - i)) * s)
    },
    wave(pos) {
      const i = Math.min(WAVE_SIZE - 1, Math.max(0, Math.round(pos * (WAVE_SIZE - 1))))
      return Math.max(-1, Math.min(1, f.wave[i] * s))
    },
  }
}

// Trail fade given as the per-frame alpha at 60 fps, corrected for the real frame time.
// Fades to black: low alphas leave 8-bit residue, which only stays invisible on black.
export function fade(ctx: CanvasRenderingContext2D, s: Surface, alpha60: number, dt: number): void {
  const alpha = 1 - Math.pow(1 - alpha60, dt * 60)
  ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`
  ctx.fillRect(0, 0, s.width, s.height)
}

export function clear(ctx: CanvasRenderingContext2D, s: Surface): void {
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, s.width, s.height)
}

// Colour drift driven by energy, shared by the modes ported from the prototype.
export function drift(hue: number, d: Drive): number {
  return (hue + d.dt * (18 + 180 * d.energy)) % 360
}
