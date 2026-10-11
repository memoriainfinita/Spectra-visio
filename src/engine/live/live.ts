import { CLIP_COLUMNS } from '../scene/limits'

// Live control: the actions a key or a MIDI control can trigger, and the output stage
// (blackout, freeze, strobe).

const COLUMN_ACTIONS = Array.from({ length: CLIP_COLUMNS }, (_, c) => `column${c + 1}` as const)

export const ACTIONS = [
  'play',
  'next',
  'previous',
  'seekForward',
  'seekBack',
  'tap',
  'auto',
  ...COLUMN_ACTIONS,
  'crossA',
  'crossSwap',
  'crossB',
  'blackout',
  'freeze',
  'strobe',
] as const
export type ActionId = (typeof ACTIONS)[number]

export const isAction = (v: unknown): v is ActionId => (ACTIONS as readonly unknown[]).includes(v)

// Action → key, as `keyCombo` writes it.
export type KeyMap = Partial<Record<ActionId, string>>

export const DEFAULT_KEYS: KeyMap = {
  play: ' ',
  next: 'Shift+ArrowRight',
  previous: 'Shift+ArrowLeft',
  seekForward: 'ArrowRight',
  seekBack: 'ArrowLeft',
  tap: 't',
  auto: 'a',
  ...Object.fromEntries(COLUMN_ACTIONS.map((id, c) => [id, String(c + 1)])),
  crossA: 'z',
  crossSwap: 'x',
  crossB: 'c',
  blackout: 'b',
  freeze: 'f',
  strobe: 's',
}

// A key as stored: printable keys in lower case (Shift is already in the character),
// named keys with "Shift+" when it is held. Null for modifiers alone and combinations with
// Ctrl, Alt or Meta, which stay with the browser.
export function keyCombo(e: Pick<KeyboardEvent, 'key' | 'shiftKey' | 'ctrlKey' | 'altKey' | 'metaKey'>): string | null {
  if (e.ctrlKey || e.altKey || e.metaKey) return null
  if (['Shift', 'Control', 'Alt', 'Meta', 'AltGraph', 'CapsLock', 'Dead', 'Unidentified'].includes(e.key)) return null
  if (e.key.length === 1) return e.key.toLowerCase()
  return e.shiftKey ? `Shift+${e.key}` : e.key
}

// Unknown actions and empty keys dropped; a key bound twice keeps its first action.
export function normalizeKeys(raw: unknown): KeyMap {
  if (typeof raw !== 'object' || raw === null) return { ...DEFAULT_KEYS }
  const out: KeyMap = {}
  const used = new Set<string>()
  for (const [id, key] of Object.entries(raw)) {
    if (!isAction(id) || typeof key !== 'string' || !key || key.length > 40 || used.has(key)) continue
    out[id] = key
    used.add(key)
  }
  return out
}

// Binds `key` to `action`, taking it from any other action; null unbinds.
export function bindKey(keys: KeyMap, action: ActionId, key: string | null): KeyMap {
  const out: KeyMap = {}
  for (const [id, k] of Object.entries(keys) as [ActionId, string][]) if (id !== action && k !== key) out[id] = k
  if (key) out[action] = key
  return out
}

export function actionForKey(keys: KeyMap, key: string): ActionId | null {
  for (const [id, k] of Object.entries(keys) as [ActionId, string][]) if (k === key) return id
  return null
}

// --- Output stage ---

// Strobe rate: on each beat, or flashes per second.
export const STROBE_RATES = ['beat', 1, 2, 3] as const
export type StrobeRate = (typeof STROBE_RATES)[number]
// Photosensitivity limit (WCAG 2.3.1): never more than three flashes in any second. At
// exactly a third of a second, four could fit in one; the margin keeps it at three.
export const MIN_FLASH_GAP_MS = 350
export const FLASH_MS = 60
export const BLACKOUT_FADE_MS = 250

export interface LiveSettings {
  keys: KeyMap
  strobe: StrobeRate
}

export const DEFAULT_LIVE: LiveSettings = { keys: DEFAULT_KEYS, strobe: 'beat' }

export function normalizeLive(raw: unknown): LiveSettings {
  if (typeof raw !== 'object' || raw === null) return DEFAULT_LIVE
  const r = raw as Record<string, unknown>
  return {
    keys: r.keys === undefined ? DEFAULT_KEYS : normalizeKeys(r.keys),
    strobe: (STROBE_RATES as readonly unknown[]).includes(r.strobe) ? (r.strobe as StrobeRate) : DEFAULT_LIVE.strobe,
  }
}

export interface OutputState {
  // 0 the image, 1 black.
  black: number
  // 0 the image, 1 white.
  flash: number
  freeze: boolean
}

export interface OutputInput {
  now: number
  blackout: boolean
  freeze: boolean
  strobe: boolean
  rate: StrobeRate
  // Beat phase of the tempo, 0–1; null without a tempo.
  phase: number | null
}

// Turns the switches into what the output shows, frame by frame: the blackout fades,
// the strobe flashes white on the beat or at its rate, never faster than the limit.
export class OutputStage {
  private black = 0
  private last: number | null = null
  private lastFlash = -Infinity
  private phase: number | null = null

  tick(input: OutputInput): OutputState {
    const { now } = input
    // Two windows read it, each with its own frame times: never step back.
    const dt = this.last === null ? 0 : Math.max(0, now - this.last)
    this.last = Math.max(this.last ?? now, now)
    const step = dt / BLACKOUT_FADE_MS
    this.black = input.blackout ? Math.min(1, this.black + step) : Math.max(0, this.black - step)

    // A beat is where the phase wraps.
    const newBeat = input.phase !== null && this.phase !== null && input.phase < this.phase - 0.5
    this.phase = input.phase
    if (input.strobe) {
      const due = input.rate === 'beat' ? newBeat : now - this.lastFlash >= 1000 / input.rate
      if (due && now - this.lastFlash >= MIN_FLASH_GAP_MS) this.lastFlash = now
    }
    const flash = input.strobe && now - this.lastFlash < FLASH_MS ? 1 : 0
    return { black: this.black, flash, freeze: input.freeze }
  }
}
