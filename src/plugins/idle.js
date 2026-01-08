import { BaseVisualizer } from './baseVisualizer.js';

export function idlePlugin(canvas, ctx) {
  return new (class extends BaseVisualizer {
    constructor() {
      super(canvas, ctx);
      this.phase = 0;
      this.pastel = ['#7df2ff', '#ff9ef6', '#c6ff85'];
    }

    render(data) {
      const { width, height } = this;
      this.ctx.clearRect(0, 0, width, height);
      this.phase += 0.005;
      const maxR = Math.min(width, height) * 0.45;
      for (let i = 0; i < 12; i++) {
        const ratio = i / 12;
        const r = maxR * ratio * (1 + 0.03 * Math.sin(this.phase * 2 + i));
        this.ctx.beginPath();
        this.ctx.strokeStyle = this.pastel[i % this.pastel.length];
        this.ctx.globalAlpha = 0.9 - ratio * 0.5;
        this.ctx.lineWidth = 6 - ratio * 4;
        this.ctx.arc(width / 2, height / 2, r, this.phase + ratio * Math.PI * 1.5, this.phase + Math.PI * 2 + ratio);
        this.ctx.stroke();
      }
      this.ctx.globalAlpha = 1;
    }
  })();
}
