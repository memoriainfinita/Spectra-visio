// The parts of Butterchurn 2.6 and butterchurn-presets 2.4 the app uses; neither ships types.

declare module 'butterchurn' {
  export interface AudioLevels {
    // 1024 time-domain samples, 128 is silence.
    timeByteArray: Uint8Array
    timeByteArrayL: Uint8Array
    timeByteArrayR: Uint8Array
  }

  export interface MilkdropVisualizer {
    loadPreset(preset: object, blendSeconds: number): void
    setRendererSize(width: number, height: number, opts?: { pixelRatio?: number; textureRatio?: number }): void
    render(opts?: { audioLevels?: AudioLevels; elapsedTime?: number }): void
  }

  export interface Butterchurn {
    // Without an AudioContext it creates no analysers and reads only what render() is given.
    createVisualizer(context: AudioContext | null, canvas: HTMLCanvasElement, opts: { width: number; height: number; pixelRatio?: number; textureRatio?: number }): MilkdropVisualizer
  }

  const butterchurn: unknown
  export default butterchurn
}

declare module 'butterchurn-presets' {
  const presets: unknown
  export default presets
}
