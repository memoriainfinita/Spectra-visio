import { describe, expect, test } from 'vitest'
import { releaseGroups, syncedLyrics } from './lookup'

describe('lookup', () => {
  test('synced lyrics only, not plain or instrumental', () => {
    expect(syncedLyrics({ syncedLyrics: '[00:01.00] One more time', plainLyrics: 'One more time' })).toBe('[00:01.00] One more time')
    expect(syncedLyrics({ syncedLyrics: null, plainLyrics: 'x' })).toBeNull()
    expect(syncedLyrics({ instrumental: true, syncedLyrics: '' })).toBeNull()
  })

  test('release groups of strong matches, once each, in order', () => {
    const raw = { recordings: [
      { score: 100, releases: [{ 'release-group': { id: 'a' } }, { 'release-group': { id: 'b' } }] },
      { score: 95, releases: [{ 'release-group': { id: 'a' } }, { 'release-group': { id: 'c' } }] },
      { score: 60, releases: [{ 'release-group': { id: 'weak' } }] },
    ] }
    expect(releaseGroups(raw)).toEqual(['a', 'b', 'c'])
    expect(releaseGroups({})).toEqual([])
  })
})
