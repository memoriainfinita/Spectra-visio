import { createStore } from '../core/store'
import { MidiClock, PressDetector, controlOf, isContinuous, mapControl, parseMidi, targetOfKey, type ControlId, type MidiTarget } from '../engine/midi/midi'
import { setTarget } from '../engine/scene/turn'
import { isAction } from '../engine/live/live'
import { stopCrossfader } from './crossfader'
import { analysis, renderer } from './engine'
import { runAction } from './live'
import { turnKnobTo } from './knobs'
import { sceneStore, setCrossfade, setLayerOpacity } from './scene'
import { settingsStore } from './settings'

// Web MIDI: controls feed modulations and mapped targets, the clock feeds the tempo.

export type MidiStatus = 'off' | 'pending' | 'on' | 'unsupported' | 'denied'

export interface MidiState {
  status: MidiStatus
  inputs: { id: string; name: string }[]
  // The control moved last, for the panel.
  last: ControlId | null
  // Tempo of the clock arriving, rounded; null without one.
  clockBpm: number | null
  // Which part of the interface is waiting for a control; null when none.
  learning: string | null
}

export const midiStore = createStore<MidiState>({ status: 'off', inputs: [], last: null, clockBpm: null, learning: null })

// Learning-mode callbacks get the next control moved.
type Learner = (control: ControlId) => void

const values = new Map<ControlId, number>()
const clock = new MidiClock()
const presses = new PressDetector()
let access: MIDIAccess | null = null
let learner: Learner | null = null
let lastShown: ControlId | null = null
let showPending = false
const CLOCK_SHOW_MS = 500

export const midiSupported = typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator

export const controlValue = (id: ControlId) => values.get(id) ?? 0

// Every control moved so far with its value, for the OBS source.
export const controlValues = (): [string, number][] => Array.from(values)

export function initMidi(): void {
  renderer.controls = controlValue
  analysis.clockSource = (time) => (settingsStore.get().midi.clock ? clock.read(time) : null)
  if (settingsStore.get().midi.enabled) void enableMidi()
}

export async function enableMidi(): Promise<boolean> {
  if (access) return true
  if (!midiSupported) {
    midiStore.set((s) => ({ ...s, status: 'unsupported' }))
    return false
  }
  midiStore.set((s) => ({ ...s, status: 'pending' }))
  try {
    access = await navigator.requestMIDIAccess()
  } catch {
    midiStore.set((s) => ({ ...s, status: 'denied' }))
    settingsStore.set((s) => ({ ...s, midi: { ...s.midi, enabled: false } }))
    return false
  }
  access.onstatechange = refreshInputs
  refreshInputs()
  midiStore.set((s) => ({ ...s, status: 'on' }))
  settingsStore.set((s) => ({ ...s, midi: { ...s.midi, enabled: true } }))
  setInterval(() => {
    const bpm = clock.read(performance.now())?.bpm
    const shown = bpm ? Math.round(bpm * 10) / 10 : null
    if (shown !== midiStore.get().clockBpm) midiStore.set((s) => ({ ...s, clockBpm: shown }))
  }, CLOCK_SHOW_MS)
  return true
}

function refreshInputs(): void {
  if (!access) return
  const inputs: MidiState['inputs'] = []
  access.inputs.forEach((input) => {
    inputs.push({ id: input.id, name: input.name || input.id })
    input.onmidimessage = (e) => onMessage(input.id, e)
  })
  midiStore.set((s) => ({ ...s, inputs }))
}

function onMessage(inputId: string, e: MIDIMessageEvent): void {
  const s = settingsStore.get().midi
  if ((s.input && s.input !== inputId) || !e.data) return
  const m = parseMidi(e.data)
  if (!m) return
  if (m.type === 'clock' || m.type === 'start' || m.type === 'continue' || m.type === 'stop') {
    clock.message(m, e.timeStamp || performance.now())
    return
  }
  const c = controlOf(m)
  if (!c) return
  values.set(c.id, c.value)
  showLast(c.id)
  // A note off is not a choice of control.
  if (learner && (m.type === 'cc' || c.value > 0)) {
    const l = learner
    stopLearning()
    l(c.id)
    return
  }
  const target = (Object.entries(s.map) as [MidiTarget, ControlId][]).find(([, id]) => id === c.id)?.[0]
  const pressed = presses.press(c.id, c.value)
  if (!target) return
  if (isContinuous(target)) continuous(target, c.value)
  else if (pressed && isAction(target)) runAction(target)
}

function continuous(target: MidiTarget, value: number): void {
  const n = (prefix: string) => Number(target.slice(prefix.length)) - 1
  const learned = targetOfKey(target)
  if (learned) sceneStore.set((s) => setTarget(s, learned, value))
  else if (target === 'crossfader') {
    stopCrossfader()
    setCrossfade(value)
  } else if (target.startsWith('opacity')) setLayerOpacity(n('opacity'), value)
  else if (target.startsWith('knob')) turnKnobTo({ bank: 'panel', i: n('knob') }, value)
  else if (target.startsWith('compKnob')) turnKnobTo({ bank: 'comp', i: n('compKnob') }, value)
  else if (target.startsWith('layerKnob')) {
    const s = sceneStore.get()
    turnKnobTo({ bank: 'layer', layer: s.layers[s.selected].id, i: n('layerKnob') }, value)
  }
}

// The panel shows the last control moved; a fader sends many messages a frame.
function showLast(id: ControlId): void {
  lastShown = id
  if (showPending) return
  showPending = true
  requestAnimationFrame(() => {
    showPending = false
    if (midiStore.get().last !== lastShown) midiStore.set((s) => ({ ...s, last: lastShown }))
  })
}

// The next control moved goes to `onLearn`; `key` names who asked, for the interface.
// Asks for MIDI access first if needed.
export async function learnControl(key: string, onLearn: Learner): Promise<void> {
  if (!(await enableMidi())) return
  learner = onLearn
  midiStore.set((s) => ({ ...s, learning: key }))
}

export function stopLearning(): void {
  learner = null
  if (midiStore.get().learning !== null) midiStore.set((s) => ({ ...s, learning: null }))
}

export function mapTarget(target: MidiTarget, control: ControlId | null): void {
  settingsStore.set((s) => ({ ...s, midi: { ...s.midi, map: mapControl(s.midi.map, target, control) } }))
}

export function setMidiInput(id: string | null): void {
  settingsStore.set((s) => ({ ...s, midi: { ...s.midi, input: id } }))
}

export function setMidiClock(on: boolean): void {
  settingsStore.set((s) => ({ ...s, midi: { ...s.midi, clock: on } }))
}
