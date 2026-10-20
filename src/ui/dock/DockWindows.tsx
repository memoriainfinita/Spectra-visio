import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { dockUi } from '../../app/layout'
import type { DockId } from '../../engine/layout/layout'
import { onShortcutKey } from '../hooks'
import { useStore } from '../useStore'
import { DockBody } from './DockBody'

// A dock can go to a window of its own, for a second screen. The window is opened right
// in the click or the drop that asks for it, or the browser blocks it. The dock keeps its
// place in the layout and comes back there when its window closes.

const open = new Map<DockId, Window>()

// Copies the app's styles, so the dock looks the same there.
function prepare(w: Window, title: string): HTMLElement {
  const doc = w.document
  doc.title = title
  doc.documentElement.lang = document.documentElement.lang
  for (const el of document.querySelectorAll('style, link[rel="stylesheet"]')) {
    const copy = doc.importNode(el, true) as HTMLElement
    if (copy instanceof HTMLLinkElement) copy.href = (el as HTMLLinkElement).href
    doc.head.appendChild(copy)
  }
  doc.body.className = 'dock-window-body'
  const root = doc.createElement('div')
  root.className = 'dock-window'
  doc.body.appendChild(root)
  return root
}

const roots = new Map<DockId, HTMLElement>()

// False when the browser blocked the window.
export function popOut(dock: DockId, title: string): boolean {
  const existing = open.get(dock)
  if (existing && !existing.closed) {
    existing.focus()
    return true
  }
  const w = window.open('', `spectravisio-dock-${dock}`, 'popup,width=460,height=760')
  if (!w) return false
  open.set(dock, w)
  roots.set(dock, prepare(w, title))
  // The live shortcuts work there too.
  w.document.addEventListener('keydown', onShortcutKey)
  // The dock comes back when its window closes, by the user or with the app.
  w.addEventListener('pagehide', () => bringBack(dock))
  dockUi.set((u) => (u.windows.includes(dock) ? u : { ...u, windows: [...u.windows, dock] }))
  return true
}

export function bringBack(dock: DockId): void {
  const w = open.get(dock)
  open.delete(dock)
  roots.delete(dock)
  dockUi.set((u) => ({ ...u, windows: u.windows.filter((d) => d !== dock) }))
  if (w && !w.closed) w.close()
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => {
    for (const w of open.values()) w.close()
  })
}

// The docks in windows of their own, rendered there.
export function DockWindows() {
  const windows = useStore(dockUi, (u) => u.windows)
  return (
    <>
      {windows.map((d) => (
        <DockWindow key={d} dock={d} />
      ))}
    </>
  )
}

function DockWindow({ dock }: { dock: DockId }) {
  const [root] = useState(() => roots.get(dock) ?? null)
  // No window to show it in (the app reloaded this module): the dock goes back.
  useEffect(() => {
    if (!root) bringBack(dock)
  }, [root, dock])
  return root ? createPortal(<DockBody id={dock} />, root) : null
}
