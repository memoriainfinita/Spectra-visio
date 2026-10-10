import { TAU, drive, fade, type Visual2D } from '../visual'

const MAX_STARS = 3000
// Depth range of the stars, in units of the screen half-size.
const NEAR = 0.05
const FAR = 4
const DEPTH_STEPS = 8

// Stars flying at the viewer; the energy sets the speed and each kick a burst of warp.
export const starfield: Visual2D = {
  id: 'starfield',
  label: 'visual.starfield',
  category: 'particles',
  kind: '2d',
  params: [
    { id: 'particles', label: 'param.particles', min: 200, max: MAX_STARS, default: 1200, int: true },
    { id: 'warp', label: 'param.warp', min: 0, max: 3, default: 1 },
  ],
  create(ctx) {
    const x = new Float32Array(MAX_STARS)
    const y = new Float32Array(MAX_STARS)
    const z = new Float32Array(MAX_STARS)
    const spawn = (i: number, depth: number) => {
      x[i] = (Math.random() * 2 - 1) * 1.6
      y[i] = (Math.random() * 2 - 1) * 1.6
      z[i] = depth
    }
    for (let i = 0; i < MAX_STARS; i++) spawn(i, NEAR + Math.random() * (FAR - NEAR))
    let boost = 0
    return {
      render(f, p, s) {
        const d = drive(f, p)
        const { width, height, dpr } = s
        fade(ctx, s, 0.5, f.dt)
        if (d.beat) boost = 1
        boost *= Math.exp(-f.dt * 4)
        const speed = (0.4 + d.energy * 2.2 + boost * 3 * p.warp) * d.dt
        const cx = width / 2
        const cy = height / 2
        const k = Math.min(width, height) / 2
        ctx.globalAlpha = Math.min(1, d.intensity)
        ctx.lineCap = 'round'
        const hue = 200 + d.treble * 100 + d.hue
        // One path per depth step: a style change per star would cost more than the drawing.
        const paths = Array.from({ length: DEPTH_STEPS }, () => new Path2D())
        for (let i = 0; i < p.particles; i++) {
          const z0 = z[i]
          const z1 = z0 - speed
          if (z1 <= NEAR) {
            spawn(i, FAR)
            continue
          }
          z[i] = z1
          const sx0 = cx + (x[i] / z0) * k
          const sy0 = cy + (y[i] / z0) * k
          const sx1 = cx + (x[i] / z1) * k
          const sy1 = cy + (y[i] / z1) * k
          if (sx1 < 0 || sx1 > width || sy1 < 0 || sy1 > height) {
            spawn(i, FAR)
            continue
          }
          const path = paths[Math.min(DEPTH_STEPS - 1, Math.floor((1 - z1 / FAR) * DEPTH_STEPS))]
          path.moveTo(sx0, sy0)
          path.lineTo(sx1, sy1)
        }
        paths.forEach((path, b) => {
          const near = (b + 0.5) / DEPTH_STEPS
          ctx.strokeStyle = `hsl(${hue + near * 40}, 80%, ${40 + near * 50}%)`
          ctx.lineWidth = (0.6 + near * 2.4) * dpr
          ctx.stroke(path)
        })
      },
    }
  },
}

const MAX_SPARKS = 4000

// A burst of sparks on every kick, at a random place, falling under gravity.
export const fireworks: Visual2D = {
  id: 'fireworks',
  label: 'visual.fireworks',
  category: 'particles',
  kind: '2d',
  params: [
    { id: 'particles', label: 'param.particles', min: 20, max: 400, default: 140, int: true },
    { id: 'gravity', label: 'param.gravity', min: 0, max: 2, default: 0.6 },
  ],
  create(ctx) {
    // Position and velocity in units of the screen height; life from 1 to 0.
    const px = new Float32Array(MAX_SPARKS)
    const py = new Float32Array(MAX_SPARKS)
    const vx = new Float32Array(MAX_SPARKS)
    const vy = new Float32Array(MAX_SPARKS)
    const life = new Float32Array(MAX_SPARKS)
    const hue = new Float32Array(MAX_SPARKS)
    let next = 0
    let idle = 0
    const burst = (count: number, power: number, h: number, aspect: number) => {
      const bx = (0.15 + Math.random() * 0.7) * aspect
      const by = 0.3 + Math.random() * 0.45
      for (let n = 0; n < count; n++) {
        const i = next
        next = (next + 1) % MAX_SPARKS
        const a = Math.random() * TAU
        const v = power * (0.3 + Math.random() * 0.7)
        px[i] = bx
        py[i] = by
        vx[i] = Math.cos(a) * v
        vy[i] = Math.sin(a) * v
        life[i] = 0.7 + Math.random() * 0.3
        hue[i] = h + Math.random() * 30
      }
    }
    return {
      render(f, p, s) {
        const d = drive(f, p)
        const { width, height, dpr } = s
        const aspect = width / height
        fade(ctx, s, 0.18, f.dt)
        idle += f.dt
        // Without kicks, a small burst now and then so it never stays empty.
        if (d.beat || idle > 1.2) {
          burst(Math.round(p.particles * (d.beat ? 0.6 + d.bass : 0.4)), 0.25 + d.energy * 0.35, (Math.random() * 360 + d.hue) % 360, aspect)
          idle = 0
        }
        const dt = d.dt
        const drag = Math.exp(-dt * 1.2)
        ctx.globalAlpha = Math.min(1, d.intensity)
        for (let i = 0; i < MAX_SPARKS; i++) {
          if (life[i] <= 0) continue
          vx[i] *= drag
          vy[i] = vy[i] * drag - p.gravity * 0.5 * dt
          px[i] += vx[i] * dt
          py[i] += vy[i] * dt
          life[i] -= dt * 0.6
          if (life[i] <= 0) continue
          const size = (1 + life[i] * 2.5) * dpr
          ctx.fillStyle = `hsl(${hue[i]}, 90%, ${45 + life[i] * 40}%)`
          ctx.fillRect(px[i] * height - size / 2, (1 - py[i]) * height - size / 2, size, size)
        }
      },
    }
  },
}
