import type { MessageKey } from '../../i18n'

// Global palettes: gradients read by brightness. All start from black so dark areas stay dark.
export interface Palette {
  id: string
  label: MessageKey
  // Position 0–1 and colour, in order.
  stops: [number, string][]
}

export const PALETTES: Palette[] = [
  { id: 'fire', label: 'palette.fire', stops: [[0, '#000000'], [0.3, '#7a0a00'], [0.55, '#e83a00'], [0.8, '#ffb000'], [1, '#fff6d0']] },
  { id: 'ice', label: 'palette.ice', stops: [[0, '#000000'], [0.35, '#0a1a5c'], [0.65, '#1f8fff'], [0.85, '#7ff0ff'], [1, '#ffffff']] },
  { id: 'neon', label: 'palette.neon', stops: [[0, '#000000'], [0.3, '#3a0080'], [0.55, '#ff00c8'], [0.8, '#00f0ff'], [1, '#f0ffff']] },
  { id: 'sunset', label: 'palette.sunset', stops: [[0, '#000000'], [0.3, '#40104f'], [0.55, '#c8306a'], [0.8, '#ff8a3c'], [1, '#ffe08a']] },
  { id: 'forest', label: 'palette.forest', stops: [[0, '#000000'], [0.35, '#0b3d1a'], [0.65, '#3fa83a'], [0.85, '#c6e86a'], [1, '#fffbe0']] },
  { id: 'ocean', label: 'palette.ocean', stops: [[0, '#000000'], [0.35, '#00324a'], [0.65, '#007f8c'], [0.85, '#3fe0c0'], [1, '#e8fff8']] },
  { id: 'mono', label: 'palette.mono', stops: [[0, '#000000'], [1, '#ffffff']] },
  {
    id: 'rainbow',
    label: 'palette.rainbow',
    stops: [[0, '#000000'], [0.15, '#ff0000'], [0.3, '#ffaa00'], [0.45, '#33ff00'], [0.6, '#00ddff'], [0.75, '#2244ff'], [0.9, '#cc00ff'], [1, '#ffffff']],
  },
]

export const PALETTE_WIDTH = 256

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

// One row per palette, RGBA8, for a texture PALETTE_WIDTH × PALETTES.length.
export function paletteData(palettes: Palette[] = PALETTES, width = PALETTE_WIDTH): Uint8Array {
  const out = new Uint8Array(width * palettes.length * 4)
  palettes.forEach((p, row) => {
    const stops = p.stops.map(([pos, hex]) => [pos, rgb(hex)] as const)
    for (let x = 0; x < width; x++) {
      const t = x / (width - 1)
      let j = 1
      while (j < stops.length - 1 && stops[j][0] < t) j++
      const [p0, c0] = stops[j - 1]
      const [p1, c1] = stops[j]
      const k = p1 > p0 ? Math.max(0, Math.min(1, (t - p0) / (p1 - p0))) : 0
      const o = (row * width + x) * 4
      for (let c = 0; c < 3; c++) out[o + c] = Math.round(c0[c] + (c1[c] - c0[c]) * k)
      out[o + 3] = 255
    }
  })
  return out
}
