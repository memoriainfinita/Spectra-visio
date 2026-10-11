// Output format: the size the composition renders at. 'auto' follows the canvas on screen;
// a fixed size renders at that many pixels whatever the window, shown letterboxed, and is
// what a recording and the OBS source get.

export const OUTPUT_SIZES = ['auto', '720', '1080', '1440', '2160'] as const
export type OutputSize = (typeof OUTPUT_SIZES)[number]

export const OUTPUT_ASPECTS = ['16:9', '9:16', '1:1'] as const
export type OutputAspect = (typeof OUTPUT_ASPECTS)[number]

export interface OutputFormat {
  // Pixels of the short side.
  size: OutputSize
  aspect: OutputAspect
}

export interface PixelSize {
  width: number
  height: number
}

export const DEFAULT_FORMAT: OutputFormat = { size: 'auto', aspect: '16:9' }

// The short side the visuals' line widths and sizes are tuned for, at a pixel ratio of 1.
const REFERENCE_SHORT_SIDE = 1080

// Pixels for a fixed format; null for 'auto'. Sides are kept even, as video encoders want.
export function formatPixels(f: OutputFormat): PixelSize | null {
  if (f.size === 'auto') return null
  const short = Number(f.size)
  const long = Math.round((short * 16) / 9 / 2) * 2
  if (f.aspect === '1:1') return { width: short, height: short }
  return f.aspect === '16:9' ? { width: long, height: short } : { width: short, height: long }
}

// The pixel ratio the visuals scale lines and dots by, for a fixed size.
export function fixedRatio(p: PixelSize): number {
  return Math.min(p.width, p.height) / REFERENCE_SHORT_SIDE
}

export function normalizeFormat(raw: unknown): OutputFormat {
  if (typeof raw !== 'object' || raw === null) return { ...DEFAULT_FORMAT }
  const r = raw as Record<string, unknown>
  return {
    size: (OUTPUT_SIZES as readonly unknown[]).includes(r.size) ? (r.size as OutputSize) : DEFAULT_FORMAT.size,
    aspect: (OUTPUT_ASPECTS as readonly unknown[]).includes(r.aspect) ? (r.aspect as OutputAspect) : DEFAULT_FORMAT.aspect,
  }
}
