import { useRef, type KeyboardEvent, type PointerEvent } from 'react'
import { setModDest, toggleModDest } from '../app/modulators'
import { MAP_AMOUNT, destIndex, type ModTarget, type SharedModulator } from '../engine/modulation/shared'

const clamp = (v: number) => Math.max(-1, Math.min(1, v))
const KEY_STEP = 0.05
// Pointer travel that is a click and not a drag, in pixels.
const DRAG_FROM = 4

interface Drag {
  x: number
  from: number
  width: number
  moved: boolean
}

// Covers a parameter while a modulator maps. A click puts the modulator on it or takes it
// off; dragging sideways sets the amount (the full width is the whole range, left is
// negative), and the arrows do the same from the keyboard once it is there.
export function MapTarget({ mod, target, label }: { mod: SharedModulator; target: ModTarget; label: string }) {
  const drag = useRef<Drag | null>(null)
  // The click that ends a drag is not a toggle.
  const dragged = useRef(false)
  const i = destIndex(mod, target)
  const on = i >= 0
  const amount = on ? mod.dests[i].amount : null

  const down = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { x: e.clientX, from: amount ?? MAP_AMOUNT, width: Math.max(60, e.currentTarget.getBoundingClientRect().width), moved: false }
  }
  const move = (e: PointerEvent<HTMLButtonElement>) => {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.x
    if (!d.moved && Math.abs(dx) < DRAG_FROM) return
    d.moved = true
    setModDest(mod.id, target, clamp(d.from + dx / d.width))
  }
  const up = () => {
    dragged.current = drag.current?.moved ?? false
    drag.current = null
  }
  const key = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (amount === null || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return
    e.preventDefault()
    setModDest(mod.id, target, clamp(amount + (e.key === 'ArrowRight' ? KEY_STEP : -KEY_STEP)))
  }

  return (
    <button
      className="map-target"
      aria-pressed={on}
      aria-label={label}
      title={amount === null ? label : `${label} · ${amount > 0 ? '+' : ''}${Math.round(amount * 100)} %`}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onKeyDown={key}
      onClick={() => {
        if (dragged.current) dragged.current = false
        else toggleModDest(mod.id, target)
      }}
    />
  )
}
