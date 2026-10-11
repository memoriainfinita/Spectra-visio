import { describe, expect, it } from 'vitest'
import { fixedRatio, formatPixels, normalizeFormat } from './format'

describe('formatPixels', () => {
  it('is null for auto', () => {
    expect(formatPixels({ size: 'auto', aspect: '9:16' })).toBeNull()
  })

  it('gives the usual video sizes', () => {
    expect(formatPixels({ size: '720', aspect: '16:9' })).toEqual({ width: 1280, height: 720 })
    expect(formatPixels({ size: '1080', aspect: '16:9' })).toEqual({ width: 1920, height: 1080 })
    expect(formatPixels({ size: '2160', aspect: '16:9' })).toEqual({ width: 3840, height: 2160 })
    expect(formatPixels({ size: '1080', aspect: '9:16' })).toEqual({ width: 1080, height: 1920 })
    expect(formatPixels({ size: '1440', aspect: '1:1' })).toEqual({ width: 1440, height: 1440 })
  })

  it('scales the visuals by the short side', () => {
    expect(fixedRatio({ width: 1920, height: 1080 })).toBe(1)
    expect(fixedRatio({ width: 2160, height: 3840 })).toBe(2)
  })
})

describe('normalizeFormat', () => {
  it('keeps valid fields and replaces the rest', () => {
    expect(normalizeFormat({ size: '1440', aspect: 'wide' })).toEqual({ size: '1440', aspect: '16:9' })
    expect(normalizeFormat(null)).toEqual({ size: 'auto', aspect: '16:9' })
  })
})
