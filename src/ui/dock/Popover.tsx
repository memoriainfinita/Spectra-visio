import { useEffect, useRef, useState, type ReactNode } from 'react'

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
  children: ReactNode | ((close: () => void) => ReactNode)
}) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)

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
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const close = () => setOpen(false)
  return (
    <div ref={box} className={`pop ${className}`}>
      <button ref={trigger} className={`${buttonClass} pop-button${open ? ' on' : ''}`} title={title} aria-label={buttonLabel} aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen((o) => !o)}>
        {button}
      </button>
      <div className={`pop-body pop-${align}`} role="dialog" aria-label={label} hidden={!open} data-reveal="">
        {typeof children === 'function' ? children(close) : children}
      </div>
    </div>
  )
}
