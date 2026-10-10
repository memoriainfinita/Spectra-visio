import { TAU, drift, drive, fade, type Visual2D } from '../visual'

export const kaleido: Visual2D = {
  id: 'kaleido',
  label: 'visual.kaleido',
  category: 'geometric',
  kind: '2d',
  params: [
    { id: 'segments', label: 'param.segments', min: 4, max: 24, default: 12, int: true },
    { id: 'bars', label: 'param.bars', min: 24, max: 144, default: 72, int: true },
  ],
  create(ctx) {
    let rot = 0
    let hue = 0
    return {
      render(f, p, s) {
        const d = drive(f, p)
        const { width, height, dpr } = s
        const { bass, mid, treble } = d
        hue = drift(hue, d)
        fade(ctx, s, 0.09, f.dt)
        const seg = p.segments + Math.floor(10 * treble)
        const bars = p.bars
        const maxR = Math.min(width, height) * (0.42 + 0.1 * bass)
        rot += d.dt * (0.25 + 1.6 * (bass * 0.7 + mid * 0.3))
        const h0 = hue + d.hue

        ctx.translate(width / 2, height / 2)
        ctx.globalCompositeOperation = 'lighter'
        for (let sg = 0; sg < seg; sg++) {
          ctx.save()
          ctx.rotate(rot + (sg / seg) * TAU)
          ctx.scale(sg % 2 === 0 ? 1 : -1, 1)
          for (let i = 0; i < bars; i++) {
            const q = i / (bars - 1)
            const v = d.spectrum(q)
            const a = q * (TAU / seg) * 0.92
            const r0 = (0.08 + 0.55 * q) * maxR
            const r1 = r0 + (10 + 90 * v) * dpr * (0.25 + 0.75 * (0.4 * mid + 0.6 * treble))
            ctx.beginPath()
            ctx.lineWidth = (1 + 6 * (v * 0.7 + bass * 0.3)) * dpr
            ctx.strokeStyle = `hsla(${(h0 + 240 * q + 140 * v) % 360}, 100%, 60%, ${(0.06 + 0.22 * v) * d.intensity})`
            ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0)
            ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1)
            ctx.stroke()
          }
          ctx.restore()
        }
        ctx.beginPath()
        ctx.fillStyle = `hsla(${(h0 + 40) % 360}, 100%, 60%, ${0.22 * d.intensity})`
        ctx.arc(0, 0, (8 + 220 * bass) * dpr, 0, TAU)
        ctx.fill()
      },
    }
  },
}
