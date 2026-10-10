import { BaseVisualizer, TAU } from './baseVisualizer.js';

const RINGS = 18;

export class TunnelVisualizer extends BaseVisualizer {
  constructor(canvas, ctx) {
    super(canvas, ctx);
    this.z = 0;
  }

  render(data) {
    const { ctx, width, height, dpr } = this;
    const cx = width / 2;
    const cy = height / 2;
    this.clear();

    this.z += data.dt * (1.2 + data.energy * 3);
    for (let i = 0; i < RINGS; i++) {
      const depth = (i / RINGS + this.z) % 1;
      const scale = 0.2 + depth * 1.2;
      const radius = Math.min(width, height) * 0.22 * scale * (1 + data.bass * 0.3);
      const hue = 180 + depth * 160 + data.treble * 80;
      ctx.setTransform(1, 0, 0, 1, cx, cy);
      ctx.rotate(0.02 * i + data.mid * 0.1);
      ctx.beginPath();
      ctx.strokeStyle = `hsla(${hue}, 90%, 60%, ${1 - depth})`;
      ctx.lineWidth = (6 * (1 - depth) + data.mid * 4) * dpr;
      ctx.setLineDash([(30 * depth + 10) * dpr, 20 * dpr]);
      ctx.arc(0, 0, radius, 0, TAU);
      ctx.stroke();
    }
  }
}
