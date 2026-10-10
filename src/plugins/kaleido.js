import { BaseVisualizer, TAU } from './baseVisualizer.js';

const BARS = 72;

export class KaleidoVisualizer extends BaseVisualizer {
  constructor(canvas, ctx) {
    super(canvas, ctx);
    this.rot = 0;
  }

  render(data) {
    const { ctx, width, height, dpr } = this;
    const { bass, mid, treble } = data;
    const spectrum = data.frequencyData;
    this.driftHue(data);
    this.fade(0.09, data.dt);

    const seg = 12 + Math.floor(10 * treble);
    const maxR = Math.min(width, height) * (0.42 + 0.1 * bass);
    this.rot += data.dt * (0.25 + 1.6 * (bass * 0.7 + mid * 0.3));

    ctx.translate(width / 2, height / 2);
    ctx.globalCompositeOperation = 'lighter';
    for (let s = 0; s < seg; s++) {
      ctx.save();
      ctx.rotate(this.rot + (s / seg) * TAU);
      ctx.scale(s % 2 === 0 ? 1 : -1, 1);
      for (let i = 0; i < BARS; i++) {
        const p = i / (BARS - 1);
        const v = spectrum[Math.floor(p * (spectrum.length - 1))] / 255;
        const a = p * (TAU / seg) * 0.92;
        const r0 = (0.08 + 0.55 * p) * maxR;
        const r1 = r0 + (10 + 90 * v) * dpr * (0.25 + 0.75 * (0.4 * mid + 0.6 * treble));
        ctx.beginPath();
        ctx.lineWidth = (1 + 6 * (v * 0.7 + bass * 0.3)) * dpr;
        ctx.strokeStyle = `hsla(${(this.hue + 240 * p + 140 * v) % 360}, 100%, 60%, ${0.06 + 0.22 * v})`;
        ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
        ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.beginPath();
    ctx.fillStyle = `hsla(${(this.hue + 40) % 360}, 100%, 60%, 0.22)`;
    ctx.arc(0, 0, (8 + 220 * bass) * dpr, 0, TAU);
    ctx.fill();
  }
}
