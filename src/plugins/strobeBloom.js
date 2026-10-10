import { BaseVisualizer, TAU } from './baseVisualizer.js';

// Flash stays well below a hard strobe: photosensitivity limit.
const FLASH_CAP = 0.35;
const FLASH_ALPHA_CAP = 0.22;

export class StrobeBloomVisualizer extends BaseVisualizer {
  constructor(canvas, ctx) {
    super(canvas, ctx);
    this.petalPhase = 0;
    this.ringPhase = 0;
    this.flash = 0;
    this.prevEnergy = 0;
  }

  render(data) {
    const { ctx, width: w, height: h, dpr } = this;
    const { bass, mid, treble, energy, dt } = data;
    this.driftHue(data);
    this.fade(0.12, dt);

    const delta = Math.max(0, energy - this.prevEnergy);
    this.prevEnergy = energy;
    this.flash = Math.min(FLASH_CAP, this.flash + Math.max(0, delta - 0.03) * (2.2 + 3.5 * treble));

    this.petalPhase += dt * (0.35 + 1.6 * (bass * 0.7 + treble * 0.3));
    this.ringPhase += dt * (0.6 + bass * 2.4);
    const cx = w / 2;
    const cy = h / 2;
    const petals = 10 + Math.floor(18 * treble);
    const baseR = Math.min(w, h) * (0.1 + 0.2 * mid);
    const wob = 0.6 + 2.0 * bass;

    ctx.translate(cx, cy);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < petals; i++) {
      const p = i / petals;
      const a = this.petalPhase + p * TAU;
      const r = baseR * (0.9 + 0.6 * Math.sin(a * wob + p * 5.0)) + (40 + 220 * bass) * p * dpr;
      ctx.beginPath();
      ctx.lineWidth = (1 + 10 * (treble * 0.6 + bass * 0.4)) * dpr;
      ctx.strokeStyle = `hsla(${(this.hue + 360 * p + 180 * treble) % 360}, 100%, 60%, ${0.03 + 0.12 * (0.3 + 0.7 * mid)})`;
      ctx.arc(Math.cos(a) * 6 * dpr, Math.sin(a) * 6 * dpr, r, a, a + TAU * 0.55);
      ctx.stroke();
    }

    if (this.flash > 0.001) {
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = `hsla(${(this.hue + 30) % 360}, 100%, 70%, ${Math.min(FLASH_ALPHA_CAP, this.flash)})`;
      ctx.fillRect(-cx, -cy, w, h);
      ctx.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 2; k++) {
        const pp = (this.ringPhase + k / 2) % 1;
        ctx.beginPath();
        ctx.lineWidth = (1 + 10 * treble) * dpr;
        ctx.strokeStyle = `hsla(${(this.hue + 60 + k * 40) % 360}, 100%, 65%, ${0.12 * (1 - pp) * Math.min(1, this.flash * 2)})`;
        ctx.arc(0, 0, pp * Math.hypot(cx, cy), 0, TAU);
        ctx.stroke();
      }
    }

    this.flash = Math.max(0, this.flash - dt * (1.8 + 2.8 * (0.5 + bass)));
  }
}
