import { describe, expect, it } from 'vitest'
import { createFrame } from '../analysis/analyzer'
import { decodeFrame, encodeFrame } from './codec'

describe('frame codec', () => {
  it('round-trips a frame closely, in a few kilobytes', () => {
    const f = createFrame()
    f.time = 12345.678
    f.bandCount = 32
    for (let i = 0; i < 32; i++) {
      f.bands[i] = i / 31
      f.bandsL[i] = (i % 5) / 4
      f.bandsR[i] = 1 - i / 31
    }
    f.bands[40] = 0.9 // past bandCount: not sent
    f.named.set([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7])
    f.beats.set([3, 1, 4, 1, 5, 9, 2, 6, 5])
    for (let i = 0; i < f.waveL.length; i++) {
      f.waveL[i] = Math.sin(i / 10) * 0.03
      f.waveR[i] = i === 7 ? 1.4 : -0.5
    }
    f.stereo = { rmsL: 0.2, rmsR: 0.3, balance: -0.1, correlation: 0.95 }
    f.bpm = 127.9987
    f.tempoMode = 'midi'
    f.tempoConfidence = 0.8
    f.phase = 0.25
    f.referenceDb = -18

    const wire = encodeFrame(f)
    const size = JSON.stringify(wire).length
    expect(size).toBeLessThan(7000)
    const g = decodeFrame(JSON.parse(JSON.stringify(wire)))
    expect(g.bandCount).toBe(32)
    for (let i = 0; i < 32; i++) expect(g.bands[i]).toBeCloseTo(f.bands[i], 4)
    expect(g.bands[40]).toBe(0)
    expect(g.bandsL[3]).toBeCloseTo(0.75, 4)
    expect(g.named[6]).toBeCloseTo(0.7, 4)
    expect(Array.from(g.beats)).toEqual([3, 1, 4, 1, 5, 9, 2, 6, 5])
    expect(g.waveL[16]).toBeCloseTo(f.waveL[16], 4)
    expect(g.waveR[7]).toBe(1)
    expect(g.waveR[8]).toBeCloseTo(-0.5, 4)
    expect(g.stereo.correlation).toBe(0.95)
    expect(g.bpm).toBe(127.999)
    expect(g.tempoMode).toBe('midi')
    expect(g.phase).toBe(0.25)
    expect(g.time).toBe(12345.7)
  })
})
