import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react'
import { addKnobDest, removeKnobDest } from '../app/knobs'
import { sceneStore } from '../app/scene'
import { createStore } from '../core/store'
import { COMP, LEVEL_KNOBS, PANEL_KNOBS, sameTarget, type KnobRef, type KnobTarget } from '../engine/scene/knobs'
import type { SceneState } from '../engine/scene/scene'
import { knobAt } from '../engine/scene/turn'
import { describeTarget, knobName } from './Knob'
import { useStore } from './useStore'
import { useT } from './useT'

// Right click (or the menu key) on a parameter, a layer's opacity or the crossfader: a menu
// to put it on a knob of the panel, of the composition or of its layer. A knob that already
// sets it is ticked, and choosing it again takes it off.

interface MenuState {
  x: number
  y: number
  target: KnobTarget
  // Where focus goes back on close.
  from: HTMLElement | null
}

const menuStore = createStore<MenuState | null>(null)

// Handlers for what holds the control: right click, and the menu key or Shift+F10 handled
// here, since not every browser turns them into a context menu.
export function knobMenu(target: KnobTarget) {
  const openAt = (x: number, y: number) => menuStore.set({ x, y, target, from: document.activeElement as HTMLElement | null })
  return {
    onContextMenu: (e: MouseEvent<HTMLElement>) => {
      e.preventDefault()
      const r = e.currentTarget.getBoundingClientRect()
      // A context menu from the keyboard has no pointer: under the control.
      if (e.clientX === 0 && e.clientY === 0) openAt(r.left, r.bottom)
      else openAt(e.clientX, e.clientY)
    },
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
      if (e.key !== 'ContextMenu' && !(e.shiftKey && e.key === 'F10')) return
      e.preventDefault()
      const r = (e.target as HTMLElement).getBoundingClientRect()
      openAt(r.left, r.bottom)
    },
  }
}

// The layer a target belongs to, for the knobs offered: otherwise the selected one.
function layerOf(s: SceneState, t: KnobTarget): string {
  if (t.kind === 'param' || t.kind === 'opacity') return t.layer
  if (t.kind === 'effect' && t.owner !== COMP) return t.owner
  return s.layers[s.selected].id
}

export function KnobMenu() {
  const t = useT()
  const menu = useStore(menuStore)
  const scene = useStore(sceneStore)
  const box = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x: 0, y: 0 })

  const close = (refocus = true) => {
    const from = menuStore.get()?.from
    menuStore.set(null)
    if (refocus) from?.focus()
  }

  // Kept inside the window, then the first item focused.
  useLayoutEffect(() => {
    const el = box.current
    if (!menu || !el) return
    const r = el.getBoundingClientRect()
    setPos({ x: Math.max(4, Math.min(menu.x, innerWidth - r.width - 4)), y: Math.max(4, Math.min(menu.y, innerHeight - r.height - 4)) })
    el.querySelector<HTMLButtonElement>('[role^=menuitem]')?.focus()
  }, [menu])

  useEffect(() => {
    if (!menu) return
    const onDown = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) close(false)
    }
    const onScroll = () => close(false)
    document.addEventListener('pointerdown', onDown)
    addEventListener('resize', onScroll)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      removeEventListener('resize', onScroll)
    }
  }, [menu])

  if (!menu) return null
  const layerId = layerOf(scene, menu.target)
  const layerN = scene.layers.findIndex((l) => l.id === layerId) + 1
  const groups: { title: string; refs: KnobRef[] }[] = [
    { title: t('knobs.panel'), refs: Array.from({ length: PANEL_KNOBS }, (_, i) => ({ bank: 'panel', i })) },
    { title: t('inspector.comp'), refs: Array.from({ length: LEVEL_KNOBS }, (_, i) => ({ bank: 'comp', i })) },
    { title: t('visuals.layer', { n: layerN }), refs: Array.from({ length: LEVEL_KNOBS }, (_, i) => ({ bank: 'layer', layer: layerId, i })) },
  ]

  const onKey = (e: KeyboardEvent) => {
    const items = [...(box.current?.querySelectorAll<HTMLButtonElement>('[role^=menuitem]') ?? [])]
    const i = items.indexOf(document.activeElement as HTMLButtonElement)
    const to = e.key === 'ArrowDown' ? i + 1 : e.key === 'ArrowUp' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : null
    if (e.key === 'Escape' || e.key === 'Tab') {
      e.preventDefault()
      close()
      return
    }
    if (to === null) return
    e.preventDefault()
    items[(to + items.length) % items.length]?.focus()
  }

  return (
    <div ref={box} className="knob-menu" role="menu" aria-label={t('knobs.menu', { what: describeTarget(scene, menu.target, t) })} style={{ left: pos.x, top: pos.y }} onKeyDown={onKey}>
      <p className="knob-menu-what">{describeTarget(scene, menu.target, t)}</p>
      <p className="knob-menu-title">{t('knobs.toKnob')}</p>
      {groups.map((g) => (
        <div key={g.title} role="group" aria-label={g.title} className="knob-menu-group">
          <span className="knob-menu-group-title">{g.title}</span>
          <div className="knob-menu-items">
            {g.refs.map((ref) => {
              const k = knobAt(scene, ref)
              if (!k) return null
              const at = k.dests.findIndex((d) => sameTarget(d.target, menu.target))
              const name = knobName(k.name, ref.i + 1, t)
              return (
                <button
                  key={ref.i}
                  role="menuitemcheckbox"
                  aria-checked={at >= 0}
                  className={`knob-menu-item${at >= 0 ? ' on' : ''}`}
                  title={k.dests.length ? t('knobs.dests', { n: k.dests.length }) : t('knobs.noDests')}
                  onClick={() => {
                    if (at >= 0) removeKnobDest(ref, at)
                    else addKnobDest(ref, menu.target)
                    close()
                  }}
                >
                  {name}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
