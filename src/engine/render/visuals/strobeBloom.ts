import { TAU, drift, drive, fade, type Visual2D } from '../visual'

// Flash stays well below a hard strobe: photosensitivity limit. The flash parameter only
// scales it down.
const FLASH_CAP = 0.35
const FLASH_ALPHA_CAP = 0.22

export const strobeBloom: Visual2D = {
  id: 'strobeBloom',
  label: 'visual.strobeBloom',
  kind: '2d',
  params: [
    { id: 'petals', label: 'param.petals', min: 4, max: 30, default: 10, int: true },
    { id: 'flash', label: 'param.flash', min: 0, max: 1, default: 1 },
  ],
  create(ctx) {
    let petalPhase = 0
    let ringPhase = 0
    let flash = 0
    let prevEnergy = 0
    let hue = 0
    return {
      render(f, p, s) {
        const d = drive(f, p)
        const { width: w, height: h, dpr } = s
        const { bass, mid, treble, energy } = d
        const dt = f.dt
        hue = drift(hue, d)
        fade(ctx, s, 0.12, dt)
        const h0 = hue + d.hue

        const delta = Math.max(0, energy - prevEnergy)
        prevEnergy = energy
        flash = Math.min(FLASH_CAP, flash + Math.max(0, delta - 0.03) * (2.2 + 3.5 * treble))

        petalPhase += d.dt * (0.35 + 1.6 * (bass * 0.7 + treble * 0.3))
        ringPhase += d.dt * (0.6 + bass * 2.4)
        const cx = w / 2
        const cy = h / 2
        const petals = p.petals + Math.floor(18 * treble)
        const baseR = Math.min(w, h) * (0.1 + 0.2 * mid)
        const wob = 0.6 + 2.0 * bass

        ctx.translate(cx, cy)
        ctx.globalCompositeOperation = 'lighter'
        for (let i = 0; i < petals; i++) {
          const q = i / petals
          const a = petalPhase + q * TAU
          const r = baseR * (0.9 + 0.6 * Math.sin(a * wob + q * 5.0)) + (40 + 220 * bass) * q * dpr
          ctx.beginPath()
          ctx.lineWidth = (1 + 10 * (treble * 0.6 + bass * 0.4)) * dpr
          ctx.strokeStyle = `hsla(${(h0 + 360 * q + 180 * treble) % 360}, 100%, 60%, ${(0.03 + 0.12 * (0.3 + 0.7 * mid)) * d.intensity})`
          ctx.arc(Math.cos(a) * 6 * dpr, Math.sin(a) * 6 * dpr, Math.max(0, r), a, a + TAU * 0.55)
          ctx.stroke()
        }

        const shown = flash * p.flash
        if (shown > 0.001) {
          ctx.globalCompositeOperation = 'screen'
          ctx.fillStyle = `hsla(${(h0 + 30) % 360}, 100%, 70%, ${Math.min(FLASH_ALPHA_CAP, shown)})`
          ctx.fillRect(-cx, -cy, w, h)
          ctx.globalCompositeOperation = 'lighter'
          for (let k = 0; k < 2; k++) {
            const pp = (ringPhase + k / 2) % 1
            ctx.beginPath()
            ctx.lineWidth = (1 + 10 * treble) * dpr
            ctx.strokeStyle = `hsla(${(h0 + 60 + k * 40) % 360}, 100%, 65%, ${0.12 * (1 - pp) * Math.min(1, shown * 2)})`
            ctx.arc(0, 0, pp * Math.hypot(cx, cy), 0, TAU)
            ctx.stroke()
          }
        }
        flash = Math.max(0, flash - dt * (1.8 + 2.8 * (0.5 + bass)))
      },
    }
  },
}
