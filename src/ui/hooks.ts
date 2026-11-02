import { useEffect, useState } from 'react'
import { addPicked, player } from '../app/engine'
import { redo, undo } from '../app/history'
import { runAction } from '../app/live'
import { notify } from '../app/notices'
import { searchStore } from '../app/ui'
import { settingsStore } from '../app/settings'
import { actionForKey, keyCombo } from '../engine/live/live'
import { fromDrop } from '../engine/player/pick'
import { translate } from '../i18n'
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

const ARROWS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']

// Whether the focused control uses this key itself: text fields and selects use every key,
// checkboxes Space, sliders the arrows. Anything else is left to the player shortcuts.
// By tag name, not instanceof: a dock in a window of its own has elements of that window.
function ownsKey(target: EventTarget | null, key: string): boolean {
  const el = target as HTMLElement | null
  if (!el || el.nodeType !== 1) return false
  const tag = el.tagName
  if (el.isContentEditable || tag === 'TEXTAREA' || tag === 'SELECT') return true
  // Drawn sliders, such as the knobs.
  if (el.getAttribute('role') === 'slider') return ARROWS.includes(key)
  if (tag !== 'INPUT') return false
  const type = (el as HTMLInputElement).type
  if (type === 'checkbox' || type === 'radio') return key === ' '
  if (type === 'range') return ARROWS.includes(key)
  return true
}

// The live shortcuts, for the app's document and for those of docks in windows of their own.
export function onShortcutKey(e: KeyboardEvent): void {
  // A key being captured for a shortcut, or one a focused control uses.
  if (e.defaultPrevented) return
  // Ctrl K opens the search, also from a text field.
  if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    searchStore.set(true)
    return
  }
  if (ownsKey(e.target, e.key)) return
  if (undoKey(e)) return
  const combo = keyCombo(e)
  const action = combo && actionForKey(settingsStore.get().live.keys, combo)
  if (!action) return
  runAction(action)
  e.preventDefault()
  // A focused button would also be clicked by the Space keyup.
  const focused = (e.target as Node | null)?.ownerDocument?.activeElement as HTMLElement | null | undefined
  if (focused?.tagName === 'BUTTON') focused.blur()
}

// Ctrl Z undoes, Ctrl Shift Z and Ctrl Y redo (Cmd on a Mac). Text fields keep their own.
function undoKey(e: KeyboardEvent): boolean {
  if (!(e.ctrlKey || e.metaKey) || e.altKey) return false
  const k = e.key.toLowerCase()
  const back = k === 'z' && !e.shiftKey
  const again = (k === 'z' && e.shiftKey) || (k === 'y' && !e.shiftKey)
  if (!back && !again) return false
  e.preventDefault()
  const lang = settingsStore.get().lang
  const went = back ? undo() : redo()
  if (!went) notify(translate(lang, back ? 'history.nothingToUndo' : 'history.nothingToRedo'))
  else if (!went.change) notify(translate(lang, back ? 'history.undone' : 'history.redone'))
  else {
    const { area, layer } = went.change
    notify(translate(lang, back ? 'history.undoneWhat' : 'history.redoneWhat', { what: translate(lang, `history.what.${area}`, { n: layer ?? 0 }) }))
  }
  return true
}

export function usePlayerShortcuts(): void {
  useEffect(() => {
    document.addEventListener('keydown', onShortcutKey)
    return () => document.removeEventListener('keydown', onShortcutKey)
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
