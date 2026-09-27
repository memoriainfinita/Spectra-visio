import { BaseVisualizer } from './baseVisualizer.js';

export function oscilloscopePlugin(canvas, ctx) {
  return new (class extends BaseVisualizer {
    constructor() {
      super(canvas, ctx);
    }

    render(data) {
      const { width, height } = this;
      this.ctx.fillStyle = '#05060f';
      this.ctx.fillRect(0, 0, width, height);
      this.ctx.beginPath();
      const buffer = data.timedomainData;
      for (let i = 0; i < buffer.length; i++) {
        const x = (i / buffer.length) * width;
        const v = (buffer[i] - 128) / 128;
        const y = height / 2 + v * (height / 3) * (1 + data.energy * 0.6);
        if (i === 0) this.ctx.moveTo(x, y);
        else this.ctx.lineTo(x, y);
      }
      this.ctx.strokeStyle = data.beat ? '#7df2ff' : '#c7d3ff';
      this.ctx.lineWidth = 2.5 + data.bass * 4;
      this.ctx.shadowBlur = data.beat ? 18 : 8;
      this.ctx.shadowColor = '#6ef7ff';
      this.ctx.stroke();
      this.ctx.shadowBlur = 0;
    }
  })();
}
