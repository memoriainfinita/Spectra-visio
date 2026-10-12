import { ChevronLeft, ChevronRight, EyeOff, Maximize, Minimize, Pause, Play, SkipForward } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { inputs, player, renderer } from '../app/engine'
import { stepVisual } from '../app/gestures'
import { liveStore, toggleLive } from '../app/live'
import { outputStore } from '../app/output'
import { settingsStore } from '../app/settings'
import { transport } from '../app/transport'
import { useStore } from './useStore'
import { useT } from './useT'

// Touch: a swipe changes the visualization, a tap shows the big controls, a double tap
// toggles full screen.
const SWIPE_PX = 60
const SWIPE_MS = 800
const TAP_PX = 10
const TAP_MS = 300
const BAR_MS = 4000

// The output canvas. Double-click or the button toggles full screen.
export function Stage() {
  const t = useT()
  const status = useStore(renderer.status)
  const paused = useStore(outputStore, (s) => s.open && !s.preview)
  const showFps = useStore(settingsStore, (s) => s.performance.showFps)
  const playerPlaying = useStore(player.state, (s) => s.status === 'playing')
  const streamPlaying = useStore(inputs.state, (s) => s.kind === 'stream' && (s.status === 'active' || s.status === 'connecting'))
  const streamSource = useStore(inputs.state, (s) => s.kind === 'stream' && s.status !== 'idle')
  const playing = streamSource ? streamPlaying : playerPlaying
  const blackout = useStore(liveStore, (s) => s.blackout)
  const box = useRef<HTMLElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [full, setFull] = useState(false)
  const [bar, setBar] = useState(false)
  const touch = useRef<{ x: number; y: number; t: number } | null>(null)
  const lastTap = useRef(0)
  const lastTouch = useRef(0)
  const tapTimer = useRef(0)
  const barTimer = useRef(0)

  useEffect(() => {
    const el = canvas.current
    if (!el) return
    renderer.attach(el)
    const observer = new ResizeObserver(() => {
      const r = el.getBoundingClientRect()
      renderer.resize(r.width, r.height, window.devicePixelRatio || 1)
    })
    observer.observe(el)
    return () => {
      observer.disconnect()
      renderer.detach()
    }
  }, [])

  useEffect(() => {
    const onChange = () => setFull(document.fullscreenElement === box.current)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  useEffect(
    () => () => {
      clearTimeout(tapTimer.current)
      clearTimeout(barTimer.current)
    },
    [],
  )

  const toggle = () => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void box.current?.requestFullscreen?.()
  }

  // Shows the touch bar, hidden again after a while without use.
  const showBar = () => {
    setBar(true)
    clearTimeout(barTimer.current)
    barTimer.current = window.setTimeout(() => setBar(false), BAR_MS)
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== 'touch' || !e.isPrimary) return
    lastTouch.current = performance.now()
    touch.current = { x: e.clientX, y: e.clientY, t: e.timeStamp }
  }

  const onPointerUp = (e: React.PointerEvent) => {
    const start = touch.current
    touch.current = null
    if (e.pointerType !== 'touch' || !start || (e.target as Element).closest('button')) return
    lastTouch.current = performance.now()
    const dx = e.clientX - start.x
    const dy = e.clientY - start.y
    const dt = e.timeStamp - start.t
    if (Math.abs(dx) >= SWIPE_PX && Math.abs(dx) > 2 * Math.abs(dy) && dt < SWIPE_MS) {
      stepVisual(dx < 0 ? 1 : -1)
      return
    }
    if (Math.hypot(dx, dy) > TAP_PX || dt > TAP_MS) return
    const now = performance.now()
    if (now - lastTap.current < TAP_MS) {
      clearTimeout(tapTimer.current)
      lastTap.current = 0
      toggle()
      return
    }
    lastTap.current = now
    tapTimer.current = window.setTimeout(() => (bar ? setBar(false) : showBar()), TAP_MS)
  }

  // Touch double taps are handled above; some browsers also send dblclick for them.
  const onDoubleClick = () => {
    if (performance.now() - lastTouch.current > 1000) toggle()
  }

  const barButton = (label: string, icon: React.ReactNode, action: () => void, pressed?: boolean) => (
    <button
      className={`icon-btn touch-btn${pressed ? ' on' : ''}`}
      title={label}
      aria-label={label}
      aria-pressed={pressed}
      onClick={() => {
        action()
        showBar()
      }}
    >
      {icon}
    </button>
  )

  return (
    <section ref={box} className={`stage${full ? ' full' : ''}${bar ? ' touching' : ''}`} onDoubleClick={onDoubleClick} onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={() => (touch.current = null)}>
      <canvas ref={canvas} />
      {paused && <p className="stage-error">{t('stage.paused')}</p>}
      {status.error && <p className="stage-error">{status.error === 'noWebgl' ? t('stage.noWebgl') : t('stage.error', { msg: status.error })}</p>}
      {bar && (
        <div className="touch-bar">
          {barButton(t('stage.previousVisual'), <ChevronLeft size={26} />, () => stepVisual(-1))}
          {barButton(playing ? t('player.pause') : t('player.play'), playing ? <Pause size={26} /> : <Play size={26} />, () => transport.toggle())}
          {barButton(t('player.next'), <SkipForward size={26} />, () => transport.next())}
          {barButton(t('live.blackout'), <EyeOff size={26} />, () => toggleLive('blackout'), blackout)}
          {barButton(t('stage.nextVisual'), <ChevronRight size={26} />, () => stepVisual(1))}
        </div>
      )}
      <div className="stage-bar">
        {showFps && (
          <span className="mono">
            {t('stage.fps', { n: status.fps })}
            {status.scale < 1 && ` · ${Math.round(status.scale * 100)} %`}
          </span>
        )}
        <button className="icon-btn small" title={full ? t('stage.exitFullscreen') : t('stage.fullscreen')} aria-label={full ? t('stage.exitFullscreen') : t('stage.fullscreen')} onClick={toggle}>
          {full ? <Minimize size={16} /> : <Maximize size={16} />}
        </button>
      </div>
    </section>
  )
}
