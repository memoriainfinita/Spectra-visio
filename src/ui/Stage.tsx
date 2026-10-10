import { Maximize, Minimize } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { renderer } from '../app/engine'
import { useStore } from './useStore'
import { useT } from './useT'

// The output canvas. Double-click or the button toggles full screen.
export function Stage() {
  const t = useT()
  const status = useStore(renderer.status)
  const box = useRef<HTMLElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [full, setFull] = useState(false)

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

  const toggle = () => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void box.current?.requestFullscreen?.()
  }

  return (
    <section ref={box} className={`stage${full ? ' full' : ''}`} onDoubleClick={toggle}>
      <canvas ref={canvas} />
      {status.error && <p className="stage-error">{status.error === 'noWebgl' ? t('stage.noWebgl') : t('stage.error', { msg: status.error })}</p>}
      <div className="stage-bar">
        <span className="mono">{t('stage.fps', { n: status.fps })}</span>
        <button className="icon-btn small" title={full ? t('stage.exitFullscreen') : t('stage.fullscreen')} aria-label={full ? t('stage.exitFullscreen') : t('stage.fullscreen')} onClick={toggle}>
          {full ? <Minimize size={16} /> : <Maximize size={16} />}
        </button>
      </div>
    </section>
  )
}
