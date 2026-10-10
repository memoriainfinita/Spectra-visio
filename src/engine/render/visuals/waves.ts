import { WAVE_SIZE } from '../../analysis/analyzer'
import { TAU, clear, drive, fade, type Visual2D } from '../visual'

// Stereo goniometer: left against right, turned 45° so mono is a vertical line and
// out-of-phase material spreads sideways. Phosphor trails.
export const lissajous: Visual2D = {
  id: 'lissajous',
  label: 'visual.lissajous',
  category: 'spectrum',
  kind: '2d',
  params: [
    { id: 'gain', label: 'param.gain', min: 0.2, max: 3, default: 1.2 },
    { id: 'thickness', label: 'param.thickness', min: 0.5, max: 4, default: 1 },
    { id: 'length', label: 'param.length', min: 0, max: 1, default: 0.5 },
  ],
  create(ctx) {
    return {
      render(f, p, s) {
        const d = drive(f, p)
        const { width, height, dpr } = s
        fade(ctx, s, 0.6 - p.length * 0.55, f.dt)
        const a = f.analysis
        if (!a) return
        const cx = width / 2
        const cy = height / 2
        const r = (Math.min(width, height) / 2.4) * p.gain * (p.sensitivity ?? 1)
        ctx.beginPath()
        for (let i = 0; i < WAVE_SIZE; i += 2) {
          const l = a.waveL[i]
          const rr = a.waveR[i]
          const x = cx + ((l - rr) / Math.SQRT2) * r
          const y = cy - ((l + rr) / Math.SQRT2) * r
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        const hue = 140 + d.treble * 80 + d.hue
        ctx.globalAlpha = Math.min(1, d.intensity)
        ctx.strokeStyle = `hsl(${hue}, 90%, ${d.beat ? 80 : 65}%)`
        ctx.lineWidth = 1.5 * dpr * p.thickness
        ctx.shadowBlur = 10 * dpr
        ctx.shadowColor = `hsl(${hue}, 100%, 60%)`
        ctx.stroke()
      },
    }
  },
}

// The waveform wrapped around circles that breathe with the bass and turn.
export const radialWave: Visual2D = {
  id: 'radialWave',
  label: 'visual.radialWave',
  category: 'spectrum',
  kind: '2d',
  params: [
    { id: 'rings', label: 'param.rings', min: 1, max: 6, default: 3, int: true },
    { id: 'gain', label: 'param.gain', min: 0.2, max: 3, default: 1 },
    { id: 'thickness', label: 'param.thickness', min: 0.5, max: 4, default: 1 },
  ],
  create(ctx) {
    let rot = 0
    return {
      render(f, p, s) {
        const d = drive(f, p)
        const { width, height, dpr } = s
        clear(ctx, s)
        rot += d.dt * (0.3 + d.mid)
        const cx = width / 2
        const cy = height / 2
        const base = Math.min(width, height) * 0.18 * (1 + d.bass * 0.35)
        const n = 256
        ctx.globalAlpha = Math.min(1, d.intensity)
        ctx.lineJoin = 'round'
        for (let k = 0; k < p.rings; k++) {
          const radius = base * (1 + k * 0.45)
          const turn = rot * (k % 2 ? -1 : 1) + k
          ctx.beginPath()
          for (let i = 0; i <= n; i++) {
            // Mirrored around the circle so the ends meet.
            const t = i / n
            const w = d.wave(Math.abs(t * 2 - 1))
            const rr = radius + w * radius * 0.5 * p.gain
            const ang = turn + t * TAU
            const x = cx + Math.cos(ang) * rr
            const y = cy + Math.sin(ang) * rr
            if (i === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          }
          const hue = 280 + k * 35 + d.treble * 90 + d.hue
          ctx.strokeStyle = `hsl(${hue}, 90%, ${60 + (d.beat ? 15 : 0)}%)`
          ctx.lineWidth = (2 + d.bass * 3) * dpr * p.thickness
          ctx.shadowBlur = 12 * dpr
          ctx.shadowColor = `hsl(${hue}, 100%, 60%)`
          ctx.stroke()
        }
      },
    }
  },
}
