import { useEffect, useLayoutEffect, useState, type KeyboardEvent, type MouseEvent, type RefObject } from 'react'
import type { Store } from '../core/store'

// What the right-click menus share: where they open, in which window (a dock can have one
// of its own), and closing on a press outside or a resize.

export interface MenuPlace {
  x: number
  y: number
  // The document of the control that opened it; the menu is drawn there.
  doc: Document
  // Where focus goes back on close.
  from: HTMLElement | null
}

// Right click, and the menu key or Shift+F10, which not every browser turns into a context
// menu. `onMenuKey` says whether it opened, for handlers that do more with keys.
export function menuHandlers<M extends MenuPlace>(store: Store<M | null>, extra: Omit<M, keyof MenuPlace>) {
  const openAt = (el: HTMLElement, x: number, y: number) => store.set({ ...extra, x, y, doc: el.ownerDocument, from: el.ownerDocument.activeElement as HTMLElement | null } as M)
  return {
    onContextMenu: (e: MouseEvent<HTMLElement>) => {
      e.preventDefault()
      const r = e.currentTarget.getBoundingClientRect()
      // A context menu from the keyboard has no pointer: under the control.
      if (e.clientX === 0 && e.clientY === 0) openAt(e.currentTarget, r.left, r.bottom)
      else openAt(e.currentTarget, e.clientX, e.clientY)
    },
    onMenuKey: (e: KeyboardEvent<HTMLElement>): boolean => {
      if (e.key !== 'ContextMenu' && !(e.shiftKey && e.key === 'F10')) return false
      e.preventDefault()
      const el = e.target as HTMLElement
      const r = el.getBoundingClientRect()
      openAt(el, r.left, r.bottom)
      return true
    },
  }
}

// Keeps the open menu inside its window and focuses its first item (again when `refresh`
// changes); closes it on a press outside or a resize of that window.
export function useMenuBox(menu: MenuPlace | null, box: RefObject<HTMLDivElement | null>, close: (refocus?: boolean) => void, refresh?: unknown) {
  const [pos, setPos] = useState({ x: 0, y: 0 })

  useLayoutEffect(() => {
    const el = box.current
    if (!menu || !el) return
    const view = menu.doc.defaultView ?? window
    const r = el.getBoundingClientRect()
    setPos({ x: Math.max(4, Math.min(menu.x, view.innerWidth - r.width - 4)), y: Math.max(4, Math.min(menu.y, view.innerHeight - r.height - 4)) })
    el.querySelector<HTMLElement>('input, [role^=menuitem]')?.focus()
  }, [menu, refresh])

  useEffect(() => {
    if (!menu) return
    const view = menu.doc.defaultView ?? window
    const onDown = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) close(false)
    }
    const onResize = () => close(false)
    menu.doc.addEventListener('pointerdown', onDown)
    view.addEventListener('resize', onResize)
    return () => {
      menu.doc.removeEventListener('pointerdown', onDown)
      view.removeEventListener('resize', onResize)
    }
  }, [menu])

  return pos
}
