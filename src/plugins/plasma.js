import { BaseVisualizer } from './baseVisualizer.js';

// The field is computed on a small buffer and scaled up: per-pixel work at full size runs at 2-3 fps.
const BUFFER_WIDTH = 240;

export class PlasmaVisualizer extends BaseVisualizer {
  constructor(canvas, ctx) {
    super(canvas, ctx);
    this.phase = 0;
    this.buffer = document.createElement('canvas');
    this.bufferCtx = this.buffer.getContext('2d');
  }

  resize(w, h, dpr) {
    super.resize(w, h, dpr);
    this.scale = Math.max(1, w / BUFFER_WIDTH);
    this.buffer.width = Math.max(1, Math.round(w / this.scale));
    this.buffer.height = Math.max(1, Math.round(h / this.scale));
    this.image = this.bufferCtx.createImageData(this.buffer.width, this.buffer.height);
  }

  render(data) {
    const { ctx, width, height, scale, image } = this;
    const bw = this.buffer.width;
    const bh = this.buffer.height;
    const px = image.data;
    const rgb = [0, 0, 0];
    this.phase += data.dt * (1.2 + data.mid * 1.8);
    const phase = this.phase;

    for (let by = 0; by < bh; by++) {
      const y = by * scale;
      for (let bx = 0; bx < bw; bx++) {
        const x = bx * scale;
        const v =
          Math.sin(x * 0.008 + phase) +
          Math.sin((x + y) * 0.01 + phase * 1.3) +
          Math.sin(Math.hypot(x - width / 2, y - height / 2) * 0.012 - phase * 0.8);
        const normalized = (v + 3) / 6;
        const hue = (normalized * 180 + data.bass * 120 + data.treble * 180) % 360;
        hslToRgb(hue / 360, 0.75, 0.55, rgb);
        const idx = (by * bw + bx) * 4;
        px[idx] = rgb[0];
        px[idx + 1] = rgb[1];
        px[idx + 2] = rgb[2];
        px[idx + 3] = 180 + normalized * 50;
      }
    }
    this.bufferCtx.putImageData(image, 0, 0);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.buffer, 0, 0, width, height);
  }
}

function hueToChannel(p, q, t) {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}

function hslToRgb(h, s, l, out) {
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  out[0] = hueToChannel(p, q, h + 1 / 3) * 255;
  out[1] = hueToChannel(p, q, h) * 255;
  out[2] = hueToChannel(p, q, h - 1 / 3) * 255;
}
