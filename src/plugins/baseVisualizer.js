export const TAU = Math.PI * 2;
export const BACKGROUND = '5, 6, 15';

export class BaseVisualizer {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.width = canvas.width;
    this.height = canvas.height;
    this.dpr = 1;
    this.hue = 0;
  }

  resize(w, h, dpr = 1) {
    this.width = w;
    this.height = h;
    this.dpr = dpr;
  }

  // Trail fade given as the per-frame alpha at 60 fps, corrected for the real frame time.
  // Fades to black: low alphas leave 8-bit residue, which only stays invisible on black.
  fade(alpha60, dt) {
    const alpha = 1 - Math.pow(1 - alpha60, dt * 60);
    this.ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  clear() {
    this.ctx.fillStyle = `rgb(${BACKGROUND})`;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  // Colour drift driven by energy, shared by the modes ported from the prototype.
  driftHue(data) {
    this.hue = (this.hue + data.dt * (18 + 180 * data.energy)) % 360;
  }

  render() {}

  destroy() {}
}
