import { get, set } from 'idb-keyval'
import { createStore } from '../core/store'
import { setUserVisuals } from '../engine/render/registry'
import type { VisualDef, VisualGL } from '../engine/render/visual'
import { ShaderError, splitHeader } from '../engine/shaders/isf'
import { isShadertoy } from '../engine/shaders/shadertoy'
import { USER_PREFIX, userVisual, type ShaderFormat, type UserShader } from '../engine/shaders/userVisual'
import { defaultScene, type SceneState } from '../engine/scene/scene'
import { translate, type Lang, type MessageKey } from '../i18n'
import { sceneStore } from './scene'

// Shaders the user imported or pasted, kept in IndexedDB and offered as visualizations.

const KEY = 'shaders'
export const SHADER_NAME_MAX = 60

export const shadersStore = createStore<UserShader[]>([])

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

function normalize(raw: unknown): UserShader[] {
  if (!Array.isArray(raw)) return []
  const out: UserShader[] = []
  for (const r of raw) {
    if (!isObj(r) || typeof r.id !== 'string' || typeof r.source !== 'string' || (r.format !== 'isf' && r.format !== 'shadertoy')) continue
    if (out.some((x) => x.id === r.id)) continue
    out.push({ id: r.id, name: typeof r.name === 'string' && r.name.trim() ? r.name.slice(0, SHADER_NAME_MAX) : r.id, format: r.format, source: r.source, added: typeof r.added === 'number' ? r.added : 0 })
  }
  return out
}

// Shaders that no longer parse are kept, so nothing is lost, but not offered.
function register(list: UserShader[]): void {
  const defs: VisualDef[] = []
  for (const u of list) {
    try {
      defs.push(userVisual(u))
    } catch {
      // Skipped until fixed.
    }
  }
  setUserVisuals(defs)
}

export async function initShaders(): Promise<void> {
  try {
    shadersStore.set(normalize(await get(KEY)))
  } catch {
    // IndexedDB unavailable: shaders last for this visit only.
  }
  register(shadersStore.get())
  shadersStore.subscribe(() => {
    register(shadersStore.get())
    set(KEY, shadersStore.get()).catch(() => {})
  })
}

export function detectFormat(source: string): ShaderFormat {
  try {
    splitHeader(source)
    return 'isf'
  } catch {
    if (isShadertoy(source)) return 'shadertoy'
    throw new ShaderError('noHeader')
  }
}

// Compiles in a throwaway context, so a broken shader is refused with the driver's log
// instead of failing on stage.
function compileError(def: VisualGL): string | null {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 36
  const gl = canvas.getContext('webgl2')
  if (!gl) return null
  try {
    def.create(gl).dispose?.()
    return null
  } catch (err) {
    return (err instanceof Error ? err.message : String(err)).replace(/^(Shader|Program): /, '').trim()
  } finally {
    gl.getExtension('WEBGL_lose_context')?.loseContext()
  }
}

let next = 0
const newId = () => `s${Date.now().toString(36)}${++next}`

// The error as text in `lang`, or null when the shader was added.
export function addShader(name: string, source: string, lang: Lang): string | null {
  const t = (key: MessageKey, params?: Record<string, string | number>) => translate(lang, key, params)
  let def: VisualGL
  let shader: UserShader
  try {
    const format = detectFormat(source)
    shader = { id: newId(), name: name.trim().slice(0, SHADER_NAME_MAX) || 'Shader', format, source, added: Date.now() }
    def = userVisual(shader)
  } catch (err) {
    if (err instanceof ShaderError) return t(`shaders.error.${err.code}` as MessageKey, { detail: err.message })
    return String(err)
  }
  const log = compileError(def)
  if (log) return t('shaders.error.compile', { detail: log })
  shadersStore.set((list) => [...list, shader])
  return null
}

// Each file named after itself, without the extension. Returns one error line per file
// that was refused.
export async function importShaderFiles(files: File[], lang: Lang): Promise<{ added: number; errors: string[] }> {
  let added = 0
  const errors: string[] = []
  for (const file of files) {
    const error = addShader(file.name.replace(/\.[^.]+$/, ''), await file.text(), lang)
    if (error) errors.push(translate(lang, 'shaders.error.file', { file: file.name, error }))
    else added++
  }
  return { added, errors }
}

// Layers showing the shader go back to their default visualization.
export function deleteShader(id: string): void {
  const visual = USER_PREFIX + id
  const fallback = defaultScene().layers
  sceneStore.set((s) => {
    if (!s.layers.some((l) => l.visual === visual)) return s
    const layers: SceneState['layers'] = [...s.layers]
    layers.forEach((l, i) => {
      if (l.visual === visual) layers[i] = { ...l, visual: fallback[i].visual }
    })
    return { ...s, layers }
  })
  shadersStore.set((list) => list.filter((u) => u.id !== id))
}
