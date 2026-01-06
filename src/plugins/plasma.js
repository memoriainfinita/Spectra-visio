import { BaseVisualizer } from './baseVisualizer.js';

export function plasmaPlugin(canvas, ctx) {
  return new (class extends BaseVisualizer {
    constructor() {
      super(canvas, ctx);
      this.phase = 0;
      this.offscreen = ctx.createImageData(1, 1);
    }

    render(data) {
      const { width, height } = this;
      const image = this.ctx.createImageData(width, height);
      this.phase += 0.02 + data.mid * 0.03;

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          const v =
            Math.sin(x * 0.008 + this.phase) +
            Math.sin((x + y) * 0.01 + this.phase * 1.3) +
            Math.sin(Math.hypot(x - width / 2, y - height / 2) * 0.012 - this.phase * 0.8);
          const normalized = (v + 3) / 6;
          const hue = (normalized * 180 + data.bass * 120 + data.treble * 180) % 360;
          const alpha = 180 + normalized * 50;
          const color = hslToRgb(hue / 360, 0.75, 0.55);
          image.data[idx] = color[0];
          image.data[idx + 1] = color[1];
          image.data[idx + 2] = color[2];
          image.data[idx + 3] = alpha;
        }
      }
      this.ctx.putImageData(image, 0, 0);
    }
  })();
}

function hslToRgb(h, s, l) {
  if (s === 0) {
    const val = l * 255;
    return [val, val, val];
  }
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const r = hue2rgb(p, q, h + 1 / 3);
  const g = hue2rgb(p, q, h);
  const b = hue2rgb(p, q, h - 1 / 3);
  return [r * 255, g * 255, b * 255];
}
