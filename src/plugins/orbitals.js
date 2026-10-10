import { BaseVisualizer, TAU } from './baseVisualizer.js';

export class OrbitalsVisualizer extends BaseVisualizer {
  constructor(canvas, ctx) {
    super(canvas, ctx);
    this.t = 0;
    this.a = 0;
    this.b = 0;
  }

  render(data) {
    const { ctx, width, height, dpr } = this;
    const { bass, mid, treble } = data;
    const waveform = data.timedomainData;
    this.driftHue(data);
    this.fade(0.07, data.dt);

    this.t += data.dt;
    this.a += data.dt * (0.9 + 2.0 * bass);
    this.b += data.dt * (1.3 + 1.7 * mid);
    const count = 140 + Math.floor(420 * (bass * 0.7 + treble * 0.3));
    const R = Math.min(width, height) * (0.28 + 0.1 * mid);
    const alpha = 0.035 + 0.1 * treble + 0.08 * bass;

    ctx.translate(width / 2, height / 2);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < count; i++) {
      const p = i / count;
      const v = (waveform[Math.floor(p * (waveform.length - 1))] - 128) / 128;
      // Lissajous-like orbits
      const a = this.a + p * TAU;
      const b = this.b + p * TAU * 1.7;
      const x = Math.cos(a) * R * (0.35 + 0.85 * (0.5 + 0.5 * Math.sin(b))) + Math.cos(b * 0.6) * R * 0.12;
      const y = Math.sin(b) * R * (0.35 + 0.85 * (0.5 + 0.5 * Math.sin(a))) + Math.sin(a * 0.7) * R * 0.12;
      const r = (0.8 + 2.8 * (0.5 + 0.5 * v) + 10 * treble) * dpr;
      ctx.beginPath();
      ctx.fillStyle = `hsla(${(this.hue + 360 * p + 140 * (0.5 + 0.5 * v)) % 360}, 100%, 60%, ${alpha})`;
      ctx.arc(x, y, r, 0, TAU);
      ctx.fill();
    }

    const t = this.t;
    ctx.beginPath();
    ctx.lineWidth = (1 + 6 * treble) * dpr;
    ctx.strokeStyle = `hsla(${(this.hue + 20) % 360}, 100%, 60%, ${0.1 + 0.15 * treble})`;
    ctx.ellipse(0, 0, R * (1 + 0.08 * Math.sin(t * 2)), R * (0.82 + 0.1 * Math.cos(t * 1.6)), t * 0.4, 0, TAU);
    ctx.stroke();
  }
}
