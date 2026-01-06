const AudioContextClass = window.AudioContext || window.webkitAudioContext;

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.analyser = null;
    this.source = null;
    this.mediaStream = null;
    this.data = {
      frequencyData: new Uint8Array(1024),
      timedomainData: new Uint8Array(2048),
      bass: 0,
      mid: 0,
      treble: 0,
      energy: 0,
      bpm: 120,
      beat: false,
      timestamp: 0,
    };
    this._lastEnergy = [];
    this._lastTimestamp = 0;
  }

  ensureContext() {
    if (!this.ctx) {
      this.ctx = new AudioContextClass();
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.85;
    }
  }

  async useMic() {
    this.ensureContext();
    this.stop();
    this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.source = this.ctx.createMediaStreamSource(this.mediaStream);
    this.source.connect(this.analyser);
    return true;
  }

  async useFile(file) {
    this.ensureContext();
    this.stop();
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
    const bufferSource = this.ctx.createBufferSource();
    bufferSource.buffer = audioBuffer;
    bufferSource.loop = false;
    bufferSource.connect(this.analyser);
    bufferSource.start(0);
    this.source = bufferSource;
    return true;
  }

  async useStream(url) {
    this.ensureContext();
    this.stop();
    const audio = new Audio(url);
    audio.crossOrigin = 'anonymous';
    await audio.play();
    const source = this.ctx.createMediaElementSource(audio);
    source.connect(this.analyser);
    audio.loop = true;
    this.source = source;
    return true;
  }

  stop() {
    if (this.source?.stop) this.source.stop();
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
    }
    this.mediaStream = null;
  }

  update(timestamp) {
    if (!this.analyser) return this.data;
    this.analyser.getByteFrequencyData(this.data.frequencyData);
    this.analyser.getByteTimeDomainData(this.data.timedomainData);

    const bands = this._computeBands();
    Object.assign(this.data, bands, { timestamp });
    this.data.beat = this._detectBeat(bands.energy, timestamp);
    return this.data;
  }

  _computeBands() {
    const freq = this.data.frequencyData;
    const sums = { bass: 0, mid: 0, treble: 0 };
    const counts = { bass: 0, mid: 0, treble: 0 };

    freq.forEach((v, i) => {
      if (i <= 26) {
        sums.bass += v;
        counts.bass += 1;
      } else if (i <= 419) {
        sums.mid += v;
        counts.mid += 1;
      } else {
        sums.treble += v;
        counts.treble += 1;
      }
    });

    const bass = sums.bass / (counts.bass * 255);
    const mid = sums.mid / (counts.mid * 255);
    const treble = sums.treble / (counts.treble * 255);
    const energy = (bass + mid + treble) / 3;

    return { bass, mid, treble, energy };
  }

  _detectBeat(energy, timestamp) {
    this._lastEnergy.push({ t: timestamp, e: energy });
    // keep last 2s
    this._lastEnergy = this._lastEnergy.filter((p) => timestamp - p.t <= 2000);
    const avg = this._lastEnergy.reduce((a, b) => a + b.e, 0) / (this._lastEnergy.length || 1);
    const variance =
      this._lastEnergy.reduce((acc, val) => acc + Math.pow(val.e - avg, 2), 0) /
      (this._lastEnergy.length || 1);
    const threshold = avg + Math.sqrt(variance) * 1.5 + 0.05;
    const beat = energy > threshold && timestamp - this._lastTimestamp > 250;
    if (beat) this._lastTimestamp = timestamp;
    return beat;
  }
}
