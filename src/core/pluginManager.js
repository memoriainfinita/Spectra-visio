export class PluginManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.registry = new Map();
    this.current = null;
    this.currentName = null;
    this.dpr = 1;
  }

  register(name, Visualizer) {
    this.registry.set(name, Visualizer);
  }

  use(name) {
    if (name === this.currentName) return;
    const Visualizer = this.registry.get(name);
    if (!Visualizer) throw new Error(`Plugin ${name} not registered`);
    this.current?.destroy();
    this.current = new Visualizer(this.canvas, this.ctx);
    this.current.resize(this.canvas.width, this.canvas.height, this.dpr);
    this.currentName = name;
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  resize(w, h, dpr) {
    this.dpr = dpr;
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    this.current?.resize(w, h, dpr);
  }

  render(data) {
    if (!this.current) return;
    // Plugins change transforms, composite modes and shadows: isolate them.
    this.ctx.save();
    this.current.render(data);
    this.ctx.restore();
  }
}
