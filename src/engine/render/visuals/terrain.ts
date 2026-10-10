import { clear, drive, type Visual2D } from '../visual'

const MAX_ROWS = 60
const POINTS = 96
// New row of the landscape every this many seconds, at speed 1.
const ROW_EVERY_S = 0.06

// A landscape of past spectra receding to the horizon, each row a ridge line that hides
// the ones behind it. The spectrum is folded so the bass sits in the middle.
export const terrain: Visual2D = {
  id: 'terrain',
  label: 'visual.terrain',
  category: 'space',
  kind: '2d',
  params: [
    { id: 'rows', label: 'param.rows', min: 10, max: MAX_ROWS, default: 36, int: true },
    { id: 'amplitude', label: 'param.amplitude', min: 0.2, max: 3, default: 1 },
  ],
  create(ctx) {
    // Ring of rows, newest at `head`.
    const rows = Array.from({ length: MAX_ROWS }, () => new Float32Array(POINTS))
    let head = 0
    let due = 0
    let scroll = 0
    const xs = new Float32Array(POINTS)
    const ys = new Float32Array(POINTS)
    return {
      render(f, p, s) {
        const d = drive(f, p)
        const { width, height, dpr } = s
        clear(ctx, s)
        due += d.dt
        while (due >= ROW_EVERY_S) {
          due -= ROW_EVERY_S
          head = (head + 1) % MAX_ROWS
          const row = rows[head]
          for (let i = 0; i < POINTS; i++) {
            const c = Math.abs(i / (POINTS - 1) - 0.5) * 2
            // Edges stay flat so each ridge reads as a mountain range.
            const edge = Math.sin(Math.PI * (i / (POINTS - 1)))
            row[i] = d.spectrum(c) * edge * edge
          }
        }
        scroll = due / ROW_EVERY_S
        const count = p.rows
        const horizon = height * 0.32
        const ground = height * 1.05
        ctx.globalAlpha = Math.min(1, d.intensity)
        ctx.lineJoin = 'round'
        // New rows rise at the horizon and come closer. Back to front, so nearer ridges
        // cover the farther ones.
        for (let r = 0; r < count; r++) {
          const row = rows[(head - r + MAX_ROWS) % MAX_ROWS]
          // 0 at the horizon, 1 at the viewer.
          const depth = (r + scroll) / count
          const persp = depth * depth
          const y0 = horizon + (ground - horizon) * persp
          const spread = 0.25 + 0.95 * persp
          const amp = height * 0.32 * p.amplitude * (0.15 + 0.85 * persp)
          for (let i = 0; i < POINTS; i++) {
            xs[i] = width / 2 + (i / (POINTS - 1) - 0.5) * width * spread * 1.4
            ys[i] = y0 - row[i] * amp
          }
          ctx.beginPath()
          ctx.moveTo(xs[0], height)
          for (let i = 0; i < POINTS; i++) ctx.lineTo(xs[i], ys[i])
          ctx.lineTo(xs[POINTS - 1], height)
          ctx.closePath()
          ctx.fillStyle = '#000'
          ctx.fill()
          ctx.beginPath()
          for (let i = 0; i < POINTS; i++) (i ? ctx.lineTo : ctx.moveTo).call(ctx, xs[i], ys[i])
          const hue = 300 - depth * 120 + d.treble * 60 + d.hue
          ctx.strokeStyle = `hsla(${hue}, 90%, ${45 + depth * 25 + (d.beat ? 10 : 0)}%, ${0.25 + depth * 0.75})`
          ctx.lineWidth = (0.8 + depth * 2) * dpr
          ctx.stroke()
        }
      },
    }
  },
}
