// Reader for ISF (Interactive Shader Format) fragment shaders: a JSON header in the first
// comment declares inputs and passes; the code below is GLSL ES 1.00 with ISF helpers.
// https://docs.isf.video

export type ShaderErrorCode = 'noHeader' | 'badJson' | 'noMain' | 'tooLong'

export class ShaderError extends Error {
  readonly code: ShaderErrorCode
  constructor(code: ShaderErrorCode, detail = '') {
    super(detail || code)
    this.code = code
  }
}

export const SOURCE_MAX = 200_000
// Limits that keep a strange file from asking for huge buffers or endless lists.
const MAX_INPUTS = 48
const MAX_PASSES = 8
const MAX_LONG_VALUES = 64
const MAX_AUDIO_SAMPLES = 2048

interface InputBase {
  name: string
  label: string
}

export type IsfInput =
  | (InputBase & { type: 'float'; min: number; max: number; default: number })
  | (InputBase & { type: 'bool'; default: boolean })
  | (InputBase & { type: 'long'; values: number[]; labels: string[]; default: number })
  | (InputBase & { type: 'color'; default: [number, number, number, number] })
  | (InputBase & { type: 'point2D'; min: [number, number]; max: [number, number]; default: [number, number] })
  | (InputBase & { type: 'image' })
  | (InputBase & { type: 'audio' | 'audioFFT'; samples: number })
  | (InputBase & { type: 'event' })

export interface IsfPass {
  target: string | null
  persistent: boolean
  float: boolean
  // Size expressions over $WIDTH and $HEIGHT; null is the render size.
  width: string | null
  height: string | null
}

export interface IsfShader {
  description: string
  credit: string
  inputs: IsfInput[]
  passes: IsfPass[]
  // GLSL after the header.
  code: string
}

const IDENT = /^[A-Za-z_]\w*$/
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback)
const str = (v: unknown, fallback = '') => (typeof v === 'string' ? v : fallback)
const at = (v: unknown, i: number, fallback: number) => num(Array.isArray(v) ? v[i] : undefined, fallback)
const vec2 = (v: unknown, f: [number, number]): [number, number] => [at(v, 0, f[0]), at(v, 1, f[1])]
const vec4 = (v: unknown, f: [number, number, number, number]): [number, number, number, number] => [at(v, 0, f[0]), at(v, 1, f[1]), at(v, 2, f[2]), at(v, 3, f[3])]

// The header: the first block comment, holding a JSON object.
export function splitHeader(source: string): { json: string; code: string } {
  const m = /^\s*\/\*([\s\S]*?)\*\//.exec(source)
  if (!m || !m[1].trim().startsWith('{')) throw new ShaderError('noHeader')
  return { json: m[1], code: source.slice(m[0].length) }
}

function parseInput(raw: unknown): IsfInput | null {
  if (!isObj(raw)) return null
  const name = str(raw.NAME)
  if (!IDENT.test(name)) return null
  const label = str(raw.LABEL, name).slice(0, 60) || name
  const base = { name, label }
  switch (raw.TYPE) {
    case 'float': {
      const min = num(raw.MIN, 0)
      let max = num(raw.MAX, 1)
      if (max <= min) max = min + 1
      return { ...base, type: 'float', min, max, default: Math.min(max, Math.max(min, num(raw.DEFAULT, min))) }
    }
    case 'bool':
      return { ...base, type: 'bool', default: raw.DEFAULT === true || raw.DEFAULT === 1 }
    case 'long': {
      let values = Array.isArray(raw.VALUES) ? raw.VALUES.filter((v): v is number => typeof v === 'number' && Number.isFinite(v)).map(Math.round) : []
      if (!values.length) {
        const min = Math.round(num(raw.MIN, 0))
        const max = Math.max(min, Math.round(num(raw.MAX, min + 1)))
        values = Array.from({ length: Math.min(MAX_LONG_VALUES, max - min + 1) }, (_, i) => min + i)
      }
      values = values.slice(0, MAX_LONG_VALUES)
      const given = Array.isArray(raw.LABELS) ? raw.LABELS : []
      const labels = values.map((v, i) => (typeof given[i] === 'string' && given[i] ? String(given[i]).slice(0, 60) : String(v)))
      const d = Math.round(num(raw.DEFAULT, values[0]))
      return { ...base, type: 'long', values, labels, default: values.includes(d) ? d : values[0] }
    }
    case 'color':
      return { ...base, type: 'color', default: vec4(raw.DEFAULT, [1, 1, 1, 1]).map((c) => Math.min(1, Math.max(0, c))) as [number, number, number, number] }
    case 'point2D': {
      const d = vec2(raw.DEFAULT, [0, 0])
      const span = (c: number) => Math.max(1, Math.abs(c) * 2)
      const min = vec2(raw.MIN, [Math.min(0, d[0]), Math.min(0, d[1])])
      const max = vec2(raw.MAX, [span(d[0]), span(d[1])])
      for (const i of [0, 1]) if (max[i] <= min[i]) max[i] = min[i] + 1
      return { ...base, type: 'point2D', min, max, default: [Math.min(max[0], Math.max(min[0], d[0])), Math.min(max[1], Math.max(min[1], d[1]))] }
    }
    case 'image':
      return { ...base, type: 'image' }
    case 'audio':
    case 'audioFFT':
      return { ...base, type: raw.TYPE, samples: Math.max(1, Math.min(MAX_AUDIO_SAMPLES, Math.round(num(raw.MAX, raw.TYPE === 'audio' ? 512 : 256)))) }
    case 'event':
      return { ...base, type: 'event' }
    default:
      return null
  }
}

function parsePass(raw: unknown): IsfPass {
  const r = isObj(raw) ? raw : {}
  const target = str(r.TARGET)
  const size = (v: unknown) => (typeof v === 'number' ? String(v) : typeof v === 'string' && v.trim() ? v : null)
  return {
    target: IDENT.test(target) ? target : null,
    persistent: r.PERSISTENT === true || r.PERSISTENT === 1,
    float: r.FLOAT === true || r.FLOAT === 1,
    width: size(r.WIDTH),
    height: size(r.HEIGHT),
  }
}

export function parseIsf(source: string): IsfShader {
  if (source.length > SOURCE_MAX) throw new ShaderError('tooLong')
  const { json, code } = splitHeader(source)
  let head: unknown
  try {
    head = JSON.parse(json)
  } catch (err) {
    throw new ShaderError('badJson', err instanceof Error ? err.message : String(err))
  }
  if (!isObj(head)) throw new ShaderError('badJson')
  if (!/\bvoid\s+main\s*\(/.test(code)) throw new ShaderError('noMain')
  const inputs: IsfInput[] = []
  for (const r of Array.isArray(head.INPUTS) ? head.INPUTS : []) {
    const input = parseInput(r)
    if (input && !inputs.some((x) => x.name === input.name)) inputs.push(input)
    if (inputs.length === MAX_INPUTS) break
  }
  const rawPasses = Array.isArray(head.PASSES) && head.PASSES.length ? head.PASSES.slice(0, MAX_PASSES) : [{}]
  return {
    description: str(head.DESCRIPTION).slice(0, 300),
    credit: str(head.CREDIT).slice(0, 120),
    inputs,
    passes: rawPasses.map(parsePass),
    code,
  }
}

// Size expressions of passes: numbers, $WIDTH, $HEIGHT, + - * / and parentheses, plus
// floor, ceil, round, min, max and abs. Anything else gives null (the render size).
export function evalSize(expr: string, width: number, height: number): number | null {
  const tokens = expr.match(/\$WIDTH|\$HEIGHT|\d+\.?\d*(?:[eE][+-]?\d+)?|\.\d+|[A-Za-z]+|[-+*/(),]|\S/g) ?? []
  let i = 0
  const FNS: Record<string, (...a: number[]) => number> = { floor: Math.floor, ceil: Math.ceil, round: Math.round, min: Math.min, max: Math.max, abs: Math.abs }
  const fail = () => {
    throw new Error('bad size')
  }
  const primary = (): number => {
    const t = tokens[i++]
    if (t === undefined) return fail()
    if (t === '$WIDTH') return width
    if (t === '$HEIGHT') return height
    if (t === '-') return -primary()
    if (t === '+') return primary()
    if (t === '(') {
      const v = sum()
      if (tokens[i++] !== ')') fail()
      return v
    }
    if (/^[\d.]/.test(t)) return Number(t)
    const fn = FNS[t]
    if (!fn || tokens[i++] !== '(') return fail()
    const args = [sum()]
    while (tokens[i] === ',') {
      i++
      args.push(sum())
    }
    if (tokens[i++] !== ')') fail()
    return fn(...args)
  }
  const product = (): number => {
    let v = primary()
    while (tokens[i] === '*' || tokens[i] === '/') v = tokens[i++] === '*' ? v * primary() : v / primary()
    return v
  }
  const sum = (): number => {
    let v = product()
    while (tokens[i] === '+' || tokens[i] === '-') v = tokens[i++] === '+' ? v + product() : v - product()
    return v
  }
  try {
    const v = sum()
    if (i !== tokens.length || !Number.isFinite(v)) return null
    return Math.max(1, Math.min(8192, Math.round(v)))
  } catch {
    return null
  }
}

// Names of the samplers the code can read: image and audio inputs, then pass targets.
export function samplerNames(s: IsfShader): string[] {
  const names = s.inputs.filter((x) => x.type === 'image' || x.type === 'audio' || x.type === 'audioFFT').map((x) => x.name)
  for (const p of s.passes) if (p.target && !names.includes(p.target)) names.push(p.target)
  return names
}

const UNIFORM_TYPE: Record<string, string> = { float: 'float', bool: 'bool', long: 'int', color: 'vec4', point2D: 'vec2', event: 'bool' }

export const ISF_VS = `attribute vec2 aPos;
varying vec2 isf_FragNormCoord;
void main() {
  isf_FragNormCoord = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`

// GLSL ES 1.00 fragment shader: built-in uniforms, inputs and targets declared, and the
// ISF image macros rewritten as plain texture reads.
export function isfFragment(s: IsfShader): string {
  const samplers = samplerNames(s)
  const decl = [
    ...s.inputs.filter((x) => x.type in UNIFORM_TYPE).map((x) => `uniform ${UNIFORM_TYPE[x.type]} ${x.name};`),
    ...samplers.map((n) => `uniform sampler2D ${n};\nuniform vec2 _${n}_imgSize;`),
  ]
  let code = s.code.replace(/^[ \t]*#version[^\n]*\n?/gm, '').replace(/\bvv_FragNormCoord\b/g, 'isf_FragNormCoord')
  code = code
    .replace(/\bIMG_THIS_(?:NORM_)?PIXEL\s*\(\s*(\w+)\s*\)/g, (_, n: string) => `texture2D(${n}, isf_FragNormCoord)`)
    .replace(/\bIMG_NORM_PIXEL\s*\(\s*(\w+)\s*,/g, (_, n: string) => `texture2D(${n},`)
    .replace(/\bIMG_PIXEL\s*\(\s*(\w+)\s*,/g, (_, n: string) => `isf_pixel(${n}, _${n}_imgSize,`)
    .replace(/\bIMG_SIZE\s*\(\s*(\w+)\s*\)/g, (_, n: string) => `_${n}_imgSize`)
  return `precision highp float;
precision highp int;
uniform int PASSINDEX;
uniform vec2 RENDERSIZE;
uniform float TIME;
uniform float TIMEDELTA;
uniform int FRAMEINDEX;
uniform vec4 DATE;
varying vec2 isf_FragNormCoord;
${decl.join('\n')}
vec4 isf_pixel(sampler2D s, vec2 size, vec2 c) { return texture2D(s, c / size); }
${code}`
}
