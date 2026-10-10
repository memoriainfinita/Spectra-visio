import { clear, drive, type Visual2D } from '../visual'

export const oscilloscope: Visual2D = {
  id: 'oscilloscope',
  label: 'visual.oscilloscope',
  kind: '2d',
  params: [
    { id: 'gain', label: 'param.gain', min: 0.2, max: 3, default: 1 },
    { id: 'thickness', label: 'param.thickness', min: 0.5, max: 4, default: 1 },
  ],
  create(ctx) {
    return {
      render(f, p, s) {
        const d = drive(f, p)
        const { width, height, dpr } = s
        clear(ctx, s)
        const n = 512
        ctx.beginPath()
        for (let i = 0; i < n; i++) {
          const x = (i / (n - 1)) * width
          const y = height / 2 + d.wave(i / (n - 1)) * (height / 3) * p.gain * (1 + d.energy * 0.6)
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.globalAlpha = Math.min(1, d.intensity)
        ctx.strokeStyle = d.beat ? `hsl(${186 + d.hue}, 100%, 75%)` : `hsl(${226 + d.hue}, 100%, 89%)`
        ctx.lineWidth = (2.5 + d.bass * 4) * dpr * p.thickness
        ctx.shadowBlur = (d.beat ? 18 : 8) * dpr
        ctx.shadowColor = `hsl(${186 + d.hue}, 100%, 71%)`
        ctx.stroke()
      },
    }
  },
}
