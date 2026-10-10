import { TAU, clear, drive, type Visual2D } from '../visual'

export const tunnel: Visual2D = {
  id: 'tunnel',
  label: 'visual.tunnel',
  category: 'geometric',
  kind: '2d',
  params: [
    { id: 'rings', label: 'param.rings', min: 6, max: 40, default: 18, int: true },
    { id: 'twist', label: 'param.twist', min: 0, max: 4, default: 1 },
  ],
  create(ctx) {
    let z = 0
    return {
      render(f, p, s) {
        const d = drive(f, p)
        const { width, height, dpr } = s
        const cx = width / 2
        const cy = height / 2
        clear(ctx, s)
        z += d.dt * (1.2 + d.energy * 3)
        const rings = p.rings
        for (let i = 0; i < rings; i++) {
          const depth = (i / rings + z) % 1
          const scale = 0.2 + depth * 1.2
          const radius = Math.min(width, height) * 0.22 * scale * (1 + d.bass * 0.3)
          const hue = 180 + depth * 160 + d.treble * 80 + d.hue
          ctx.setTransform(1, 0, 0, 1, cx, cy)
          ctx.rotate((0.02 * i + d.mid * 0.1) * p.twist)
          ctx.beginPath()
          ctx.strokeStyle = `hsla(${hue}, 90%, 60%, ${Math.min(1, (1 - depth) * d.intensity)})`
          ctx.lineWidth = (6 * (1 - depth) + d.mid * 4) * dpr
          ctx.setLineDash([(30 * depth + 10) * dpr, 20 * dpr])
          ctx.arc(0, 0, radius, 0, TAU)
          ctx.stroke()
        }
      },
    }
  },
}
