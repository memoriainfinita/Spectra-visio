import { BaseVisualizer } from './baseVisualizer.js';

const PASTEL = ['#7df2ff', '#ff9ef6', '#c6ff85'];

export class IdleVisualizer extends BaseVisualizer {
  constructor(canvas, ctx) {
    super(canvas, ctx);
    this.phase = 0;
  }

  render(data) {
    const { ctx, width, height, dpr } = this;
    this.clear();
    this.phase += data.dt * 0.3;
    const maxR = Math.min(width, height) * 0.45;
    for (let i = 0; i < 12; i++) {
      const ratio = i / 12;
      const r = maxR * ratio * (1 + 0.03 * Math.sin(this.phase * 2 + i));
      ctx.beginPath();
      ctx.strokeStyle = PASTEL[i % PASTEL.length];
      ctx.globalAlpha = 0.9 - ratio * 0.5;
      ctx.lineWidth = (6 - ratio * 4) * dpr;
      ctx.arc(width / 2, height / 2, r, this.phase + ratio * Math.PI * 1.5, this.phase + Math.PI * 2 + ratio);
      ctx.stroke();
    }
  }
}
