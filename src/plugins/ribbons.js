import { BaseVisualizer } from './baseVisualizer.js';

const ROWS = 5;

export class RibbonsVisualizer extends BaseVisualizer {
  constructor(canvas, ctx) {
    super(canvas, ctx);
    this.t = 0;
  }

  render(data) {
    const { ctx, width, height, dpr } = this;
    this.fade(0.22, data.dt);
    this.t += data.dt * (1.8 + data.energy * 2.4);
    const step = 10 * dpr;
    for (let r = 0; r < ROWS; r++) {
      const y = height * (0.2 + (r / ROWS) * 0.6);
      ctx.beginPath();
      for (let x = 0; x <= width; x += step) {
        const offset = Math.sin((x / dpr) * 0.01 + this.t + r) * 40 * dpr;
        const reactive = data.frequencyData[((x / width) * 127) | 0] / 255;
        const ny = y + offset * (0.3 + reactive * 1.6);
        if (x === 0) ctx.moveTo(x, ny);
        else ctx.lineTo(x, ny);
      }
      const hue = 200 + r * 30 + data.mid * 120;
      ctx.strokeStyle = `hsla(${hue}, 85%, 65%, ${0.6 + data.energy * 0.4})`;
      ctx.lineWidth = (3 + data.bass * 8) * dpr;
      ctx.stroke();
    }
  }
}
