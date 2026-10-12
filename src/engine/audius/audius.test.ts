import { describe, expect, test } from 'vitest'
import { toTrack } from './audius'

describe('audius', () => {
  test('a streamable track with its artist, genre and cover', () => {
    const t = toTrack({ id: 'mWB22', title: ' Ambient Snow ', duration: 509, genre: 'Experimental', play_count: 12611, is_streamable: true, user: { name: 'Blop' }, artwork: { '480x480': 'https://a.test/480.jpg' } })
    expect(t).toEqual({ id: 'mWB22', title: 'Ambient Snow', artist: 'Blop', duration: 509, genre: 'Experimental', artwork: 'https://a.test/480.jpg', plays: 12611 })
  })

  test('gated, deleted or not streamable tracks are left out', () => {
    expect(toTrack({ id: 'a', title: 'x', is_stream_gated: true })).toBeNull()
    expect(toTrack({ id: 'a', title: 'x', is_streamable: false })).toBeNull()
    expect(toTrack({ id: 'a', title: 'x', is_delete: true })).toBeNull()
    expect(toTrack({ title: 'no id' })).toBeNull()
  })
})
