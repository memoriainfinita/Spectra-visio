import { expect, test } from 'vitest'
import { DEFAULT_PREFS, normalizeSession } from './session'

test('missing data gives an empty session with default prefs', () => {
  const s = normalizeSession(undefined)
  expect(s.tracks).toEqual([])
  expect(s.prefs).toEqual(DEFAULT_PREFS)
  expect(s.currentId).toBeNull()
})

test('prefs are clamped and invalid values replaced', () => {
  const s = normalizeSession({ prefs: { volume: 3, muted: 'x', repeat: 'twice', crossfade: -2, shuffle: true } })
  expect(s.prefs).toEqual({ volume: 1, muted: false, shuffle: true, repeat: 'off', crossfade: 0 })
})

test('invalid tracks are dropped; handle tracks need a file handle', () => {
  const s = normalizeSession({
    tracks: [
      { id: 'a', name: 'A', source: 'opfs', size: 10 },
      { id: 'b', name: 'B', source: 'handle', handle: { kind: 'file' } },
      { id: 'c', name: 'C', source: 'handle' },
      { id: 'd', name: 'D', source: 'cloud' },
      { name: 'no id', source: 'opfs' },
    ],
  })
  expect(s.tracks.map((t) => t.id)).toEqual(['a', 'b'])
  expect(s.tracks[0].fileName).toBe('A')
})

test('current track and position survive only if the track does', () => {
  const tracks = [{ id: 'a', name: 'A', source: 'opfs' }]
  expect(normalizeSession({ tracks, currentId: 'a', position: 42 })).toMatchObject({ currentId: 'a', position: 42 })
  expect(normalizeSession({ tracks, currentId: 'z', position: 42 })).toMatchObject({ currentId: null, position: 0 })
})
