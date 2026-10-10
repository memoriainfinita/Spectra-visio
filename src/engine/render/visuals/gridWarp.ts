import { TAU, drift, drive, fade, type Visual2D } from '../visual'

export const gridWarp: Visual2D = {
  id: 'gridWarp',
  label: 'visual.gridWarp',
  category: 'geometric',
  kind: '2d',
  params: [
    { id: 'density', label: 'param.density', min: 0.5, max: 2.5, default: 1 },
    { id: 'warp', label: 'param.warp', min: 0, max: 3, default: 1 },
  ],
  create(ctx) {
    let t = 0
    let pv = 0
    let ph = 0
    let hue = 0
    return {
      render(f, p, s) {
        const d = drive(f, p)
        const { width: w, height: h, dpr } = s
        const { bass, mid, treble } = d
        hue = drift(hue, d)
        fade(ctx, s, 0.1, f.dt)
        t += d.dt
        pv += d.dt * (0.9 + bass * 2.0)
        ph += d.dt * (1.0 + mid * 2.1)
        const h0 = hue + d.hue
        const step = Math.floor((Math.max(26, Math.min(64, 58 - 28 * (bass + mid))) * dpr) / p.density)
        const seg = 16 * dpr
        const amp = (0.018 + 0.085 * (bass * 0.65 + mid * 0.35)) * Math.min(w, h) * p.warp
        const swirl = 0.6 + 2.2 * treble

        ctx.globalCompositeOperation = 'lighter'
        ctx.lineWidth = (1 + 3 * treble) * dpr
        for (let x0 = -step; x0 <= w + step; x0 += step) {
          const q = x0 / w
          ctx.beginPath()
          ctx.strokeStyle = `hsla(${(h0 + 220 * q + 120 * treble) % 360}, 100%, 60%, ${(0.06 + 0.12 * (0.3 + 0.7 * mid)) * d.intensity})`
          for (let y = 0; y <= h; y += seg) {
            const ny = y / h
            const dx = Math.sin(pv + ny * TAU * (1.2 + swirl) + q * 3.0) * amp + Math.sin(t * 1.7 + (q + ny) * TAU * 0.6) * amp * 0.35
            if (y === 0) ctx.moveTo(x0 + dx, y)
            else ctx.lineTo(x0 + dx, y)
          }
          ctx.stroke()
        }
        for (let y0 = -step; y0 <= h + step; y0 += step) {
          const q = y0 / h
          ctx.beginPath()
          ctx.strokeStyle = `hsla(${(h0 + 180 + 220 * q + 140 * mid) % 360}, 100%, 60%, ${(0.05 + 0.1 * (0.3 + 0.7 * bass)) * d.intensity})`
          for (let x = 0; x <= w; x += seg) {
            const nx = x / w
            const dy = Math.cos(ph + nx * TAU * (1.1 + swirl) + q * 2.7) * amp + Math.cos(t * 1.5 + (q - nx) * TAU * 0.55) * amp * 0.35
            if (x === 0) ctx.moveTo(x, y0 + dy)
            else ctx.lineTo(x, y0 + dy)
          }
          ctx.stroke()
        }
        ctx.globalCompositeOperation = 'source-over'
        ctx.beginPath()
        ctx.fillStyle = `hsla(${(h0 + 40) % 360}, 100%, 60%, ${(0.05 + 0.2 * bass) * d.intensity})`
        ctx.arc(w / 2, h / 2, (10 + 180 * bass) * dpr, 0, TAU)
        ctx.fill()
      },
    }
  },
}
