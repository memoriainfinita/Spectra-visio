export class BaseVisualizer {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.width = canvas.width;
    this.height = canvas.height;
  }

  resize(w, h) {
    this.width = w;
    this.height = h;
  }

  render() {
    // override
  }

  destroy() {
    // optional
  }
}
