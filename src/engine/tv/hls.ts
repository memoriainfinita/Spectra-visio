// Plays an HLS stream (.m3u8) in a video element: natively where the browser can, through
// hls.js elsewhere (Firefox), loaded on first use. With CORS, so the frames can be read by
// WebGL. Returns what stops it.
export async function attachHls(v: HTMLVideoElement, url: string): Promise<() => void> {
  v.crossOrigin = 'anonymous'
  if (v.canPlayType('application/vnd.apple.mpegurl')) {
    v.src = url
    return () => {
      v.removeAttribute('src')
      v.load()
    }
  }
  const { default: Hls } = await import('hls.js/light')
  if (!Hls.isSupported()) throw new Error('HLS unsupported')
  // A short buffer: the stream is a picture source, not something to watch without gaps.
  const hls = new Hls({ maxBufferLength: 10, backBufferLength: 10 })
  // A failure hls.js cannot recover from reaches the element as its own error.
  hls.on(Hls.Events.ERROR, (_event, data) => {
    if (data.fatal) v.dispatchEvent(new Event('error'))
  })
  hls.loadSource(url)
  hls.attachMedia(v)
  return () => {
    hls.destroy()
    v.removeAttribute('src')
    v.load()
  }
}
