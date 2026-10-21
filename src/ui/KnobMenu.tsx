import { useRef, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { addKnobDest, removeKnobDest } from '../app/knobs'
import { mapTarget } from '../app/midi'
import { inPanel, togglePanelControl } from '../app/panel'
import { sceneStore } from '../app/scene'
import { settingsStore } from '../app/settings'
import { createStore } from '../core/store'
import type { ActionId } from '../engine/live/live'
import { targetKey, type MidiTarget } from '../engine/midi/midi'
import { COMP, LEVEL_KNOBS, PANEL_KNOBS, sameTarget, type KnobRef, type KnobTarget } from '../engine/scene/knobs'
import type { SceneState } from '../engine/scene/scene'
import { knobAt } from '../engine/scene/turn'
import { menuHandlers, useMenuBox, type MenuPlace } from './contextMenu'
import { describeTarget, knobName } from './Knob'
import { actionLabel } from './Live'
import { MidiLearn } from './Midi'
import { useStore } from './useStore'
import { useT } from './useT'

// Right click (or the menu key) on any control. On a parameter, a layer's opacity or the
// crossfader: put it on a knob of the panel, of the composition or of its layer (a knob that
// already sets it is ticked, and choosing it again takes it off). On every control, an
// action button too: learn a MIDI control for it and put it on my panel.

export type ControlTarget = KnobTarget | { kind: 'action'; id: ActionId }

interface MenuState extends MenuPlace {
  target: ControlTarget
}

const menuStore = createStore<MenuState | null>(null)

// Handlers for what holds the control.
export function knobMenu(target: ControlTarget) {
  const h = menuHandlers(menuStore, { target })
  return { onContextMenu: h.onContextMenu, onKeyDown: (e: KeyboardEvent<HTMLElement>) => void h.onMenuKey(e) }
}

const midiKey = (c: ControlTarget): MidiTarget => (c.kind === 'action' ? c.id : targetKey(c))

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
  const map = useStore(settingsStore, (s) => s.midi.map)
  const box = useRef<HTMLDivElement>(null)

  const close = (refocus = true) => {
    const from = menuStore.get()?.from
    menuStore.set(null)
    if (refocus) from?.focus()
  }
  const pos = useMenuBox(menu, box, close)

  if (!menu) return null
  const target = menu.target
  const what = target.kind === 'action' ? actionLabel(target.id, t) : describeTarget(scene, target, t)
  const key = midiKey(target)
  const onPanel = inPanel(target)
  if (target.kind === 'action') return createPortal(
    <div ref={box} className="knob-menu clip-menu" role="menu" aria-label={t('knobs.menu', { what })} style={{ left: pos.x, top: pos.y }} onKeyDown={(e) => onKey(e)}>
      <p className="knob-menu-what">{what}</p>
      {extra()}
    </div>,
    menu.doc.body,
  )
  const knobTarget = target
  const layerId = layerOf(scene, knobTarget)
  const layerN = scene.layers.findIndex((l) => l.id === layerId) + 1
  const groups: { title: string; refs: KnobRef[] }[] = [
    { title: t('knobs.panel'), refs: Array.from({ length: PANEL_KNOBS }, (_, i) => ({ bank: 'panel', i })) },
    { title: t('inspector.comp'), refs: Array.from({ length: LEVEL_KNOBS }, (_, i) => ({ bank: 'comp', i })) },
    { title: t('visuals.layer', { n: layerN }), refs: Array.from({ length: LEVEL_KNOBS }, (_, i) => ({ bank: 'layer', layer: layerId, i })) },
  ]

  function onKey(e: KeyboardEvent) {
    const items = [...(box.current?.querySelectorAll<HTMLButtonElement>('[role^=menuitem], .midi-learn button') ?? [])]
    const i = items.indexOf(box.current?.ownerDocument.activeElement as HTMLButtonElement)
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

  // MIDI and my panel, for every control.
  function extra() {
    return (
      <div className="knob-menu-group">
        <div className="clip-menu-midi">
          <span>{t('control.midi')}</span>
          <MidiLearn label={what} control={map[key] ?? null} onLearn={(c) => mapTarget(key, c)} onClear={() => mapTarget(key, null)} />
        </div>
        <button
          role="menuitemcheckbox"
          aria-checked={onPanel}
          className="menu-item"
          onClick={() => {
            togglePanelControl(target)
            close()
          }}
        >
          {t(onPanel ? 'control.offPanel' : 'control.toPanel')}
        </button>
      </div>
    )
  }

  return createPortal(
    <div ref={box} className="knob-menu" role="menu" aria-label={t('knobs.menu', { what })} style={{ left: pos.x, top: pos.y }} onKeyDown={onKey}>
      <p className="knob-menu-what">{what}</p>
      <p className="knob-menu-title">{t('knobs.toKnob')}</p>
      {groups.map((g) => (
        <div key={g.title} role="group" aria-label={g.title} className="knob-menu-group">
          <span className="knob-menu-group-title">{g.title}</span>
          <div className="knob-menu-items">
            {g.refs.map((ref) => {
              const k = knobAt(scene, ref)
              if (!k) return null
              const at = k.dests.findIndex((d) => sameTarget(d.target, knobTarget))
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
                    else addKnobDest(ref, knobTarget)
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
      {extra()}
    </div>,
    menu.doc.body,
  )
}
