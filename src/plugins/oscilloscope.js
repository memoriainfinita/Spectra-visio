import { BaseVisualizer } from './baseVisualizer.js';

export class OscilloscopeVisualizer extends BaseVisualizer {
  render(data) {
    const { ctx, width, height, dpr } = this;
    this.clear();
    const buffer = data.timedomainData;
    ctx.beginPath();
    for (let i = 0; i < buffer.length; i++) {
      const x = (i / (buffer.length - 1)) * width;
      const v = (buffer[i] - 128) / 128;
      const y = height / 2 + v * (height / 3) * (1 + data.energy * 0.6);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = data.beat ? '#7df2ff' : '#c7d3ff';
    ctx.lineWidth = (2.5 + data.bass * 4) * dpr;
    ctx.shadowBlur = (data.beat ? 18 : 8) * dpr;
    ctx.shadowColor = '#6ef7ff';
    ctx.stroke();
  }
}
