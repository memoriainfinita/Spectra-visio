import { MoreHorizontal } from 'lucide-react'
import { useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { addDock, dockUi, moveDock, removeDock, selectTab, setDragging, setEditing, setZoneWidth } from '../../app/layout'
import { DOCKS, WIDTH_MAX, WIDTH_MIN, clampWidth, docksOf, type DockId, type DropTarget, type Layout, type Side, type ZoneId } from '../../engine/layout/layout'
import { useStore } from '../useStore'
import { useT } from '../useT'
import { DockBody } from './DockBody'
import { bringBack, popOut } from './DockWindows'
import { Popover } from './Popover'

type T = ReturnType<typeof useT>
export const dockName = (t: T, id: DockId) => t(`dock.${id}`)

const DRAG_PX = 5

// The zones around the stage. `widths` overrides the layout's while a zone is resized.
export function zoneGrid(layout: Layout, editing: boolean, widths: Record<Side, number>): CSSProperties {
  const left = layout.zones.left.length > 0 || editing
  const right = layout.zones.right.length > 0 || editing
  const cols = [left ? `${widths.left}px` : '', 'minmax(0, 1fr)', right ? `${widths.right}px` : ''].filter(Boolean)
  const areas = [left ? 'left' : '', 'center', right ? 'right' : ''].filter(Boolean)
  return { gridTemplateColumns: cols.join(' '), gridTemplateAreas: `"${areas.join(' ')}"` }
}

// Where a pointer is over a drop area, if anywhere.
function targetAt(x: number, y: number): DropTarget | 'window' | null {
  const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-drop]')
  if (!el) return null
  const raw = el.dataset.drop!
  return raw === 'window' ? 'window' : (JSON.parse(raw) as DropTarget)
}

// Dragging a dock by its tab, only while the layout is being edited. The tab follows the
// pointer as a ghost; Escape drops nothing.
function startDrag(e: ReactPointerEvent, dock: DockId, label: string, onWindow: (dock: DockId) => void): void {
  if (e.button !== 0 || !e.isPrimary) return
  const x0 = e.clientX
  const y0 = e.clientY
  let ghost: HTMLElement | null = null
  let over: HTMLElement | null = null

  const mark = (x: number, y: number) => {
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-drop]') ?? null
    if (el === over) return
    over?.classList.remove('over')
    el?.classList.add('over')
    over = el
  }
  const finish = () => {
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    window.removeEventListener('pointercancel', onCancel)
    window.removeEventListener('keydown', onKey, true)
    over?.classList.remove('over')
    ghost?.remove()
    setDragging(null)
  }
  const onMove = (ev: PointerEvent) => {
    if (!ghost) {
      if (Math.hypot(ev.clientX - x0, ev.clientY - y0) < DRAG_PX) return
      ghost = document.createElement('div')
      ghost.className = 'dock-ghost'
      ghost.textContent = label
      document.body.appendChild(ghost)
      setDragging(dock)
    }
    ghost.style.transform = `translate(${ev.clientX + 12}px, ${ev.clientY + 12}px)`
    mark(ev.clientX, ev.clientY)
  }
  const onUp = (ev: PointerEvent) => {
    const dragged = ghost !== null
    finish()
    if (!dragged) return
    const target = targetAt(ev.clientX, ev.clientY)
    if (target === 'window') onWindow(dock)
    else if (target) moveDock(dock, target)
  }
  const onCancel = () => finish()
  const onKey = (ev: globalThis.KeyboardEvent) => {
    if (ev.key !== 'Escape') return
    ev.stopPropagation()
    finish()
  }
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
  window.addEventListener('pointercancel', onCancel)
  window.addEventListener('keydown', onKey, true)
}

function DropArea({ target, children, className = '' }: { target: DropTarget | 'window'; children: ReactNode; className?: string }) {
  return (
    <div className={`drop-area ${className}`} data-drop={target === 'window' ? 'window' : JSON.stringify(target)}>
      {children}
    </div>
  )
}

export function usePopOut(): (dock: DockId) => void {
  const t = useT()
  return (dock) => {
    if (!popOut(dock, `${dockName(t, dock)} · ${t('app.title')}`)) alertBlocked(t)
  }
}

// A short notice in the app, not a browser dialog.
let blockedTimer = 0
function alertBlocked(t: T): void {
  let el = document.getElementById('dock-blocked')
  if (!el) {
    el = document.createElement('p')
    el.id = 'dock-blocked'
    el.className = 'toast'
    el.setAttribute('role', 'status')
    document.body.appendChild(el)
  }
  el.textContent = t('dock.windowBlocked')
  clearTimeout(blockedTimer)
  blockedTimer = window.setTimeout(() => el?.remove(), 6000)
}

export function Zone({ zone, layout, locked }: { zone: ZoneId; layout: Layout; locked: boolean }) {
  const t = useT()
  const ui = useStore(dockUi)
  const stacks = layout.zones[zone]
  if (!stacks.length && !ui.editing) return null
  const label = zone === 'left' ? t('dock.zoneLeft') : zone === 'right' ? t('dock.zoneRight') : t('dock.zoneStrip')
  return (
    <div className={`dock-zone zone-${zone}${ui.editing ? ' editing' : ''}`} style={{ gridArea: zone === 'strip' ? undefined : zone }} aria-label={label} role="region">
      {stacks.map((s, i) => (
        <DockStack key={i} zone={zone} index={i} tabs={s.tabs} active={s.active} layout={layout} locked={locked} />
      ))}
      {ui.editing && (
        <DropArea target={{ zone, mode: 'end' }} className={stacks.length ? 'end' : 'empty'}>
          {t('dock.dropHere')}
        </DropArea>
      )}
    </div>
  )
}

function DockStack({ zone, index, tabs, active, layout, locked }: { zone: ZoneId; index: number; tabs: DockId[]; active: number; layout: Layout; locked: boolean }) {
  const t = useT()
  const ui = useStore(dockUi)
  const toWindow = usePopOut()
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const shown = tabs[active] ?? tabs[0]

  const pick = (i: number, focus = false) => {
    selectTab(zone, index, i)
    if (focus) refs.current[i]?.focus()
  }
  const onKey = (e: KeyboardEvent) => {
    const to = e.key === 'ArrowRight' ? active + 1 : e.key === 'ArrowLeft' ? active - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : null
    if (to === null) return
    e.preventDefault()
    pick((to + tabs.length) % tabs.length, true)
  }

  return (
    <section className={`dock-stack${ui.dragging ? ' dragging' : ''}`} aria-label={dockName(t, shown)}>
      <div className="dock-head">
        <div className="dock-tabs" role="tablist" aria-label={tabs.map((d) => dockName(t, d)).join(', ')} onKeyDown={onKey}>
          {tabs.map((d, i) => (
            <button
              key={d}
              ref={(el) => {
                refs.current[i] = el
              }}
              id={`docktab-${d}`}
              role="tab"
              className={`dock-tab${i === active ? ' on' : ''}${ui.editing ? ' grab' : ''}`}
              aria-selected={i === active}
              aria-controls={`dock-${d}`}
              tabIndex={i === active ? 0 : -1}
              onClick={() => pick(i)}
              onPointerDown={ui.editing ? (e) => startDrag(e, d, dockName(t, d), toWindow) : undefined}
            >
              {dockName(t, d)}
            </button>
          ))}
        </div>
        <DockMenu dock={shown} zone={zone} index={index} layout={layout} locked={locked} />
      </div>
      {tabs.map((d, i) => (
        <div key={d} id={`dock-${d}`} role="tabpanel" aria-labelledby={`docktab-${d}`} className="dock-body" hidden={i !== active}>
          {ui.windows.includes(d) ? (
            <div className="elsewhere">
              <p className="muted">{t('dock.elsewhere', { name: dockName(t, d) })}</p>
              <button className="btn" onClick={() => bringBack(d)}>
                {t('dock.bringBack')}
              </button>
            </div>
          ) : (
            <DockBody id={d} />
          )}
        </div>
      ))}
      {ui.dragging && (
        <div className="drop-areas">
          <DropArea target={{ zone, stack: index, mode: 'tab' }}>{t('dock.dropTab')}</DropArea>
          <DropArea target={{ zone, stack: index, mode: 'below' }}>{t('dock.dropBelow')}</DropArea>
        </div>
      )}
    </section>
  )
}

// Moving a dock without dragging: the keyboard's way, and a quicker one with the mouse.
function DockMenu({ dock, zone, index, layout, locked }: { dock: DockId; zone: ZoneId; index: number; layout: Layout; locked: boolean }) {
  const t = useT()
  const toWindow = usePopOut()
  const inWindow = useStore(dockUi, (u) => u.windows.includes(dock))
  const side = (z: 'left' | 'right', below: boolean): DropTarget => {
    const n = layout.zones[z].length
    if (!n) return { zone: z, mode: 'end' }
    return below ? { zone: z, stack: n - 1, mode: 'below' } : { zone: z, stack: 0, mode: 'tab' }
  }
  const moves: { label: string; target: DropTarget }[] = [
    { label: t('dock.toLeft'), target: side('left', false) },
    { label: t('dock.toLeftBelow'), target: side('left', true) },
    { label: t('dock.toRight'), target: side('right', false) },
    { label: t('dock.toRightBelow'), target: side('right', true) },
    { label: t('dock.toStrip'), target: { zone: 'strip', mode: 'end' } },
  ]
  const same = (m: DropTarget) => m.mode === 'tab' && m.zone === zone && m.stack === index
  return (
    <Popover
      className="dock-menu"
      align="end"
      label={t('dock.options', { name: dockName(t, dock) })}
      title={t('dock.options', { name: dockName(t, dock) })}
      buttonLabel={t('dock.options', { name: dockName(t, dock) })}
      buttonClass="icon-btn small"
      button={<MoreHorizontal size={16} />}
    >
      {(close) => (
        <div className="menu" role="menu">
          {moves.map((m) => (
            <button
              key={m.label}
              role="menuitem"
              className="menu-item"
              disabled={locked || same(m.target)}
              onClick={() => {
                moveDock(dock, m.target)
                close()
              }}
            >
              {m.label}
            </button>
          ))}
          <button
            role="menuitem"
            className="menu-item"
            disabled={inWindow}
            onClick={() => {
              toWindow(dock)
              close()
            }}
          >
            {t('dock.toWindow')}
          </button>
          <button
            role="menuitem"
            className="menu-item sep"
            disabled={locked}
            onClick={() => {
              removeDock(dock)
              close()
            }}
          >
            {t('dock.remove')}
          </button>
        </div>
      )}
    </Popover>
  )
}

// The bar shown while a layout is edited.
export function EditBar({ layout, name, canReset, onReset }: { layout: Layout; name: string; canReset: boolean; onReset: () => void }) {
  const t = useT()
  const dragging = useStore(dockUi, (u) => u.dragging)
  const missing = DOCKS.filter((d) => !docksOf(layout).includes(d))
  return (
    <div className="edit-bar" role="toolbar" aria-label={t('layout.editing', { name })}>
      <strong>{t('layout.editing', { name })}</strong>
      <span className="muted small">{t('layout.editHint')}</span>
      <div className="edit-actions">
        {dragging && <DropArea target="window" className="window">{t('dock.dropWindow')}</DropArea>}
        <Popover label={t('layout.addDock')} button={t('layout.addDock')} align="end">
          {(close) => (
            <div className="menu" role="menu">
              {missing.length === 0 && <p className="muted small menu-note">{t('layout.noneMissing')}</p>}
              {missing.map((d) => (
                <button
                  key={d}
                  role="menuitem"
                  className="menu-item"
                  onClick={() => {
                    addDock(d)
                    close()
                  }}
                >
                  {dockName(t, d)}
                </button>
              ))}
            </div>
          )}
        </Popover>
        {canReset && (
          <button className="btn" onClick={onReset}>
            {t('layout.reset')}
          </button>
        )}
        <button className="btn primary" onClick={() => setEditing(false)}>
          {t('layout.done')}
        </button>
      </div>
    </div>
  )
}

// The edge of a side zone, dragged to resize it. Arrow keys move it by 16 px.
export function Splitter({ side, width, onLive }: { side: Side; width: number; onLive: (px: number | null) => void }) {
  const t = useT()
  const [drag, setDrag] = useState(false)
  const start = useRef({ x: 0, w: 0 })
  const sign = side === 'left' ? 1 : -1
  return (
    <div
      className={`splitter splitter-${side}${drag ? ' on' : ''}`}
      role="separator"
      aria-orientation="vertical"
      aria-label={side === 'left' ? t('dock.resizeLeft') : t('dock.resizeRight')}
      aria-valuemin={WIDTH_MIN}
      aria-valuemax={WIDTH_MAX}
      aria-valuenow={width}
      tabIndex={0}
      onPointerDown={(e) => {
        if (e.button !== 0) return
        e.currentTarget.setPointerCapture(e.pointerId)
        start.current = { x: e.clientX, w: width }
        setDrag(true)
      }}
      onPointerMove={(e) => {
        if (drag) onLive(clampWidth(start.current.w + sign * (e.clientX - start.current.x)))
      }}
      onPointerUp={(e) => {
        if (!drag) return
        setDrag(false)
        setZoneWidth(side, start.current.w + sign * (e.clientX - start.current.x))
        onLive(null)
      }}
      onPointerCancel={() => {
        setDrag(false)
        onLive(null)
      }}
      onKeyDown={(e) => {
        const step = e.key === 'ArrowRight' ? 16 : e.key === 'ArrowLeft' ? -16 : 0
        if (!step) return
        e.preventDefault()
        setZoneWidth(side, width + sign * step)
      }}
    />
  )
}
