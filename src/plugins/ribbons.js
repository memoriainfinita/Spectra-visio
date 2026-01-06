import { BaseVisualizer } from './baseVisualizer.js';

export function ribbonsPlugin(canvas, ctx) {
  return new (class extends BaseVisualizer {
    constructor() {
      super(canvas, ctx);
      this.t = 0;
    }

    render(data) {
      const { width, height } = this;
      this.ctx.fillStyle = 'rgba(5,6,15,0.22)';
      this.ctx.fillRect(0, 0, width, height);
      this.t += 0.03 + data.energy * 0.04;
      const rows = 5;
      for (let r = 0; r < rows; r++) {
        const y = height * (0.2 + (r / rows) * 0.6);
        this.ctx.beginPath();
        for (let x = 0; x < width; x += 10) {
          const offset = Math.sin(x * 0.01 + this.t + r) * 40;
          const reactive = (data.frequencyData[(x / width) * 128 | 0] || 0) / 255;
          const ny = y + offset * (0.3 + reactive * 1.6);
          if (x === 0) this.ctx.moveTo(x, ny);
          else this.ctx.lineTo(x, ny);
        }
        const hue = 200 + r * 30 + data.mid * 120;
        this.ctx.strokeStyle = `hsla(${hue}, 85%, 65%, ${0.6 + data.energy * 0.4})`;
        this.ctx.lineWidth = 3 + data.bass * 8;
        this.ctx.stroke();
      }
    }
  })();
}
