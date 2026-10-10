import { drawFullscreen, program, uniforms } from '../render/gl'
import type { Surface } from '../render/visual'
import { lineAt, type LrcLine } from './lrc'
import { FONTS, type OverlaySettings } from './settings'

// What the overlays show, read from the player each frame.
export interface OverlayData {
  // A change restarts the title's display time.
  trackId: string | null
  title: string
  artist: string
  lyrics: readonly LrcLine[] | null
  // Playback position as heard (output latency taken off), seconds.
  time: number
  logo: HTMLImageElement | ImageBitmap | null
}

// Title fade in and out, seconds.
const FADE_S = 0.6
const FAMILIES: Record<(typeof FONTS)[number], string> = {
  sans: 'system-ui, "Segoe UI", Roboto, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  mono: 'ui-monospace, Consolas, monospace',
}

interface Line {
  text: string
  // Size in reference pixels (1080 p).
  size: number
  weight: number
  alpha: number
}

// Premultiplied texture over the output.
const FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uSrc;
out vec4 outColor;
void main() {
  outColor = texture(uSrc, vUv);
}`

export function anyOverlay(o: OverlaySettings): boolean {
  return o.title.enabled || o.lyrics.enabled || o.text.enabled || o.logo.enabled
}

// Draws the overlays on a 2D canvas, only when what they show changes, and blends that
// image over the output every frame.
export class OverlayRenderer {
  private readonly gl: WebGL2RenderingContext
  private readonly prog: WebGLProgram
  private readonly u: Record<'uSrc', WebGLUniformLocation | null>
  private readonly vao: WebGLVertexArrayObject
  private readonly tex: WebGLTexture
  private readonly canvas = document.createElement('canvas')
  private readonly ctx = this.canvas.getContext('2d')!
  private signature = ''
  private logo: OverlayData['logo'] = null
  private trackId: string | null = null
  private trackStart = 0

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl
    this.prog = program(gl, FS)
    this.u = uniforms(gl, this.prog, ['uSrc'] as const)
    this.vao = gl.createVertexArray()!
    this.tex = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, this.tex)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  }

  // Over the output canvas. `now` is the frame clock, seconds.
  draw(o: OverlaySettings, data: OverlayData, s: Surface, now: number): void {
    if (data.trackId !== this.trackId) {
      this.trackId = data.trackId
      this.trackStart = now
    }
    const titleAlpha = o.title.enabled && (data.title || data.artist) ? this.titleAlpha(o.title.hold, now) : 0
    const index = o.lyrics.enabled && data.lyrics ? lineAt(data.lyrics, data.time) : -1
    const current = index >= 0 ? data.lyrics![index].text : ''
    const next = o.lyrics.enabled && data.lyrics ? (data.lyrics[index + 1]?.text ?? '') : ''
    const text = o.text.enabled ? o.text.content.trim() : ''
    const logo = o.logo.enabled ? data.logo : null
    if (titleAlpha <= 0 && !current && !next && !text && !logo) return

    // Title fades are drawn in 32 steps: enough to look smooth, few enough to stay cheap.
    const signature = JSON.stringify([o, data.title, data.artist, current, next, Math.round(titleAlpha * 32), s.width, s.height])
    if (signature !== this.signature || logo !== this.logo) {
      this.signature = signature
      this.logo = logo
      this.paint(o, s, { titleAlpha, title: data.title, artist: data.artist, current, next, text, logo })
    }
    const gl = this.gl
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, s.width, s.height)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    gl.useProgram(this.prog)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.tex)
    gl.uniform1i(this.u.uSrc, 0)
    drawFullscreen(gl, this.vao)
    gl.disable(gl.BLEND)
  }

  dispose(): void {
    const gl = this.gl
    gl.deleteProgram(this.prog)
    gl.deleteVertexArray(this.vao)
    gl.deleteTexture(this.tex)
  }

  private titleAlpha(hold: number, now: number): number {
    if (!this.trackId) return 0
    const t = now - this.trackStart
    const fadeIn = Math.min(1, t / FADE_S)
    if (hold <= 0) return fadeIn
    return Math.max(0, Math.min(fadeIn, (hold - t) / FADE_S))
  }

  private paint(o: OverlaySettings, s: Surface, c: { titleAlpha: number; title: string; artist: string; current: string; next: string; text: string; logo: OverlayData['logo'] }): void {
    const { width: W, height: H } = s
    const ctx = this.ctx
    if (this.canvas.width !== W || this.canvas.height !== H) {
      this.canvas.width = W
      this.canvas.height = H
    }
    ctx.clearRect(0, 0, W, H)
    const k = H / 1080
    const margin = 48 * k
    const family = FAMILIES[FONTS[o.font]]
    ctx.fillStyle = o.color
    ctx.textBaseline = 'alphabetic'

    // Lines wrapped to the width and stacked at the anchor, aligned to its side.
    const block = (anchor: number, lines: Line[], opacity: number) => {
      const col = anchor % 3
      const row = Math.floor(anchor / 3)
      const maxWidth = W - margin * 2
      const laid: { text: string; px: number; font: string; alpha: number }[] = []
      for (const l of lines) {
        if (!l.text) continue
        const px = l.size * k
        const font = `${l.weight} ${px}px ${family}`
        ctx.font = font
        for (const part of wrap(ctx, l.text, maxWidth)) laid.push({ text: part, px, font, alpha: l.alpha })
      }
      if (!laid.length) return
      const total = laid.reduce((h, l) => h + l.px * 1.25, 0)
      let y = row === 0 ? margin : row === 1 ? (H - total) / 2 : H - margin - total
      const x = col === 0 ? margin : col === 1 ? W / 2 : W - margin
      ctx.textAlign = col === 0 ? 'left' : col === 1 ? 'center' : 'right'
      ctx.shadowColor = 'rgba(0, 0, 0, 0.75)'
      ctx.shadowBlur = 12 * k
      ctx.shadowOffsetY = 2 * k
      for (const l of laid) {
        ctx.font = l.font
        ctx.globalAlpha = opacity * l.alpha
        // Baseline near the bottom of the line's em box; descenders use the 1.25 spacing.
        ctx.fillText(l.text, x, y + l.px * 0.95)
        y += l.px * 1.25
      }
      ctx.globalAlpha = 1
    }

    if (c.titleAlpha > 0) {
      block(
        o.title.anchor,
        [
          { text: c.title, size: 48 * o.title.size, weight: 700, alpha: 1 },
          { text: c.artist, size: 30 * o.title.size, weight: 400, alpha: 0.85 },
        ],
        o.title.opacity * c.titleAlpha,
      )
    }
    if (c.current || c.next) {
      block(
        o.lyrics.anchor,
        [
          { text: c.current, size: 56 * o.lyrics.size, weight: 700, alpha: 1 },
          { text: c.next, size: 36 * o.lyrics.size, weight: 400, alpha: 0.55 },
        ],
        o.lyrics.opacity,
      )
    }
    if (c.text) block(o.text.anchor, c.text.split('\n').map((t) => ({ text: t.trim(), size: 36 * o.text.size, weight: 600, alpha: 1 })), o.text.opacity)
    if (c.logo && c.logo.width > 0 && c.logo.height > 0) {
      const h = 120 * k * o.logo.size
      const w = (h * c.logo.width) / c.logo.height
      const col = o.logo.anchor % 3
      const row = Math.floor(o.logo.anchor / 3)
      const x = col === 0 ? margin : col === 1 ? (W - w) / 2 : W - margin - w
      const y = row === 0 ? margin : row === 1 ? (H - h) / 2 : H - margin - h
      ctx.shadowColor = 'transparent'
      ctx.globalAlpha = o.logo.opacity
      ctx.drawImage(c.logo, x, y, w, h)
      ctx.globalAlpha = 1
    }

    const gl = this.gl
    gl.bindTexture(gl.TEXTURE_2D, this.tex)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.canvas)
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
  }
}

// Greedy word wrap; a single word wider than the line is left whole.
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const out: string[] = []
  let line = ''
  for (const w of words) {
    const next = line ? `${line} ${w}` : w
    if (line && ctx.measureText(next).width > maxWidth) {
      out.push(line)
      line = w
    } else {
      line = next
    }
  }
  if (line) out.push(line)
  return out
}
