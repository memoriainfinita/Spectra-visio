import { TimestampFormat, type ILyricsTag } from 'music-metadata'
import { describe, expect, test } from 'vitest'
import { matchLyrics } from '../player/files'
import { syncedLyrics } from '../player/metadata'
import { normalizeScene } from '../scene/scene'
import { lineAt, parseLrc, toLrc } from './lrc'
import { defaultOverlays, normalizeOverlays } from './settings'

describe('LRC lyrics', () => {
  test('time tags, repeated lines, metadata, word tags, offset', () => {
    const lines = parseLrc(['[ar:Someone]', '[ti:Song]', '[offset:+500]', '[00:12.50]First line', '[00:05.00][01:00.25]Chorus  again', '[00:20.000]<00:20.10>Word <00:20.50>by word', '[00:30]', 'no tag here'].join('\r\n'))
    expect(lines).toEqual([
      { time: 4.5, text: 'Chorus again' },
      { time: 12, text: 'First line' },
      { time: 19.5, text: 'Word by word' },
      { time: 29.5, text: '' },
      { time: 59.75, text: 'Chorus again' },
    ])
    expect(parseLrc('just words\nno times')).toEqual([])
    expect(parseLrc('[00:01:50]Colon decimals')[0].time).toBe(1.5)
  })

  test('the line showing at a moment', () => {
    const lines = parseLrc('[00:01.00]a\n[00:02.00]b\n[00:03.00]c')
    expect(lineAt(lines, 0.5)).toBe(-1)
    expect(lineAt(lines, 1)).toBe(0)
    expect(lineAt(lines, 2.99)).toBe(1)
    expect(lineAt(lines, 99)).toBe(2)
    expect(lineAt([], 5)).toBe(-1)
  })

  test('synced tag lyrics as LRC, and LRC written in plain lyrics', () => {
    expect(toLrc([{ text: 'Hello', timestamp: 61250 }, { text: 'no time' }, { text: ' there ', timestamp: 500 }])).toBe('[01:01.25]Hello\n[00:00.50]there')
    const synced = { contentType: 1, timeStampFormat: TimestampFormat.milliseconds, syncText: [{ text: 'Hi', timestamp: 1000 }] } as unknown as ILyricsTag
    expect(syncedLyrics([synced])).toBe('[00:01.00]Hi')
    const plain = { contentType: 1, timeStampFormat: TimestampFormat.notSynchronized, syncText: [], text: '[00:02.00]From text' } as unknown as ILyricsTag
    expect(syncedLyrics([plain])).toBe('[00:02.00]From text')
    const unsynced = { contentType: 1, timeStampFormat: TimestampFormat.notSynchronized, syncText: [], text: 'Just words' } as unknown as ILyricsTag
    expect(syncedLyrics([unsynced])).toBeUndefined()
    expect(syncedLyrics(undefined)).toBeUndefined()
  })

  test('lyrics files matched to audio by name', () => {
    const m = matchLyrics([{ name: '01 - Song.mp3' }, { name: 'Other.flac' }, { name: 'none.ogg' }], [{ name: 'other.LRC' }, { name: '01 - Song.lrc' }])
    expect([...m]).toEqual([
      [0, 1],
      [1, 0],
    ])
  })
})

describe('overlay settings', () => {
  test('normalized: ranges, anchors, colour, text length; older scenes get defaults', () => {
    const o = normalizeOverlays({ title: { enabled: true, anchor: 99, size: 10, opacity: -1, hold: 100 }, text: { enabled: 1, content: 'x'.repeat(600) }, font: 7, color: '#ABCDEF' })
    expect(o.title).toEqual({ enabled: true, anchor: 8, size: 3, opacity: 0, hold: 30 })
    expect(o.text.enabled).toBe(false)
    expect(o.text.content).toHaveLength(500)
    expect(o.font).toBe(2)
    expect(o.color).toBe('#abcdef')
    expect(normalizeOverlays({ color: 'red' }).color).toBe('#ffffff')
    expect(normalizeScene({ layers: [] }).overlays).toEqual(defaultOverlays())
  })
})
