import { MoreHorizontal } from 'lucide-react'
import { Fragment, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { addDock, dockUi, moveDock, removeDock, resetZoneWidth, selectTab, setDragging, setEditing, setStackSizes, setStripHeight, setZoneSizes, setZoneWidth } from '../../app/layout'
import { DOCKS, STRIP_MAX, STRIP_MIN, WIDTH_MAX, WIDTH_MIN, clampWidth, docksOf, type DockId, type DropTarget, type Layout, type Side, type ZoneId } from '../../engine/layout/layout'
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
  // The strip fits its content until it is given a height; then, like the side zones, its
  // stacks share that height.
  const sized = zone !== 'strip' || layout.strip !== null
  const style: CSSProperties = zone === 'strip' ? (layout.strip !== null ? { height: layout.strip } : {}) : { gridArea: zone }
  return (
    <div className={`dock-zone zone-${zone}${sized ? ' sized' : ''}${ui.editing ? ' editing' : ''}`} style={style} aria-label={label} role="region">
      {stacks.map((s, i) => (
        <Fragment key={i}>
          {i > 0 && !locked && <StackSplitter zone={zone} index={i - 1} sizes={[stacks[i - 1].size ?? 1, s.size ?? 1]} fit={!sized} />}
          <DockStack zone={zone} index={i} tabs={s.tabs} active={s.active} size={sized ? (s.size ?? 1) : null} layout={layout} locked={locked} />
        </Fragment>
      ))}
      {/* Where stacks exist, dropping below the last one is the same as at the end. */}
      {ui.editing && !stacks.length && (
        <DropArea target={{ zone, mode: 'end' }} className="empty">
          {t('dock.dropHere')}
        </DropArea>
      )}
    </div>
  )
}

function DockStack({
  zone,
  index,
  tabs,
  active,
  size,
  layout,
  locked,
}: {
  zone: ZoneId
  index: number
  tabs: DockId[]
  active: number
  // Share of the zone's height; null where stacks take the height of their content.
  size: number | null
  layout: Layout
  locked: boolean
}) {
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
    <section className={`dock-stack${ui.dragging ? ' dragging' : ''}`} style={size === null ? undefined : { flexGrow: size }} aria-label={dockName(t, shown)}>
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
        <div className="dock-actions" id={`dock-actions-${shown}`} />
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

// The stage never gets shorter than this when the strip under it grows.
const STAGE_MIN = 160
// No stack gets shorter than this when its neighbour grows.
const STACK_MIN = 80
const STEP = 16

interface Resize {
  move: (delta: number) => void
  end: (delta: number) => void
}

// An edge between two parts, dragged to resize them; the arrow keys move it by 16 px and a
// double click puts the default size back. `begin` measures what it needs when a drag or
// a key press starts, and says how to follow the pointer and what to store at the end.
function Handle({
  axis,
  label,
  now,
  min,
  max,
  className,
  begin,
  onReset,
}: {
  axis: 'x' | 'y'
  label: string
  now: number
  min: number
  max: number
  className: string
  begin: (el: HTMLElement) => Resize
  onReset: () => void
}) {
  const t = useT()
  const [on, setOn] = useState(false)
  const drag = useRef<{ from: number; last: number; resize: Resize } | null>(null)
  const at = (e: ReactPointerEvent) => (axis === 'x' ? e.clientX : e.clientY)
  const stop = (delta: number) => {
    const d = drag.current
    drag.current = null
    setOn(false)
    d?.resize.end(delta)
  }
  return (
    <div
      className={`splitter ${className}${on ? ' on' : ''}`}
      role="separator"
      aria-orientation={axis === 'x' ? 'vertical' : 'horizontal'}
      aria-label={label}
      aria-valuenow={now}
      aria-valuemin={min}
      aria-valuemax={max}
      title={t('dock.resizeHint')}
      tabIndex={0}
      onPointerDown={(e) => {
        if (e.button !== 0) return
        e.preventDefault()
        e.currentTarget.setPointerCapture(e.pointerId)
        drag.current = { from: at(e), last: 0, resize: begin(e.currentTarget) }
        setOn(true)
      }}
      onPointerMove={(e) => {
        const d = drag.current
        if (!d) return
        // A release that never arrived (outside the window): the last position counts.
        if (e.buttons === 0) return stop(d.last)
        d.last = at(e) - d.from
        d.resize.move(d.last)
      }}
      onPointerUp={(e) => stop(drag.current ? at(e) - drag.current.from : 0)}
      onPointerCancel={() => stop(0)}
      onLostPointerCapture={() => stop(drag.current?.last ?? 0)}
      onDoubleClick={onReset}
      onKeyDown={(e) => {
        const back = axis === 'x' ? 'ArrowLeft' : 'ArrowUp'
        const ahead = axis === 'x' ? 'ArrowRight' : 'ArrowDown'
        const step = e.key === ahead ? STEP : e.key === back ? -STEP : 0
        if (!step) return
        e.preventDefault()
        begin(e.currentTarget).end(step)
      }}
    />
  )
}

// The inner edge of a side zone: its width.
export function Splitter({ side, width, onLive }: { side: Side; width: number; onLive: (px: number | null) => void }) {
  const t = useT()
  const sign = side === 'left' ? 1 : -1
  return (
    <Handle
      axis="x"
      className={`splitter-${side}`}
      label={side === 'left' ? t('dock.resizeLeft') : t('dock.resizeRight')}
      now={width}
      min={WIDTH_MIN}
      max={WIDTH_MAX}
      begin={() => ({
        move: (d) => onLive(clampWidth(width + sign * d)),
        end: (d) => {
          onLive(null)
          if (d) setZoneWidth(side, width + sign * d)
        },
      })}
      onReset={() => resetZoneWidth(side)}
    />
  )
}

// Between two stacks of a zone: how they share its height. In a strip that still fits its
// content, the first drag fixes the strip at the height it has, every stack keeping its own.
function StackSplitter({ zone, index, sizes, fit }: { zone: ZoneId; index: number; sizes: [number, number]; fit: boolean }) {
  const t = useT()
  return (
    <Handle
      axis="y"
      className="splitter-row"
      label={t('dock.resizeStacks')}
      now={Math.round((sizes[0] / (sizes[0] + sizes[1])) * 100)}
      min={0}
      max={100}
      begin={(el) => {
        const zoneEl = el.parentElement as HTMLElement
        const stacks = [...zoneEl.children].filter((c): c is HTMLElement => c.classList.contains('dock-stack'))
        const heights = stacks.map((s) => s.getBoundingClientRect().height)
        const total = heights.reduce((a, b) => a + b, 0)
        // Shares from the heights shown, averaging 1.
        const base = heights.map((h) => (h * stacks.length) / total)
        const before = { grow: stacks.map((s) => s.style.flexGrow), height: zoneEl.style.height, sized: zoneEl.classList.contains('sized') }
        const zoneHeight = Math.round(zoneEl.getBoundingClientRect().height)
        if (fit) {
          zoneEl.style.height = `${zoneHeight}px`
          zoneEl.classList.add('sized')
        }
        const pair = heights[index] + heights[index + 1]
        const shares = (d: number): number[] => {
          const h = Math.max(STACK_MIN, Math.min(pair - STACK_MIN, heights[index] + d))
          const next = [...base]
          next[index] = (h * stacks.length) / total
          next[index + 1] = ((pair - h) * stacks.length) / total
          return next
        }
        const show = (list: number[]) => stacks.forEach((s, i) => (s.style.flexGrow = String(list[i])))
        return {
          move: (d) => show(shares(d)),
          end: (d) => {
            if (d) return setZoneSizes(zone, shares(d), fit ? zoneHeight : undefined)
            stacks.forEach((s, i) => (s.style.flexGrow = before.grow[i]))
            zoneEl.style.height = before.height
            if (!before.sized) zoneEl.classList.remove('sized')
          },
        }
      }}
      onReset={() => setStackSizes(zone, index, null, null)}
    />
  )
}

// Between the stage and the strip under it: the strip's height.
export function StripSplitter({ height }: { height: number | null }) {
  const t = useT()
  return (
    <Handle
      axis="y"
      className="splitter-row splitter-strip"
      label={t('dock.resizeStrip')}
      now={height ?? 0}
      min={STRIP_MIN}
      max={STRIP_MAX}
      begin={(el) => {
        const strip = el.nextElementSibling as HTMLElement
        const column = el.parentElement as HTMLElement
        const h0 = strip.getBoundingClientRect().height
        const room = column.clientHeight - STAGE_MIN - 16
        const h = (d: number) => Math.round(Math.max(STRIP_MIN, Math.min(room, h0 - d)))
        return {
          move: (d) => {
            strip.classList.add('sized')
            strip.style.height = `${h(d)}px`
          },
          end: (d) => {
            if (d) return setStripHeight(h(d))
            strip.style.height = height === null ? '' : `${height}px`
            if (height === null) strip.classList.remove('sized')
          },
        }
      }}
      onReset={() => setStripHeight(null)}
    />
  )
}
