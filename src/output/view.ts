import { keyCombo, type OutputState } from '../engine/live/live'
import type { OutputBridge } from '../engine/output/bridge'
import type { OverlayData } from '../engine/overlay/overlay'
import { setUserVisuals } from '../engine/render/registry'
import { Renderer } from '../engine/render/renderer'
import type { VisualDef } from '../engine/render/visual'
import { setVisualSource, type VisualSource } from '../engine/render/visualInput'
import { defaultScene, type SceneState } from '../engine/scene/scene'
import { userVisual, type UserShader } from '../engine/shaders/userVisual'
import { detectLang, translate, type MessageKey } from '../i18n'

// A page that is only the composition, full size: the output window and the OBS source.
// Everything comes through a bridge; without it the image goes black and a line says so.

export type ViewBridge = OutputBridge & { attach?(w: Window): void }

export interface ViewOptions {
  bridge: () => ViewBridge | null
  title: MessageKey
  lost: MessageKey
  // See-through background, for OBS.
  transparent: boolean
}

const IDLE_CURSOR_MS = 2000
const BLACK: OutputState = { black: 1, flash: 0, freeze: false }
const NO_OVERLAY: OverlayData = { trackId: null, title: '', artist: '', lyrics: null, time: 0, logo: null }

export function startView(o: ViewOptions): void {
  const lang = detectLang(navigator.languages)
  document.title = translate(lang, o.title)
  document.documentElement.lang = lang

  const background = o.transparent ? 'transparent' : '#000'
  const style = document.createElement('style')
  style.textContent = `
html, body { margin: 0; height: 100%; background: ${background}; overflow: hidden; }
canvas { display: block; width: 100vw; height: 100vh; object-fit: contain; }
body.idle { cursor: none; }
.lost { position: fixed; inset: auto 0 24px; text-align: center; color: #7b86a5; font: 14px system-ui, sans-serif; }
`
  document.head.append(style)
  const root = document.getElementById('root')!
  const canvas = document.createElement('canvas')
  const lost = document.createElement('p')
  lost.className = 'lost'
  lost.textContent = translate(lang, o.lost)
  lost.hidden = true
  root.append(canvas, lost)

  let scene: SceneState = o.bridge()?.scene() ?? defaultScene()
  let shaders: readonly UserShader[] | null = null
  let visual: VisualSource | null = null
  // Null until the first frame, so the first state always shows.
  let connected: boolean | null = null

  // Brings this page up to date with the bridge; called first thing in every frame.
  function sync(b: ViewBridge): void {
    if (!connected) b.attach?.(window)
    const list = b.shaders()
    if (list !== shaders) {
      shaders = list
      const defs: VisualDef[] = []
      for (const u of list) {
        try {
          defs.push(userVisual(u))
        } catch {
          // Not offered in the main window either.
        }
      }
      setUserVisuals(defs)
    }
    const v = b.visual()
    if (v !== visual) {
      visual = v
      setVisualSource(v)
    }
    scene = b.scene()
    renderer.setFixedSize(b.size())
  }

  function setConnected(on: boolean): void {
    if (on === connected) return
    connected = on
    lost.hidden = on
    if (!on) {
      visual = null
      setVisualSource(null)
    }
  }

  const renderer = new Renderer(
    () => scene,
    () => {
      let b = o.bridge()
      try {
        if (b) sync(b)
      } catch {
        // The main window is going away.
        b = null
      }
      setConnected(!!b)
      return b ? b.frame() : null
    },
  )
  renderer.transparent = o.transparent
  renderer.output = (_now, frame) => o.bridge()?.output(frame) ?? BLACK
  renderer.controls = (id) => o.bridge()?.control(id) ?? 0
  renderer.overlaySource = () => o.bridge()?.overlay() ?? NO_OVERLAY
  renderer.attach(canvas)

  const resize = () => renderer.resize(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1)
  window.addEventListener('resize', resize)
  resize()

  // Double click for full screen; keys go to the main window's shortcuts.
  canvas.addEventListener('dblclick', () => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void document.documentElement.requestFullscreen?.()
  })
  window.addEventListener('keydown', (e) => {
    const combo = keyCombo(e)
    if (!combo || combo === 'Escape') return
    e.preventDefault()
    o.bridge()?.key(combo)
  })

  let idle = 0
  window.addEventListener('pointermove', () => {
    document.body.classList.remove('idle')
    clearTimeout(idle)
    idle = window.setTimeout(() => document.body.classList.add('idle'), IDLE_CURSOR_MS)
  })
}
