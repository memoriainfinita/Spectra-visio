import { expect, test } from 'vitest'
import { formatTime } from '../../ui/format'
import { baseName, byName, isAudioFile } from './files'

test('audio files are recognised by type, or by extension when the type is empty', () => {
  expect(isAudioFile({ name: 'x.bin', type: 'audio/mpeg' })).toBe(true)
  expect(isAudioFile({ name: 'song.FLAC', type: '' })).toBe(true)
  expect(isAudioFile({ name: 'clip.m4a', type: 'video/mp4' })).toBe(true)
  expect(isAudioFile({ name: 'cover.jpg', type: '' })).toBe(false)
  expect(isAudioFile({ name: 'cover.mp3', type: 'image/jpeg' })).toBe(false)
})

test('baseName strips only the last extension', () => {
  expect(baseName('03 - A.b.mp3')).toBe('03 - A.b')
  expect(baseName('.hidden')).toBe('.hidden')
})

test('byName sorts numbers naturally', () => {
  const names = ['10 - x', '2 - y', '1 - z'].map((name) => ({ name }))
  expect(names.sort(byName).map((n) => n.name)).toEqual(['1 - z', '2 - y', '10 - x'])
})

test('formatTime', () => {
  expect(formatTime(0)).toBe('0:00')
  expect(formatTime(75.9)).toBe('1:15')
  expect(formatTime(3725)).toBe('1:02:05')
  expect(formatTime(NaN)).toBe('--:--')
  expect(formatTime(null)).toBe('--:--')
})
