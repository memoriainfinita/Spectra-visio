import { ACTIONS, isAction, type ActionId } from '../live/live'
import { MAX_LAYERS } from '../scene/limits'

// MIDI input: messages, controls, the clock and what controls are mapped to.

export type MidiMessage =
  | { type: 'cc'; channel: number; number: number; value: number }
  // Note off arrives as velocity 0, as many devices send it.
  | { type: 'note'; channel: number; number: number; velocity: number }
  | { type: 'clock' | 'start' | 'continue' | 'stop' }

export function parseMidi(data: ArrayLike<number>): MidiMessage | null {
  const status = data[0]
  if (status === 0xf8) return { type: 'clock' }
  if (status === 0xfa) return { type: 'start' }
  if (status === 0xfb) return { type: 'continue' }
  if (status === 0xfc) return { type: 'stop' }
  if (data.length < 3) return null
  const kind = status & 0xf0
  const channel = status & 0x0f
  if (kind === 0xb0) return { type: 'cc', channel, number: data[1] & 0x7f, value: data[2] & 0x7f }
  if (kind === 0x90) return { type: 'note', channel, number: data[1] & 0x7f, velocity: data[2] & 0x7f }
  if (kind === 0x80) return { type: 'note', channel, number: data[1] & 0x7f, velocity: 0 }
  return null
}

// A control as stored: "cc:<channel>:<number>" or "note:<channel>:<number>", channel 0–15.
export type ControlId = string

const CONTROL_RE = /^(cc|note):(\d{1,2}):(\d{1,3})$/

export function isControl(v: unknown): v is ControlId {
  const m = typeof v === 'string' ? CONTROL_RE.exec(v) : null
  return !!m && Number(m[2]) < 16 && Number(m[3]) < 128
}

// The control a message moves and its value 0–1; null for clock messages.
export function controlOf(m: MidiMessage): { id: ControlId; value: number } | null {
  if (m.type === 'cc') return { id: `cc:${m.channel}:${m.number}`, value: m.value / 127 }
  if (m.type === 'note') return { id: `note:${m.channel}:${m.number}`, value: m.velocity / 127 }
  return null
}

// --- Clock: 24 pulses per quarter note ---

export const PPQN = 24
// Without a pulse for this long the clock counts as gone.
export const CLOCK_TIMEOUT_MS = 500
// Pulse intervals averaged for the tempo: two beats.
const CLOCK_WINDOW = PPQN * 2

export interface ClockReading {
  bpm: number
  // 0–1 within the beat.
  phase: number
}

export class MidiClock {
  private times: number[] = []
  private ticks = 0
  private running = true

  // `time` in performance.now() milliseconds, as MIDI events carry it.
  message(m: MidiMessage, time: number): void {
    if (m.type === 'start') {
      this.ticks = 0
      this.times = []
      this.running = true
    } else if (m.type === 'continue') this.running = true
    else if (m.type === 'stop') this.running = false
    else if (m.type === 'clock') {
      // Some devices send pulses while stopped; they give the tempo but no beats.
      if (this.running) this.ticks++
      this.times.push(time)
      if (this.times.length > CLOCK_WINDOW + 1) this.times.shift()
    }
  }

  // Tempo and phase at `time`; the phase runs on between pulses. Null without a clock.
  read(time: number): ClockReading | null {
    const n = this.times.length
    if (n < PPQN / 2 || !this.running) return null
    const last = this.times[n - 1]
    if (time - last > CLOCK_TIMEOUT_MS) return null
    const interval = (last - this.times[0]) / (n - 1)
    if (!(interval > 0)) return null
    const between = Math.min(1, Math.max(0, (time - last) / interval))
    // `ticks` counts the pulse just received; the beat starts on pulse 1, 25, 49...
    const pulse = (((this.ticks - 1) % PPQN) + PPQN) % PPQN
    return { bpm: 60000 / (interval * PPQN), phase: Math.min(0.9999, (pulse + between) / PPQN) }
  }
}

// --- Mapping controls to the app ---

// What a control can drive: an action (on a button press or a CC crossing the middle),
// or a continuous value.
export const MIDI_TARGETS = [...ACTIONS, 'crossfader', ...Array.from({ length: MAX_LAYERS }, (_, i) => `opacity${i + 1}` as const)] as const
export type MidiTarget = ActionId | 'crossfader' | `opacity${number}`

export const isMidiTarget = (v: unknown): v is MidiTarget => (MIDI_TARGETS as readonly unknown[]).includes(v)
export const isContinuous = (t: MidiTarget) => !isAction(t)

export interface MidiSettings {
  // Asked for access before: ask again on the next visit.
  enabled: boolean
  // Device id, or null for every input.
  input: string | null
  // Follow a MIDI clock when one arrives.
  clock: boolean
  // Target → control.
  map: Partial<Record<MidiTarget, ControlId>>
}

export const DEFAULT_MIDI: MidiSettings = { enabled: false, input: null, clock: true, map: {} }

export function normalizeMidi(raw: unknown): MidiSettings {
  if (typeof raw !== 'object' || raw === null) return DEFAULT_MIDI
  const r = raw as Record<string, unknown>
  const map: MidiSettings['map'] = {}
  if (typeof r.map === 'object' && r.map !== null) {
    for (const [t, c] of Object.entries(r.map)) if (isMidiTarget(t) && isControl(c)) map[t] = c
  }
  return { enabled: r.enabled === true, input: typeof r.input === 'string' ? r.input : null, clock: r.clock !== false, map }
}

// A control drives one target: mapping it takes it from any other.
export function mapControl(map: MidiSettings['map'], target: MidiTarget, control: ControlId | null): MidiSettings['map'] {
  const out: MidiSettings['map'] = {}
  for (const [t, c] of Object.entries(map) as [MidiTarget, ControlId][]) if (t !== target && c !== control) out[t] = c
  if (control) out[target] = control
  return out
}

// Turns control values into presses. A note presses on any velocity and releases with
// note off; a CC presses when it rises through the middle, so a CC button (127, then 0)
// presses once.
export class PressDetector {
  private readonly down = new Map<ControlId, boolean>()

  press(id: ControlId, value: number): boolean {
    const was = this.down.get(id) ?? false
    const is = id.startsWith('note:') ? value > 0 : value >= 0.5
    this.down.set(id, is)
    return is && !was
  }
}
