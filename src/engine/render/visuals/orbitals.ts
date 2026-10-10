import { TAU, drift, drive, fade, type Visual2D } from '../visual'

export const orbitals: Visual2D = {
  id: 'orbitals',
  label: 'visual.orbitals',
  kind: '2d',
  params: [{ id: 'particles', label: 'param.particles', min: 40, max: 600, default: 140, int: true }],
  create(ctx) {
    let t = 0
    let a0 = 0
    let b0 = 0
    let hue = 0
    return {
      render(f, p, s) {
        const d = drive(f, p)
        const { width, height, dpr } = s
        const { bass, mid, treble } = d
        hue = drift(hue, d)
        fade(ctx, s, 0.07, f.dt)
        t += d.dt
        a0 += d.dt * (0.9 + 2.0 * bass)
        b0 += d.dt * (1.3 + 1.7 * mid)
        // v0: 140 particles plus up to 420 more with the audio.
        const count = p.particles + Math.floor(p.particles * 3 * (bass * 0.7 + treble * 0.3))
        const R = Math.min(width, height) * (0.28 + 0.1 * mid)
        const alpha = (0.035 + 0.1 * treble + 0.08 * bass) * d.intensity
        const h0 = hue + d.hue

        ctx.translate(width / 2, height / 2)
        ctx.globalCompositeOperation = 'lighter'
        for (let i = 0; i < count; i++) {
          const q = i / count
          const v = d.wave(q)
          // Lissajous-like orbits
          const a = a0 + q * TAU
          const b = b0 + q * TAU * 1.7
          const x = Math.cos(a) * R * (0.35 + 0.85 * (0.5 + 0.5 * Math.sin(b))) + Math.cos(b * 0.6) * R * 0.12
          const y = Math.sin(b) * R * (0.35 + 0.85 * (0.5 + 0.5 * Math.sin(a))) + Math.sin(a * 0.7) * R * 0.12
          const r = (0.8 + 2.8 * (0.5 + 0.5 * v) + 10 * treble) * dpr
          ctx.beginPath()
          ctx.fillStyle = `hsla(${(h0 + 360 * q + 140 * (0.5 + 0.5 * v)) % 360}, 100%, 60%, ${alpha})`
          ctx.arc(x, y, r, 0, TAU)
          ctx.fill()
        }
        ctx.beginPath()
        ctx.lineWidth = (1 + 6 * treble) * dpr
        ctx.strokeStyle = `hsla(${(h0 + 20) % 360}, 100%, 60%, ${(0.1 + 0.15 * treble) * d.intensity})`
        ctx.ellipse(0, 0, R * (1 + 0.08 * Math.sin(t * 2)), R * (0.82 + 0.1 * Math.cos(t * 1.6)), t * 0.4, 0, TAU)
        ctx.stroke()
      },
    }
  },
}
