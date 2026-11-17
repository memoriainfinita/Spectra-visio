// Detects an input that delivers nothing: a shared tab that carries no sound (protected
// content, muted), a muted microphone or the wrong device, a stream that went quiet.
// Digital silence is exact zeros; a real signal, even a faint noise, is never all zeros.

export const SILENCE_AFTER_MS = 6000

export function isDigitalSilence(...waves: Float32Array[]): boolean {
  for (const wave of waves) for (let i = 0; i < wave.length; i++) if (wave[i] !== 0) return false
  return true
}

export class SilenceWatch {
  private since: number | null = null
  private warned = false

  // True once when the silence has lasted long enough; again only after sound came back.
  // `listening` is false when the input is not live or nothing is expected from it.
  update(silent: boolean, listening: boolean, now: number): boolean {
    if (!listening || !silent) {
      this.since = null
      this.warned = false
      return false
    }
    this.since ??= now
    if (this.warned || now - this.since < SILENCE_AFTER_MS) return false
    this.warned = true
    return true
  }
}
