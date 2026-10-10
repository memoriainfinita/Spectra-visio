// Ring of timestamped frames read back with a delay, so the visuals show the analysis of
// the audio that is reaching the speakers now, not the audio entering the output buffer.
// Frames are allocated once and overwritten in turn: no garbage per frame.

export class DelayLine<T extends { time: number }> {
  private readonly frames: T[]
  private head = -1
  private count = 0

  constructor(size: number, make: () => T) {
    this.frames = Array.from({ length: size }, make)
  }

  // The frame to fill next; it becomes the newest once its time is set.
  next(): T {
    this.head = (this.head + 1) % this.frames.length
    this.count = Math.min(this.count + 1, this.frames.length)
    return this.frames[this.head]
  }

  newest(): T | null {
    return this.count ? this.frames[this.head] : null
  }

  // Newest frame at least `delay` ms old at `now`; the oldest kept if none is that old yet.
  read(now: number, delay: number): T | null {
    if (!this.count) return null
    const target = now - delay
    const size = this.frames.length
    let frame = this.frames[this.head]
    for (let i = 0; i < this.count; i++) {
      frame = this.frames[(this.head - i + size) % size]
      if (frame.time <= target) return frame
    }
    return frame
  }

  clear(): void {
    this.head = -1
    this.count = 0
  }
}
