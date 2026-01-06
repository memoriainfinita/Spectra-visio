import { BaseVisualizer } from './baseVisualizer.js';

export function tunnelPlugin(canvas, ctx) {
  return new (class extends BaseVisualizer {
    constructor() {
      super(canvas, ctx);
      this.z = 0;
    }

    render(data) {
      const { width, height } = this;
      this.ctx.fillStyle = '#05060f';
      this.ctx.fillRect(0, 0, width, height);

      this.z += 0.02 + data.energy * 0.05;
      const rings = 18;
      for (let i = 0; i < rings; i++) {
        const depth = (i / rings + this.z) % 1;
        const scale = 0.2 + depth * 1.2;
        const alpha = 1 - depth;
        const radius = Math.min(width, height) * 0.22 * scale * (1 + data.bass * 0.3);
        const hue = 180 + depth * 160 + data.treble * 80;
        this.ctx.beginPath();
        this.ctx.strokeStyle = `hsla(${hue}, 90%, 60%, ${alpha})`;
        this.ctx.lineWidth = 6 * (1 - depth) + data.mid * 4;
        this.ctx.setLineDash([30 * depth + 10, 20]);
        this.ctx.translate(width / 2, height / 2);
        this.ctx.rotate(0.02 * i + data.mid * 0.1);
        this.ctx.translate(-width / 2, -height / 2);
        this.ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      }
    }
  })();
}
