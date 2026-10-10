const AudioContextClass = window.AudioContext || window.webkitAudioContext;

// Band edges in Hz. Converted to FFT bins once the sample rate is known.
const BANDS = {
  bass: [20, 250],
  mid: [250, 2000],
  treble: [2000, 10000],
};

const BEAT_WINDOW_MS = 2000;
const BEAT_REFRACTORY_MS = 250;
const MAX_DT = 0.05;

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.analyser = null;
    this.source = null;
    this.mediaStream = null;
    this.element = null;
    this.objectUrl = null;
    this.kind = null; // 'mic' | 'file' | 'stream'
    this.paused = false;
    this.onEnded = null;
    this.data = {
      frequencyData: new Uint8Array(1024),
      timedomainData: new Uint8Array(2048),
      bass: 0,
      mid: 0,
      treble: 0,
      energy: 0,
      beat: false,
      time: 0,
      dt: 0,
    };
    this._bins = null;
    this._history = [];
    this._lastBeat = 0;
    this._lastTs = null;
  }

  get active() {
    return this.kind !== null;
  }

  async _ensureContext() {
    if (!this.ctx) {
      this.ctx = new AudioContextClass();
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.85;
      const binHz = this.ctx.sampleRate / this.analyser.fftSize;
      const count = this.analyser.frequencyBinCount;
      this._bins = Object.fromEntries(
        Object.entries(BANDS).map(([name, [lo, hi]]) => {
          const from = Math.max(1, Math.round(lo / binHz));
          const to = Math.min(count, Math.max(from + 1, Math.round(hi / binHz)));
          return [name, [from, to]];
        }),
      );
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume();
  }

  async useMic() {
    await this._ensureContext();
    // Voice processing flattens music: turn it off.
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
    this.stop();
    this.mediaStream = stream;
    this.source = this.ctx.createMediaStreamSource(stream);
    // Analyser only: routing the mic to the speakers would feed back.
    this.source.connect(this.analyser);
    this.kind = 'mic';
  }

  async useFile(file) {
    const url = URL.createObjectURL(file);
    try {
      await this._useElement(url, 'file', false);
    } catch (err) {
      URL.revokeObjectURL(url);
      throw err;
    }
    this.objectUrl = url;
  }

  async useStream(url) {
    // Without CORS headers the request fails here instead of feeding silence to the analyser.
    await this._useElement(url, 'stream', true);
  }

  async _useElement(url, kind, crossOrigin) {
    await this._ensureContext();
    const el = new Audio();
    if (crossOrigin) el.crossOrigin = 'anonymous';
    el.src = url;
    await el.play();
    this.stop();
    const source = this.ctx.createMediaElementSource(el);
    source.connect(this.analyser);
    source.connect(this.ctx.destination);
    el.addEventListener('ended', () => {
      if (this.element !== el) return;
      this.stop();
      this.onEnded?.();
    });
    this.element = el;
    this.source = source;
    this.kind = kind;
  }

  async togglePause() {
    if (!this.active) return false;
    if (this.paused) {
      await this.ctx.resume();
      await this.element?.play();
      this.paused = false;
    } else {
      this.element?.pause();
      await this.ctx.suspend();
      this.paused = true;
    }
    return this.paused;
  }

  stop() {
    this.source?.disconnect();
    this.source = null;
    if (this.element) {
      this.element.pause();
      this.element.removeAttribute('src');
      this.element.load();
      this.element = null;
    }
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
    this.mediaStream?.getTracks().forEach((t) => t.stop());
    this.mediaStream = null;
    this.kind = null;
    if (this.paused) {
      this.paused = false;
      this.ctx.resume();
    }
  }

  update(timestamp) {
    const d = this.data;
    d.dt = this._lastTs === null ? 0 : Math.min(MAX_DT, (timestamp - this._lastTs) / 1000);
    this._lastTs = timestamp;
    d.time = timestamp / 1000;
    if (!this.analyser) return d;

    this.analyser.getByteFrequencyData(d.frequencyData);
    this.analyser.getByteTimeDomainData(d.timedomainData);
    for (const [name, [from, to]] of Object.entries(this._bins)) {
      let sum = 0;
      for (let i = from; i < to; i++) sum += d.frequencyData[i];
      d[name] = sum / ((to - from) * 255);
    }
    d.energy = (d.bass + d.mid + d.treble) / 3;
    d.beat = this._detectBeat(d.energy, timestamp);
    return d;
  }

  _detectBeat(energy, timestamp) {
    const history = this._history;
    history.push({ t: timestamp, e: energy });
    while (history.length && timestamp - history[0].t > BEAT_WINDOW_MS) history.shift();
    let avg = 0;
    for (const p of history) avg += p.e;
    avg /= history.length;
    let variance = 0;
    for (const p of history) variance += (p.e - avg) ** 2;
    variance /= history.length;
    const threshold = avg + Math.sqrt(variance) * 1.5 + 0.05;
    const beat = energy > threshold && timestamp - this._lastBeat > BEAT_REFRACTORY_MS;
    if (beat) this._lastBeat = timestamp;
    return beat;
  }
}
