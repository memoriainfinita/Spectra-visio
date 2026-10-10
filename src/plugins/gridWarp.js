import { BaseVisualizer, TAU } from './baseVisualizer.js';

export class GridWarpVisualizer extends BaseVisualizer {
  constructor(canvas, ctx) {
    super(canvas, ctx);
    this.t = 0;
    this.pv = 0;
    this.ph = 0;
  }

  render(data) {
    const { ctx, width: w, height: h, dpr } = this;
    const { bass, mid, treble } = data;
    this.driftHue(data);
    this.fade(0.1, data.dt);

    this.t += data.dt;
    this.pv += data.dt * (0.9 + bass * 2.0);
    this.ph += data.dt * (1.0 + mid * 2.1);
    const t = this.t;
    const step = Math.floor(Math.max(26, Math.min(64, 58 - 28 * (bass + mid))) * dpr);
    const seg = 16 * dpr;
    const amp = (0.018 + 0.085 * (bass * 0.65 + mid * 0.35)) * Math.min(w, h);
    const swirl = 0.6 + 2.2 * treble;

    ctx.globalCompositeOperation = 'lighter';
    ctx.lineWidth = (1 + 3 * treble) * dpr;

    for (let x0 = -step; x0 <= w + step; x0 += step) {
      const p = x0 / w;
      ctx.beginPath();
      ctx.strokeStyle = `hsla(${(this.hue + 220 * p + 120 * treble) % 360}, 100%, 60%, ${0.06 + 0.12 * (0.3 + 0.7 * mid)})`;
      for (let y = 0; y <= h; y += seg) {
        const ny = y / h;
        const dx =
          Math.sin(this.pv + ny * TAU * (1.2 + swirl) + p * 3.0) * amp +
          Math.sin(t * 1.7 + (p + ny) * TAU * 0.6) * amp * 0.35;
        if (y === 0) ctx.moveTo(x0 + dx, y);
        else ctx.lineTo(x0 + dx, y);
      }
      ctx.stroke();
    }

    for (let y0 = -step; y0 <= h + step; y0 += step) {
      const p = y0 / h;
      ctx.beginPath();
      ctx.strokeStyle = `hsla(${(this.hue + 180 + 220 * p + 140 * mid) % 360}, 100%, 60%, ${0.05 + 0.1 * (0.3 + 0.7 * bass)})`;
      for (let x = 0; x <= w; x += seg) {
        const nx = x / w;
        const dy =
          Math.cos(this.ph + nx * TAU * (1.1 + swirl) + p * 2.7) * amp +
          Math.cos(t * 1.5 + (p - nx) * TAU * 0.55) * amp * 0.35;
        if (x === 0) ctx.moveTo(x, y0 + dy);
        else ctx.lineTo(x, y0 + dy);
      }
      ctx.stroke();
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.beginPath();
    ctx.fillStyle = `hsla(${(this.hue + 40) % 360}, 100%, 60%, ${0.05 + 0.2 * bass})`;
    ctx.arc(w / 2, h / 2, (10 + 180 * bass) * dpr, 0, TAU);
    ctx.fill();
  }
}
