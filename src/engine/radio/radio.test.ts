import { describe, expect, test } from 'vitest'
import { toStation } from './radio'

const entry = {
  stationuuid: 'a1',
  name: ' Jazz FM ',
  url: 'http://example.com/playlist.m3u',
  url_resolved: 'https://stream.example.com/jazz',
  country: 'Spain',
  codec: 'MP3',
  bitrate: 128,
  tags: 'jazz, smooth jazz,,lounge,chill,late night',
}

describe('toStation', () => {
  test('takes the resolved address and trims the rest', () => {
    expect(toStation(entry)).toEqual({
      id: 'a1',
      name: 'Jazz FM',
      url: 'https://stream.example.com/jazz',
      country: 'Spain',
      codec: 'MP3',
      bitrate: 128,
      tags: ['jazz', 'smooth jazz', 'lounge', 'chill'],
    })
  })

  test('drops stations that are not https', () => {
    expect(toStation({ ...entry, url_resolved: 'http://stream.example.com/jazz' })).toBeNull()
    expect(toStation({ ...entry, url_resolved: '', url: 'http://stream.example.com/jazz' })).toBeNull()
  })

  test('falls back to the plain address and fills what is missing', () => {
    const s = toStation({ stationuuid: 'b2', url: 'https://x.example/live', bitrate: 0 })
    expect(s).toEqual({ id: 'b2', name: 'https://x.example/live', url: 'https://x.example/live', country: '', codec: '', bitrate: 0, tags: [] })
  })

  test('rejects anything without an id', () => {
    expect(toStation({ ...entry, stationuuid: undefined })).toBeNull()
    expect(toStation(null)).toBeNull()
  })
})
