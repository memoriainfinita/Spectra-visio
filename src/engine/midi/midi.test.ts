import { describe, expect, test } from 'vitest'
import { CLOCK_TIMEOUT_MS, MidiClock, PPQN, PressDetector, controlOf, isControl, mapControl, normalizeMidi, parseMidi } from './midi'

describe('messages', () => {
  test('CC, note on and off, clock and transport', () => {
    expect(parseMidi([0xb3, 7, 127])).toEqual({ type: 'cc', channel: 3, number: 7, value: 127 })
    expect(parseMidi([0x90, 36, 100])).toEqual({ type: 'note', channel: 0, number: 36, velocity: 100 })
    expect(parseMidi([0x80, 36, 64])).toEqual({ type: 'note', channel: 0, number: 36, velocity: 0 })
    expect(parseMidi([0xf8])).toEqual({ type: 'clock' })
    expect(parseMidi([0xfa])).toEqual({ type: 'start' })
    expect(parseMidi([0xe0, 0, 64])).toBeNull()
    expect(controlOf({ type: 'cc', channel: 1, number: 20, value: 127 })).toEqual({ id: 'cc:1:20', value: 1 })
    expect(controlOf({ type: 'clock' })).toBeNull()
  })

  test('control ids', () => {
    expect(isControl('cc:0:7')).toBe(true)
    expect(isControl('note:15:127')).toBe(true)
    expect(isControl('cc:16:7')).toBe(false)
    expect(isControl('pb:0:0')).toBe(false)
  })
})

describe('clock', () => {
  // `beats` beats at `bpm`, pulses from time 0, after a Start.
  function run(bpm: number, beats: number): { clock: MidiClock; last: number; interval: number } {
    const clock = new MidiClock()
    const interval = 60000 / bpm / PPQN
    clock.message({ type: 'start' }, 0)
    let t = 0
    for (let i = 0; i < beats * PPQN; i++) {
      t = i * interval
      clock.message({ type: 'clock' }, t)
    }
    return { clock, last: t, interval }
  }

  test('tempo from the pulses; phase at the beat and between pulses', () => {
    const { clock, last, interval } = run(128, 4)
    const r = clock.read(last)!
    expect(r.bpm).toBeCloseTo(128, 3)
    // The last pulse is the 24th of the fourth beat.
    expect(r.phase).toBeCloseTo(23 / 24, 5)
    expect(clock.read(last + interval / 2)!.phase).toBeCloseTo(23.5 / 24, 5)
    clock.message({ type: 'clock' }, last + interval)
    expect(clock.read(last + interval)!.phase).toBe(0)
  })

  test('nothing after a stop or without pulses for a while', () => {
    const { clock, last } = run(120, 2)
    expect(clock.read(last + CLOCK_TIMEOUT_MS + 1)).toBeNull()
    clock.message({ type: 'stop' }, last)
    expect(clock.read(last)).toBeNull()
    expect(new MidiClock().read(0)).toBeNull()
  })
})

describe('mapping', () => {
  test('a control drives one target', () => {
    let map = mapControl({}, 'blackout', 'note:0:36')
    map = mapControl(map, 'freeze', 'note:0:36')
    expect(map).toEqual({ freeze: 'note:0:36' })
    expect(mapControl(map, 'freeze', null)).toEqual({})
  })

  test('stored settings checked', () => {
    expect(normalizeMidi({ enabled: true, input: 'x', clock: false, map: { blackout: 'cc:0:1', crossfader: 'bad', opacity3: 'cc:0:2', nope: 'cc:0:3' } })).toEqual({
      enabled: true,
      input: 'x',
      clock: false,
      map: { blackout: 'cc:0:1', opacity3: 'cc:0:2' },
    })
    expect(normalizeMidi(null).clock).toBe(true)
  })

  test('presses: a note at any velocity, a CC through the middle', () => {
    const p = new PressDetector()
    expect(p.press('note:0:36', 10 / 127)).toBe(true)
    expect(p.press('note:0:36', 20 / 127)).toBe(false)
    expect(p.press('note:0:36', 0)).toBe(false)
    expect(p.press('note:0:36', 0.2)).toBe(true)
    expect(p.press('cc:0:1', 0.3)).toBe(false)
    expect(p.press('cc:0:1', 0.7)).toBe(true)
    expect(p.press('cc:0:1', 1)).toBe(false)
  })
})
