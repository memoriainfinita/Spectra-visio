import { describe, expect, test } from 'vitest'
import type { Track } from '../engine/player/types'
import { queryOf } from './lookup'

const track = (name: string, meta: Track['meta']): Track => ({ id: '1', name, file: null, size: 0, meta, failed: false })

describe('lookup query', () => {
  test('artist and title from the tags, or from an "Artist - Title" name', () => {
    expect(queryOf(track('x', { artist: 'Daft Punk', title: 'One More Time', duration: 320 }))).toEqual({ artist: 'Daft Punk', title: 'One More Time', duration: 320 })
    expect(queryOf(track('Daft Punk - One More Time', {}))).toEqual({ artist: 'Daft Punk', title: 'One More Time', duration: 0 })
    expect(queryOf(track('Daft Punk - One More Time', { title: 'Tagged' }))).toEqual({ artist: 'Daft Punk', title: 'Tagged', duration: 0 })
    expect(queryOf(track('just a name', {}))).toBeNull()
  })
})
