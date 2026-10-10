// Overlays drawn over the effects: song title, synced lyrics, free text and a logo.

// Nine places on screen, row by row from the top left.
export const ANCHORS = ['topLeft', 'top', 'topRight', 'left', 'center', 'right', 'bottomLeft', 'bottom', 'bottomRight'] as const
export const FONTS = ['sans', 'serif', 'mono'] as const

export const SIZE_MIN = 0.5
export const SIZE_MAX = 3
export const HOLD_MAX = 30
export const TEXT_MAX = 500

export interface OverlayItem {
  enabled: boolean
  // Index into ANCHORS.
  anchor: number
  // Scale of the default size.
  size: number
  opacity: number
}

export interface OverlaySettings {
  // `hold`: seconds shown after a track starts; 0 keeps it on.
  title: OverlayItem & { hold: number }
  lyrics: OverlayItem
  text: OverlayItem & { content: string }
  logo: OverlayItem
  // Index into FONTS.
  font: number
  // #rrggbb
  color: string
}

export type OverlayKind = 'title' | 'lyrics' | 'text' | 'logo'

export function defaultOverlays(): OverlaySettings {
  return {
    title: { enabled: false, anchor: 6, size: 1, opacity: 1, hold: 8 },
    lyrics: { enabled: false, anchor: 7, size: 1, opacity: 1 },
    text: { enabled: false, anchor: 2, size: 1, opacity: 1, content: '' },
    logo: { enabled: false, anchor: 0, size: 1, opacity: 1 },
    font: 0,
    color: '#ffffff',
  }
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const num = (v: unknown, min: number, max: number, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : fallback)
const int = (v: unknown, max: number, fallback: number) => Math.round(num(v, 0, max, fallback))

function item(raw: unknown, d: OverlayItem): OverlayItem {
  const r = isObj(raw) ? raw : {}
  return {
    enabled: r.enabled === true,
    anchor: int(r.anchor, ANCHORS.length - 1, d.anchor),
    size: num(r.size, SIZE_MIN, SIZE_MAX, d.size),
    opacity: num(r.opacity, 0, 1, d.opacity),
  }
}

export function normalizeOverlays(raw: unknown): OverlaySettings {
  const d = defaultOverlays()
  if (!isObj(raw)) return d
  const title = isObj(raw.title) ? raw.title : {}
  const text = isObj(raw.text) ? raw.text : {}
  return {
    title: { ...item(raw.title, d.title), hold: num(title.hold, 0, HOLD_MAX, d.title.hold) },
    lyrics: item(raw.lyrics, d.lyrics),
    text: { ...item(raw.text, d.text), content: typeof text.content === 'string' ? text.content.slice(0, TEXT_MAX) : '' },
    logo: item(raw.logo, d.logo),
    font: int(raw.font, FONTS.length - 1, d.font),
    color: typeof raw.color === 'string' && /^#[0-9a-f]{6}$/i.test(raw.color) ? raw.color.toLowerCase() : d.color,
  }
}
