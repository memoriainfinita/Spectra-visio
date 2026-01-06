export class PluginManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.registry = new Map();
    this.current = null;
  }

  register(name, pluginFactory) {
    this.registry.set(name, pluginFactory);
  }

  use(name) {
    if (!this.registry.has(name)) throw new Error(`Plugin ${name} not registered`);
    if (this.current?.destroy) this.current.destroy();
    this.current = this.registry.get(name)(this.canvas, this.ctx);
    this.current.resize(this.canvas.width, this.canvas.height);
  }

  resize(w, h) {
    this.canvas.width = w;
    this.canvas.height = h;
    this.current?.resize(w, h);
  }

  render(data) {
    if (!this.current) return;
    this.current.render(data);
  }
}
