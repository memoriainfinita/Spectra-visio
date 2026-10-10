import { KICK, MAX_BANDS, WAVE_SIZE, type AnalysisFrame } from '../analysis/analyzer'
import { FULLSCREEN_VS, TONE_FS, Target, drawFullscreen, program, uniforms } from '../render/gl'
import type { ParamDef, Params, VisualFrame, VisualGL, VisualInstance } from '../render/visual'
import { InputTexture } from '../render/visualInput'
import { ISF_VS, evalSize, isfFragment, parseIsf, samplerNames, type IsfInput, type IsfShader } from './isf'
import { checkShadertoy, shadertoyFragment } from './shadertoy'

export type ShaderFormat = 'isf' | 'shadertoy'

// A shader the user imported or pasted, as stored.
export interface UserShader {
  id: string
  name: string
  format: ShaderFormat
  source: string
  added: number
}

export const USER_PREFIX = 'user:'
// Parameter ids of shader inputs carry a prefix so they never clash with the common ones.
const INPUT = 'in.'

// Parameters for the inputs that are values; images, audio and events are fed by the app.
export function isfParams(s: IsfShader): ParamDef[] {
  const out: ParamDef[] = []
  for (const x of s.inputs) {
    const id = INPUT + x.name
    const base = { label: 'param.input' as const, name: x.label }
    switch (x.type) {
      case 'float':
        out.push({ ...base, id, min: x.min, max: x.max, default: x.default })
        break
      case 'bool':
        out.push({ ...base, id, min: 0, max: 1, default: x.default ? 1 : 0, int: true, options: ['shaders.off', 'shaders.on'] })
        break
      case 'long':
        out.push({ ...base, id, min: 0, max: x.values.length - 1, default: x.values.indexOf(x.default), int: true, labels: x.labels })
        break
      case 'color':
        ;(['r', 'g', 'b'] as const).forEach((c, i) => out.push({ ...base, id: `${id}.${c}`, name: `${x.label} ${c.toUpperCase()}`, min: 0, max: 1, default: x.default[i] }))
        break
      case 'point2D':
        ;(['x', 'y'] as const).forEach((c, i) => out.push({ ...base, id: `${id}.${c}`, name: `${x.label} ${c.toUpperCase()}`, min: x.min[i], max: x.max[i], default: x.default[i] }))
        break
    }
  }
  return out
}

// Builds the visualization, or throws ShaderError when the source is not a shader.
export function userVisual(u: UserShader): VisualGL {
  const isf = u.format === 'isf' ? parseIsf(u.source) : null
  if (!isf) checkShadertoy(u.source)
  return {
    id: USER_PREFIX + u.id,
    label: 'visual.userShader',
    name: u.name,
    category: 'shader',
    kind: 'gl',
    params: isf ? isfParams(isf) : [],
    source: u.source,
    create: (gl) => (isf ? createIsf(gl, isf) : createShadertoy(gl, u.source)),
  }
}

// Audio as an image: one row per channel. Waveforms are 0.5 at silence; spectra are the
// app's log bands, 0 to 1.
class AudioImage {
  readonly texture: WebGLTexture
  readonly width: number
  private readonly gl: WebGL2RenderingContext
  private readonly fft: boolean
  private readonly data: Uint8Array

  constructor(gl: WebGL2RenderingContext, width: number, fft: boolean) {
    this.gl = gl
    this.width = width
    this.fft = fft
    this.data = new Uint8Array(width * 2 * 4)
    this.texture = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, this.texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, 2, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
  }

  update(a: AnalysisFrame | null, sens: number): void {
    const n = this.width
    for (let row = 0; row < 2; row++) {
      for (let i = 0; i < n; i++) {
        const p = n > 1 ? i / (n - 1) : 0
        let v: number
        if (!a) v = this.fft ? 0 : 0.5
        else if (this.fft) v = sampleBands(row ? a.bandsR : a.bandsL, a.bandCount, p) * sens
        else v = 0.5 + 0.5 * (row ? a.waveR : a.waveL)[Math.round(p * (WAVE_SIZE - 1))] * sens
        const b = Math.max(0, Math.min(255, v * 255))
        const k = (row * n + i) * 4
        this.data[k] = this.data[k + 1] = this.data[k + 2] = b
        this.data[k + 3] = 255
      }
    }
    const gl = this.gl
    gl.bindTexture(gl.TEXTURE_2D, this.texture)
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, n, 2, gl.RGBA, gl.UNSIGNED_BYTE, this.data)
  }

  dispose(): void {
    this.gl.deleteTexture(this.texture)
  }
}

function sampleBands(bands: Float32Array, count: number, p: number): number {
  if (count <= 0) return 0
  const x = p * (Math.min(count, MAX_BANDS) - 1)
  const i = Math.floor(x)
  const j = Math.min(count - 1, i + 1)
  return bands[i] + (bands[j] - bands[i]) * (x - i)
}

// A pass target: two textures, read and write, swapped after each pass that writes it, so
// a pass can read the previous image of its own target.
class PassTarget {
  read: Target
  write: Target
  private readonly persistent: boolean

  constructor(gl: WebGL2RenderingContext, persistent: boolean, float: boolean) {
    this.read = new Target(gl, float)
    this.write = new Target(gl, float)
    this.persistent = persistent
  }

  size(w: number, h: number): void {
    this.read.size(w, h)
    this.write.size(w, h)
  }

  swap(): void {
    ;[this.read, this.write] = [this.write, this.read]
  }

  get keeps(): boolean {
    return this.persistent
  }

  dispose(): void {
    this.read.dispose()
    this.write.dispose()
  }
}

const date = (): [number, number, number, number] => {
  const d = new Date()
  return [d.getFullYear(), d.getMonth(), d.getDate(), d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds() + d.getMilliseconds() / 1000]
}

// The common hue and intensity, applied while copying `src` into the layer's framebuffer.
class Tone {
  private readonly gl: WebGL2RenderingContext
  private readonly prog: WebGLProgram
  private readonly u: Record<'uSrc' | 'uHue' | 'uIntensity', WebGLUniformLocation | null>
  private readonly vao: WebGLVertexArrayObject

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl
    this.prog = program(gl, TONE_FS)
    this.u = uniforms(gl, this.prog, ['uSrc', 'uHue', 'uIntensity'] as const)
    this.vao = gl.createVertexArray()!
  }

  draw(src: WebGLTexture, fbo: WebGLFramebuffer | null, width: number, height: number, p: Params): void {
    const gl = this.gl
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
    gl.viewport(0, 0, width, height)
    gl.useProgram(this.prog)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, src)
    gl.uniform1i(this.u.uSrc, 0)
    gl.uniform1f(this.u.uHue, ((p.hue ?? 0) * Math.PI) / 180)
    gl.uniform1f(this.u.uIntensity, p.intensity ?? 1)
    drawFullscreen(gl, this.vao)
  }

  dispose(): void {
    this.gl.deleteProgram(this.prog)
    this.gl.deleteVertexArray(this.vao)
  }
}

function createIsf(gl: WebGL2RenderingContext, s: IsfShader): VisualInstance {
  const samplers = samplerNames(s)
  if (samplers.length > gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS)) throw new Error('Shader: too many images')
  const prog = program(gl, isfFragment(s), ISF_VS)
  const builtins = uniforms(gl, prog, ['PASSINDEX', 'RENDERSIZE', 'TIME', 'TIMEDELTA', 'FRAMEINDEX', 'DATE'] as const)
  const inputLoc = new Map(s.inputs.map((x) => [x.name, gl.getUniformLocation(prog, x.name)]))
  const samplerLoc = samplers.map((n) => ({ tex: gl.getUniformLocation(prog, n), size: gl.getUniformLocation(prog, `_${n}_imgSize`) }))
  // Fullscreen triangle for the GLSL ES 1.00 vertex shader, which has no gl_VertexID.
  const vao = gl.createVertexArray()!
  const vbo = gl.createBuffer()!
  gl.bindVertexArray(vao)
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  const aPos = gl.getAttribLocation(prog, 'aPos')
  gl.enableVertexAttribArray(aPos)
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)
  gl.bindVertexArray(null)

  const audio = new Map<string, AudioImage>()
  for (const x of s.inputs) if (x.type === 'audio' || x.type === 'audioFFT') audio.set(x.name, new AudioImage(gl, x.samples, x.type === 'audioFFT'))
  const imageInputs = new Set(s.inputs.filter((x) => x.type === 'image').map((x) => x.name))
  const input = imageInputs.size ? new InputTexture(gl) : null
  const targets = new Map<string, PassTarget>()
  for (const p of s.passes) if (p.target && !targets.has(p.target)) targets.set(p.target, new PassTarget(gl, p.persistent, p.float))
  const out = new Target(gl)
  const tone = new Tone(gl)
  let time = 0
  let frameIndex = 0

  const setInput = (x: IsfInput, p: Params, hit: boolean) => {
    const loc = inputLoc.get(x.name) ?? null
    const v = (suffix = '') => p[INPUT + x.name + suffix]
    switch (x.type) {
      case 'float':
        gl.uniform1f(loc, v())
        break
      case 'bool':
        gl.uniform1i(loc, v() >= 0.5 ? 1 : 0)
        break
      case 'long':
        gl.uniform1i(loc, x.values[Math.round(v())] ?? x.default)
        break
      case 'color':
        gl.uniform4f(loc, v('.r'), v('.g'), v('.b'), x.default[3])
        break
      case 'point2D':
        gl.uniform2f(loc, v('.x'), v('.y'))
        break
      case 'event':
        // Events fire on the kick: there is no button to press during a show.
        gl.uniform1i(loc, hit ? 1 : 0)
        break
    }
  }

  return {
    render(f: VisualFrame, p: Params, surface) {
      const W = surface.width
      const H = surface.height
      const layerFbo = gl.getParameter(gl.FRAMEBUFFER_BINDING) as WebGLFramebuffer | null
      const dt = f.dt * (p.speed ?? 1)
      time += dt
      const sens = p.sensitivity ?? 1
      for (const a of audio.values()) a.update(f.analysis, sens)
      if (input) input.update()
      out.size(W, H)

      gl.useProgram(prog)
      gl.bindVertexArray(vao)
      gl.uniform1f(builtins.TIME, time)
      gl.uniform1f(builtins.TIMEDELTA, dt)
      gl.uniform1i(builtins.FRAMEINDEX, frameIndex++)
      gl.uniform4f(builtins.DATE, ...date())
      const kick = f.hits[KICK] ?? false
      for (const x of s.inputs) setInput(x, p, kick)

      let last: WebGLTexture = out.texture
      s.passes.forEach((pass, index) => {
        const w = (pass.width && evalSize(pass.width, W, H)) || W
        const h = (pass.height && evalSize(pass.height, W, H)) || H
        const target = pass.target ? targets.get(pass.target)! : null
        // Resizing binds textures, so it goes before the samplers are bound.
        target?.size(w, h)
        // Samplers: the visual input, audio images and the latest image of each target.
        samplers.forEach((name, unit) => {
          let tex: WebGLTexture
          let size: [number, number]
          const t = targets.get(name)
          if (t) {
            tex = t.read.texture
            size = [t.read.width, t.read.height]
          } else if (audio.has(name)) {
            const a = audio.get(name)!
            tex = a.texture
            size = [a.width, 2]
          } else {
            tex = input!.texture
            size = [input!.width, input!.height]
          }
          gl.activeTexture(gl.TEXTURE0 + unit)
          gl.bindTexture(gl.TEXTURE_2D, tex)
          gl.uniform1i(samplerLoc[unit].tex, unit)
          gl.uniform2f(samplerLoc[unit].size, size[0], size[1])
        })
        gl.activeTexture(gl.TEXTURE0)
        gl.uniform1i(builtins.PASSINDEX, index)
        gl.uniform2f(builtins.RENDERSIZE, w, h)
        if (target) {
          if (!target.keeps) {
            target.write.bind()
            gl.clearColor(0, 0, 0, 0)
            gl.clear(gl.COLOR_BUFFER_BIT)
          }
          target.write.bind()
          gl.drawArrays(gl.TRIANGLES, 0, 3)
          target.swap()
          last = target.read.texture
        } else {
          out.bind()
          gl.drawArrays(gl.TRIANGLES, 0, 3)
          last = out.texture
        }
      })
      gl.bindVertexArray(null)
      tone.draw(last, layerFbo, W, H, p)
    },
    dispose() {
      gl.deleteProgram(prog)
      gl.deleteVertexArray(vao)
      gl.deleteBuffer(vbo)
      for (const a of audio.values()) a.dispose()
      for (const t of targets.values()) t.dispose()
      input?.dispose()
      out.dispose()
      tone.dispose()
    },
  }
}

const SHADERTOY_UNIFORMS = ['iResolution', 'iTime', 'iTimeDelta', 'iFrameRate', 'iFrame', 'iMouse', 'iDate', 'iSampleRate', 'iChannelTime', 'iChannelResolution', 'iChannel0', 'iChannel1', 'iChannel2', 'iChannel3'] as const
const ST_AUDIO = 512

function createShadertoy(gl: WebGL2RenderingContext, code: string): VisualInstance {
  const prog = program(gl, shadertoyFragment(code), FULLSCREEN_VS)
  const u = uniforms(gl, prog, SHADERTOY_UNIFORMS)
  const vao = gl.createVertexArray()!
  // Shadertoy's sound input: 512 × 2, the spectrum in the first row, the waveform in the second.
  const sound = gl.createTexture()!
  gl.bindTexture(gl.TEXTURE_2D, sound)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, ST_AUDIO, 2, 0, gl.RED, gl.UNSIGNED_BYTE, null)
  const black = gl.createTexture()!
  gl.bindTexture(gl.TEXTURE_2D, black)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]))
  const data = new Uint8Array(ST_AUDIO * 2)
  const input = new InputTexture(gl)
  const out = new Target(gl)
  const tone = new Tone(gl)
  let time = 0
  let frame = 0

  return {
    render(f, p, surface) {
      const W = surface.width
      const H = surface.height
      const layerFbo = gl.getParameter(gl.FRAMEBUFFER_BINDING) as WebGLFramebuffer | null
      const dt = f.dt * (p.speed ?? 1)
      time += dt
      const a = f.analysis
      const sens = p.sensitivity ?? 1
      for (let i = 0; i < ST_AUDIO; i++) {
        const x = i / (ST_AUDIO - 1)
        data[i] = a ? Math.max(0, Math.min(255, sampleBands(a.bands, a.bandCount, x) * sens * 255)) : 0
        data[ST_AUDIO + i] = Math.max(0, Math.min(255, 128 + f.wave[Math.round(x * (WAVE_SIZE - 1))] * sens * 127))
      }
      // Resizing binds textures, so it goes before the channels are bound.
      out.size(W, H)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, sound)
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, ST_AUDIO, 2, gl.RED, gl.UNSIGNED_BYTE, data)
      gl.activeTexture(gl.TEXTURE1)
      input.update()
      for (const [unit, tex] of [[2, black], [3, black]] as const) {
        gl.activeTexture(gl.TEXTURE0 + unit)
        gl.bindTexture(gl.TEXTURE_2D, tex)
      }
      gl.activeTexture(gl.TEXTURE0)

      out.bind()
      gl.useProgram(prog)
      gl.uniform3f(u.iResolution, W, H, 1)
      gl.uniform1f(u.iTime, time)
      gl.uniform1f(u.iTimeDelta, dt)
      gl.uniform1f(u.iFrameRate, f.dt > 0 ? 1 / f.dt : 60)
      gl.uniform1i(u.iFrame, frame++)
      gl.uniform4f(u.iMouse, 0, 0, 0, 0)
      gl.uniform4f(u.iDate, ...date())
      gl.uniform1f(u.iSampleRate, 48000)
      gl.uniform1fv(u.iChannelTime, [time, time, time, time])
      gl.uniform3fv(u.iChannelResolution, [ST_AUDIO, 2, 1, input.width, input.height, 1, 1, 1, 1, 1, 1, 1])
      gl.uniform1i(u.iChannel0, 0)
      gl.uniform1i(u.iChannel1, 1)
      gl.uniform1i(u.iChannel2, 2)
      gl.uniform1i(u.iChannel3, 3)
      drawFullscreen(gl, vao)
      tone.draw(out.texture, layerFbo, W, H, p)
    },
    dispose() {
      gl.deleteProgram(prog)
      gl.deleteVertexArray(vao)
      gl.deleteTexture(sound)
      gl.deleteTexture(black)
      input.dispose()
      out.dispose()
      tone.dispose()
    },
  }
}
