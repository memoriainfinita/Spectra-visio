import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { dockUi, layoutsStore } from '../app/layout'
import { autoStore, toggleAuto } from '../app/auto'
import { liveStore, runAction } from '../app/live'
import { panelDragStore, panelEditStore, setPanelCell } from '../app/panel'
import { sceneStore, setCrossfade } from '../app/scene'
import { ACTIONS, type ActionId } from '../engine/live/live'
import type { MidiTarget } from '../engine/midi/midi'
import { LEVEL_KNOBS, PANEL_KNOBS, type KnobRef, type KnobTarget } from '../engine/scene/knobs'
import { PANEL_CELLS, targetShare, type PanelControl } from '../engine/scene/panel'
import type { SceneState } from '../engine/scene/scene'
import { knobAt, setTarget } from '../engine/scene/turn'
import { Hint } from './Hint'
import { KnobDial, describeTarget, knobName } from './Knob'
import { knobMenu } from './KnobMenu'
import { actionLabel } from './actionLabel'
import { useStore } from './useStore'
import { useT } from './useT'

type T = ReturnType<typeof useT>

const CELLS = Array.from({ length: PANEL_CELLS }, (_, i) => i)
const TOGGLES: readonly ActionId[] = ['blackout', 'freeze', 'strobe', 'auto']

export function controlName(s: SceneState, c: PanelControl, t: T): string {
  if (c.kind === 'action') return actionLabel(c.id, t)
  if (c.kind === 'knob') {
    const k = knobAt(s, c.ref)
    return k ? knobName(k.name, c.ref.i + 1, t) : t('mypanel.gone')
  }
  return describeTarget(s, c, t)
}

const knobMidi = (ref: KnobRef): MidiTarget | undefined => (ref.bank === 'panel' ? `knob${ref.i + 1}` : ref.bank === 'comp' ? `compKnob${ref.i + 1}` : undefined)

// My panel: PANEL_CELLS cells for the controls of a show. Controls come from their
// right-click menu; Edit adds actions, the crossfader and knobs, moves and removes.
export function MyPanel() {
  const t = useT()
  const scene = useStore(sceneStore)
  const editing = useStore(panelEditStore)
  const over = useStore(panelDragStore, (d) => d?.over ?? null)
  const section = useRef<HTMLElement>(null)
  // The tab strip of the stack that shows this dock has room for the Edit button and the
  // help, so they do not take a row of the panel; elsewhere (a dock window) they do.
  const [slot, setSlot] = useState<HTMLElement | null>(null)
  useStore(layoutsStore)
  useStore(dockUi)
  useEffect(() => {
    const el = section.current?.ownerDocument.getElementById('dock-actions-mypanel') ?? null
    setSlot((prev) => (prev === el ? prev : el))
  })
  const controls = (
    <>
      <Hint text={t('mypanel.hint')} />
      <button className={`btn small${editing ? ' on' : ''}`} aria-pressed={editing} onClick={() => panelEditStore.set(!editing)}>
        {editing ? t('mypanel.done') : t('mypanel.edit')}
      </button>
    </>
  )
  return (
    <section ref={section} className={`panel mypanel${editing ? ' editing' : ''}`}>
      {slot ? (
        createPortal(controls, slot)
      ) : (
        <header className="panel-head">
          <h2>{t('mypanel.title')}</h2>
          <div className="mypanel-controls">{controls}</div>
        </header>
      )}
      <div className="mypanel-grid">
        {CELLS.map((i) => {
          const c = scene.panel[i]
          return (
            <div key={i} data-cell={i} className={`mypanel-cell${c ? '' : ' empty'}${over === i ? ' drop-over' : ''}`}>
              {c ? <Cell c={c} scene={scene} t={t} /> : editing ? <Picker i={i} t={t} /> : null}
            </div>
          )
        })}
      </div>
    </section>
  )
}

function Cell({ c, scene, t }: { c: PanelControl; scene: SceneState; t: T }) {
  const live = useStore(liveStore)
  const auto = useStore(autoStore, (s) => s.enabled)
  const name = controlName(scene, c, t)
  if (c.kind === 'knob') return <KnobDial knobRef={c.ref} n={c.ref.i + 1} midi={knobMidi(c.ref)} />
  if (c.kind === 'action') {
    const id = c.id
    const on = id === 'auto' ? auto : id === 'blackout' || id === 'freeze' || id === 'strobe' ? live[id] : undefined
    return (
      <button className={`btn mypanel-action${on ? ' on' : ''}`} aria-pressed={TOGGLES.includes(id) ? on : undefined} title={name} onClick={() => (id === 'auto' ? toggleAuto() : runAction(id))} {...knobMenu(c)}>
        {name}
      </button>
    )
  }
  return <TargetSlider target={c} scene={scene} name={name} />
}

function TargetSlider({ target, scene, name }: { target: KnobTarget; scene: SceneState; name: string }) {
  const share = targetShare(scene, target)
  return (
    <label className="mypanel-slider" title={name}>
      <span>{name}</span>
      <input
        type="range"
        aria-label={name}
        min={0}
        max={1}
        step={0.005}
        disabled={share === null}
        value={share ?? 0}
        onChange={(e) => {
          const v = Number(e.target.value)
          if (target.kind === 'crossfade') setCrossfade(v)
          else sceneStore.set((s) => setTarget(s, target, v))
        }}
        {...knobMenu(target)}
      />
    </label>
  )
}

// An empty cell while editing: a list of what can go there without a right click.
function Picker({ i, t }: { i: number; t: T }) {
  const scene = useStore(sceneStore)
  const knobs: KnobRef[] = [...Array.from({ length: PANEL_KNOBS }, (_, k) => ({ bank: 'panel' as const, i: k })), ...Array.from({ length: LEVEL_KNOBS }, (_, k) => ({ bank: 'comp' as const, i: k }))]
  const pick = (v: string) => {
    if (v === 'crossfade') setPanelCell(i, { kind: 'crossfade' })
    else if (v.startsWith('knob:')) setPanelCell(i, { kind: 'knob', ref: knobs[Number(v.slice(5))] })
    else if (v.startsWith('action:')) setPanelCell(i, { kind: 'action', id: v.slice(7) as ActionId })
  }
  return (
    <select className="mypanel-pick" aria-label={t('mypanel.pick', { n: i + 1 })} title={t('mypanel.add', { n: i + 1 })} value="" onChange={(e) => pick(e.target.value)}>
      <option value="">+</option>
      <optgroup label={t('mypanel.actions')}>
        {ACTIONS.map((id) => (
          <option key={id} value={`action:${id}`}>
            {actionLabel(id, t)}
          </option>
        ))}
      </optgroup>
      <option value="crossfade">{t('visuals.crossfade')}</option>
      <optgroup label={t('mypanel.knobs')}>
        {knobs.map((ref, k) => {
          const knob = knobAt(scene, ref)
          return (
            <option key={k} value={`knob:${k}`}>
              {`${ref.bank === 'comp' ? `${t('inspector.comp')} · ` : ''}${knobName(knob?.name ?? '', ref.i + 1, t)}`}
            </option>
          )
        })}
      </optgroup>
    </select>
  )
}
