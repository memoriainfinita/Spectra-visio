import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'

// A button that opens a box under it. The box stays mounted while closed, so what is
// inside keeps its state; Escape or a press outside closes it.
export function Popover({
  label,
  button,
  title,
  buttonLabel,
  buttonClass = 'btn',
  className = '',
  align = 'start',
  floating = false,
  children,
}: {
  label: string
  button: ReactNode
  title?: string
  // For a button that shows only an icon.
  buttonLabel?: string
  buttonClass?: string
  className?: string
  align?: 'start' | 'end'
  // Fixed to the window, under the button or above it, so a dock that scrolls does not
  // cut it off.
  floating?: boolean
  children: ReactNode | ((close: () => void) => ReactNode)
}) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const body = useRef<HTMLDivElement>(null)
  const [place, setPlace] = useState<CSSProperties | undefined>(undefined)

  useLayoutEffect(() => {
    const b = trigger.current
    const el = body.current
    if (!open || !floating || !b || !el) return
    const r = b.getBoundingClientRect()
    const h = el.offsetHeight
    const w = el.offsetWidth
    const below = r.bottom + 6 + h <= innerHeight - 8 || r.top - 6 - h < 8
    setPlace({
      position: 'fixed',
      left: Math.max(8, Math.min(align === 'end' ? r.right - w : r.left, innerWidth - w - 8)),
      top: below ? Math.min(r.bottom + 6, innerHeight - h - 8) : r.top - 6 - h,
      right: 'auto',
    })
  }, [open, floating, align])

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      trigger.current?.focus()
    }
    // Floating, it would stay behind when what holds the button scrolls.
    const onScroll = (e: Event) => {
      if (floating && !box.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    document.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('scroll', onScroll, true)
    }
  }, [open, floating])

  const close = () => setOpen(false)
  return (
    <div ref={box} className={`pop ${className}`}>
      <button ref={trigger} className={`${buttonClass} pop-button${open ? ' on' : ''}`} title={title} aria-label={buttonLabel} aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen((o) => !o)}>
        {button}
      </button>
      <div ref={body} className={`pop-body pop-${align}`} style={floating && open ? place : undefined} role="dialog" aria-label={label} hidden={!open} data-reveal="">
        {typeof children === 'function' ? children(close) : children}
      </div>
    </div>
  )
}
