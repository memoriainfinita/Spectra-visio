import { useEffect, useId, useRef, useState } from 'react'
import { useT } from './useT'

const GAP = 6
const MARGIN = 8

// A panel's explanation, always behind a "?" (named "More information" for a screen reader)
// and shown in a bubble: while the mouse is over it, while it has the keyboard's focus, or pinned
// with a click or a tap until the next one, Escape or a press elsewhere. The bubble is
// fixed to the window, so a scrolling dock does not cut it.
export function Hint({ text }: { text: string }) {
  const t = useT()
  const id = useId()
  const button = useRef<HTMLButtonElement>(null)
  const bubble = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState(false)
  const [focus, setFocus] = useState(false)
  const [pinned, setPinned] = useState(false)
  const open = hover || focus || pinned

  // Under the button, or above it when there is no room, always inside the window.
  useEffect(() => {
    const b = button.current
    const tip = bubble.current
    if (!open || !b || !tip) return
    const view = b.ownerDocument.defaultView ?? window
    const place = () => {
      const r = b.getBoundingClientRect()
      const w = tip.offsetWidth
      const h = tip.offsetHeight
      const left = Math.max(MARGIN, Math.min(view.innerWidth - w - MARGIN, r.left))
      const below = r.bottom + GAP
      const top = below + h + MARGIN <= view.innerHeight ? below : Math.max(MARGIN, r.top - GAP - h)
      tip.style.left = `${left}px`
      tip.style.top = `${top}px`
    }
    place()
    // Anything that scrolls would leave the bubble behind: it closes instead.
    const close = () => {
      setHover(false)
      setPinned(false)
      setFocus(false)
    }
    const onDown = (e: PointerEvent) => {
      if (e.target !== b && !b.contains(e.target as Node)) setPinned(false)
    }
    view.addEventListener('resize', place)
    view.addEventListener('scroll', close, true)
    view.document.addEventListener('pointerdown', onDown)
    return () => {
      view.removeEventListener('resize', place)
      view.removeEventListener('scroll', close, true)
      view.document.removeEventListener('pointerdown', onDown)
    }
  }, [open])

  return (
    <div className="hint">
      <button
        ref={button}
        type="button"
        className={`hint-button muted small${open ? ' on' : ''}`}
        aria-label={t('hint.more')}
        aria-describedby={id}
        aria-expanded={open}
        // Hover only where there is one: a touch screen's stray mouse would keep it open.
        onPointerEnter={(e) => e.pointerType === 'mouse' && matchMedia('(hover: hover)').matches && setHover(true)}
        onPointerLeave={(e) => e.pointerType === 'mouse' && setHover(false)}
        // Only the keyboard's focus: a click or a tap pins it instead.
        onFocus={(e) => setFocus(e.currentTarget.matches(':focus-visible'))}
        onBlur={() => {
          setFocus(false)
          setPinned(false)
        }}
        onClick={() => setPinned((p) => !p)}
        onKeyDown={(e) => {
          if (e.key !== 'Escape' || !open) return
          e.stopPropagation()
          setHover(false)
          setFocus(false)
          setPinned(false)
        }}
      >
        <span className="hint-mark" aria-hidden="true">
          ?
        </span>
      </button>
      <div ref={bubble} id={id} role="tooltip" className="hint-bubble" hidden={!open}>
        {text}
      </div>
    </div>
  )
}
