import { describe, expect, it } from 'vitest'
import { bitrates, extensionOf, formatLabel, pickMime, recordingName } from './recorder'

describe('pickMime', () => {
  it('prefers containers that stream, MP4 last', () => {
    expect(pickMime(() => true)).toBe('video/x-matroska;codecs=avc1,opus')
    expect(pickMime((t) => t.startsWith('video/webm'))).toBe('video/webm;codecs=vp9,opus')
    expect(pickMime((t) => t.startsWith('video/mp4'))).toBe('video/mp4;codecs=avc1.640033,mp4a.40.2')
    expect(pickMime(() => false)).toBeNull()
  })

  it('names the extension after the container', () => {
    expect(extensionOf('video/mp4;codecs=avc1,mp4a.40.2')).toBe('mp4')
    expect(extensionOf('video/webm;codecs=vp8,opus')).toBe('webm')
    expect(extensionOf('video/x-matroska;codecs=avc1,opus')).toBe('mkv')
    expect(formatLabel('video/x-matroska;codecs=avc1,opus')).toBe('MKV · H.264')
    expect(formatLabel('video/webm;codecs=vp8,opus')).toBe('WEBM · VP8')
  })
})

describe('bitrates', () => {
  it('grows with size, rate and quality, within limits', () => {
    const hd = { width: 1920, height: 1080 }
    expect(bitrates(hd, 60, 'high').video).toBe(12_441_600)
    expect(bitrates(hd, 30, 'high').video).toBe(6_220_800)
    expect(bitrates({ width: 3840, height: 2160 }, 60, 'max').video).toBe(99_532_800)
    expect(bitrates({ width: 64, height: 64 }, 30, 'standard').video).toBe(2_000_000)
    expect(bitrates(hd, 60, 'max').audio).toBe(320_000)
  })
})

describe('recordingName', () => {
  it('stamps the local date and time', () => {
    expect(recordingName(new Date(2026, 9, 11, 21, 5, 3), 'mp4')).toBe('spectravisio-20261011-210503.mp4')
  })
})
