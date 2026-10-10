import { drive, fade, type Visual2D } from '../visual'

export const ribbons: Visual2D = {
  id: 'ribbons',
  label: 'visual.ribbons',
  category: 'spectrum',
  kind: '2d',
  params: [
    { id: 'rows', label: 'param.rows', min: 1, max: 12, default: 5, int: true },
    { id: 'amplitude', label: 'param.amplitude', min: 0.2, max: 3, default: 1 },
  ],
  create(ctx) {
    let t = 0
    return {
      render(f, p, s) {
        const d = drive(f, p)
        const { width, height, dpr } = s
        fade(ctx, s, 0.22, f.dt)
        t += d.dt * (1.8 + d.energy * 2.4)
        const rows = p.rows
        const step = 10 * dpr
        for (let r = 0; r < rows; r++) {
          const y = height * (0.2 + (r / rows) * 0.6)
          ctx.beginPath()
          for (let x = 0; x <= width; x += step) {
            const offset = Math.sin((x / dpr) * 0.01 + t + r) * 40 * dpr * p.amplitude
            const ny = y + offset * (0.3 + d.spectrum(x / width) * 1.6)
            if (x === 0) ctx.moveTo(x, ny)
            else ctx.lineTo(x, ny)
          }
          const hue = 200 + r * 30 + d.mid * 120 + d.hue
          ctx.strokeStyle = `hsla(${hue}, 85%, 65%, ${Math.min(1, (0.6 + d.energy * 0.4) * d.intensity)})`
          ctx.lineWidth = (3 + d.bass * 8) * dpr
          ctx.stroke()
        }
      },
    }
  },
}
