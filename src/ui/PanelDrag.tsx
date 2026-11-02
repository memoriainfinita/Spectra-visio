import { useEffect } from 'react'
import { panelDragStore, panelEditStore, setPanelCell, swapPanelCells } from '../app/panel'
import { sceneStore } from '../app/scene'
import type { PanelControl } from '../engine/scene/panel'
import { controlName } from './MyPanel'
import { useStore } from './useStore'
import { useT } from './useT'

// While My panel is being edited and shows, any control that has its right-click menu (a
// parameter, an opacity, the crossfader, an action button, a knob) is picked up with the
// pointer and put down on a cell. Those controls do not act meanwhile, so a slider is not
// moved by the grab. One listener on the document: the controls only say what they are,
// with `data-control`. A filled cell of the panel is picked up the same way, and put down on
// another it swaps places with it; let go outside the panel, it comes off.

const gridShown = () => (document.querySelector('.mypanel-grid')?.getClientRects().length ?? 0) > 0

function controlOf(el: EventTarget | null): PanelControl | null {
  const holder = el instanceof Element ? el.closest<HTMLElement>('[data-control]') : null
  if (!holder || holder.closest('.mypanel')) return null
  try {
    const c = JSON.parse(holder.dataset.control ?? '')
    return c && typeof c.kind === 'string' ? (c as PanelControl) : null
  } catch {
    return null
  }
}

// A filled cell of My panel, but not its remove button or an empty cell's list.
function cellPick(el: EventTarget | null): { index: number; control: PanelControl } | null {
  if (!(el instanceof Element) || el.closest('.mypanel-tools, .mypanel-pick')) return null
  const index = Number(el.closest<HTMLElement>('.mypanel-cell')?.dataset.cell)
  const control = Number.isInteger(index) ? sceneStore.get().panel[index] : null
  return control ? { index, control } : null
}

function inGrid(x: number, y: number): boolean {
  const r = document.querySelector('.mypanel-grid')?.getBoundingClientRect()
  return !!r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom
}

function cellAt(x: number, y: number): number | null {
  const n = Number(document.elementFromPoint(x, y)?.closest<HTMLElement>('.mypanel-cell')?.dataset.cell)
  return Number.isInteger(n) ? n : null
}

export function PanelDrag() {
  const t = useT()
  const editing = useStore(panelEditStore)
  const drag = useStore(panelDragStore)

  useEffect(() => {
    if (!editing) return
    const body = document.body
    const sync = () => body.classList.toggle('panel-editing', gridShown())
    sync()
    const timer = setInterval(sync, 300)
    const armed = () => body.classList.contains('panel-editing')
    const down = (e: PointerEvent) => {
      if (e.button !== 0 || !armed()) return
      const cell = cellPick(e.target)
      const control = cell?.control ?? controlOf(e.target)
      if (!control) return
      e.preventDefault()
      e.stopPropagation()
      panelDragStore.set({ control, from: cell?.index ?? null, label: controlName(sceneStore.get(), control, t), x: e.clientX, y: e.clientY, over: null, removing: false })
    }
    const move = (e: PointerEvent) => {
      if (panelDragStore.get()) panelDragStore.set((d) => d && { ...d, x: e.clientX, y: e.clientY, over: cellAt(e.clientX, e.clientY), removing: d.from !== null && !inGrid(e.clientX, e.clientY) })
    }
    const up = (e: PointerEvent) => {
      const d = panelDragStore.get()
      if (!d) return
      panelDragStore.set(null)
      const i = cellAt(e.clientX, e.clientY)
      if (i === null) {
        if (d.from !== null && !inGrid(e.clientX, e.clientY)) setPanelCell(d.from, null)
        return
      }
      if (d.from === null) setPanelCell(i, d.control)
      else swapPanelCells(d.from, i)
    }
    const cancel = () => panelDragStore.set(null)
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && panelDragStore.get()) {
        e.stopPropagation()
        cancel()
      }
    }
    // The press and the click of a picked control do nothing.
    const swallow = (e: Event) => {
      if (armed() && (cellPick(e.target) || controlOf(e.target))) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    document.addEventListener('pointerdown', down, true)
    document.addEventListener('pointermove', move, true)
    document.addEventListener('pointerup', up, true)
    document.addEventListener('pointercancel', cancel, true)
    document.addEventListener('keydown', esc, true)
    document.addEventListener('mousedown', swallow, true)
    document.addEventListener('click', swallow, true)
    return () => {
      clearInterval(timer)
      body.classList.remove('panel-editing')
      panelDragStore.set(null)
      document.removeEventListener('pointerdown', down, true)
      document.removeEventListener('pointermove', move, true)
      document.removeEventListener('pointerup', up, true)
      document.removeEventListener('pointercancel', cancel, true)
      document.removeEventListener('keydown', esc, true)
      document.removeEventListener('mousedown', swallow, true)
      document.removeEventListener('click', swallow, true)
    }
  }, [editing, t])

  return drag ? (
    <div className={`panel-ghost${drag.removing ? ' removing' : ''}`} aria-hidden="true" style={{ left: drag.x + 12, top: drag.y + 12 }}>
      {drag.label}
    </div>
  ) : null
}
