import { useEffect, useState } from 'react'
import { addPicked, player } from '../app/engine'
import { fromDrop } from '../engine/player/pick'
import { useStore } from './useStore'

// Playback position, refreshed every frame while playing and on state changes otherwise.
export function usePosition(): number {
  const state = useStore(player.state)
  const [position, setPosition] = useState(() => player.position())
  useEffect(() => {
    setPosition(player.position())
    if (state.status !== 'playing') return
    let raf = 0
    const tick = () => {
      setPosition(player.position())
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [state])
  return position
}

const SEEK_STEP = 5

const ARROWS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']

// Whether the focused control uses this key itself: text fields and selects use every key,
// checkboxes Space, sliders the arrows. Anything else is left to the player shortcuts.
function ownsKey(target: EventTarget | null, key: string): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true
  if (!(target instanceof HTMLInputElement)) return false
  if (target.type === 'checkbox' || target.type === 'radio') return key === ' '
  if (target.type === 'range') return ARROWS.includes(key)
  return true
}

export function usePlayerShortcuts(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || ownsKey(e.target, e.key)) return
      if (e.key === ' ') player.toggle()
      else if (e.key === 'ArrowRight' && e.shiftKey) player.next()
      else if (e.key === 'ArrowLeft' && e.shiftKey) player.previous()
      else if (e.key === 'ArrowRight') player.seek(player.position() + SEEK_STEP)
      else if (e.key === 'ArrowLeft') player.seek(player.position() - SEEK_STEP)
      else return
      e.preventDefault()
      // A focused button would also be clicked by the Space keyup.
      if (document.activeElement instanceof HTMLButtonElement) document.activeElement.blur()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])
}

// True while files are dragged over the window; dropping adds them to the queue.
export function useFileDrop(): boolean {
  const [over, setOver] = useState(false)
  useEffect(() => {
    let depth = 0
    const hasFiles = (e: DragEvent) => !!e.dataTransfer?.types.includes('Files')
    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return
      depth++
      setOver(true)
    }
    const leave = (e: DragEvent) => {
      if (!hasFiles(e)) return
      depth = Math.max(0, depth - 1)
      if (depth === 0) setOver(false)
    }
    const overHandler = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault()
    }
    const drop = (e: DragEvent) => {
      if (!hasFiles(e) || !e.dataTransfer) return
      e.preventDefault()
      depth = 0
      setOver(false)
      void fromDrop(e.dataTransfer).then(addPicked)
    }
    window.addEventListener('dragenter', enter)
    window.addEventListener('dragleave', leave)
    window.addEventListener('dragover', overHandler)
    window.addEventListener('drop', drop)
    return () => {
      window.removeEventListener('dragenter', enter)
      window.removeEventListener('dragleave', leave)
      window.removeEventListener('dragover', overHandler)
      window.removeEventListener('drop', drop)
    }
  }, [])
  return over
}
