import { X } from 'lucide-react'
import { useEffect, useRef, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { clearKnob, removeKnobDest, renameKnob, setDestRange, turnKnobTo } from '../app/knobs'
import { mapTarget } from '../app/midi'
import { togglePanelControl } from '../app/panel'
import { sceneStore } from '../app/scene'
import { settingsStore } from '../app/settings'
import { getEffect } from '../engine/effects/registry'
import type { MidiTarget } from '../engine/midi/midi'
import { getVisual, paramsOf } from '../engine/render/registry'
import { nameOf } from '../engine/render/visual'
import { COMP, NAME_MAX, type KnobRef, type KnobTarget } from '../engine/scene/knobs'
import type { SceneState } from '../engine/scene/scene'
import { sameControl } from '../engine/scene/panel'
import { knobAt } from '../engine/scene/turn'
import { Popover } from './dock/Popover'
import { MidiLearn } from './Midi'
import { useStore } from './useStore'
import { useT } from './useT'

type T = ReturnType<typeof useT>

// Pixels of drag for the whole range; with Shift, four times finer.
const DRAG_PX = 200
const ARC = 0.75

const layerName = (s: SceneState, id: string, t: T) => {
  const i = s.layers.findIndex((l) => l.id === id)
  return i < 0 ? null : t('visuals.layer', { n: i + 1 })
}

// What a destination is, in words: "Capa 1 · Túnel · Zoom".
export function describeTarget(s: SceneState, target: KnobTarget, t: T): string {
  switch (target.kind) {
    case 'crossfade':
      return t('visuals.crossfade')
    case 'opacity': {
      const i = s.layers.findIndex((l) => l.id === target.layer)
      return i < 0 ? t('knobs.gone') : t('visuals.opacity', { n: i + 1 })
    }
    case 'param': {
      const layer = layerName(s, target.layer, t)
      const def = getVisual(target.visual)
      const p = def && paramsOf(def).find((x) => x.id === target.param)
      if (!layer || !def || !p) return t('knobs.gone')
      return `${layer} · ${nameOf(def, t)} · ${nameOf(p, t)}`
    }
    case 'effect': {
      const owner = target.owner === COMP ? t('inspector.comp') : layerName(s, target.owner, t)
      const def = getEffect(target.type)
      const p = def?.params.find((x) => x.id === target.param)
      if (!owner || !def || !p) return t('knobs.gone')
      return `${owner} · ${t(def.label)}${target.nth ? ` ${target.nth + 1}` : ''} · ${nameOf(p, t)}`
    }
  }
}

export function knobName(name: string, n: number, t: T): string {
  return name || t('knobs.default', { n })
}

// A knob: a dial that turns by dragging, the wheel or the arrow keys, and its name, which
// opens what it sets. Right click on the dial opens that too.
export function KnobDial({ knobRef, n, midi }: { knobRef: KnobRef; n: number; midi?: MidiTarget }) {
  const t = useT()
  const knob = useStore(sceneStore, (s) => knobAt(s, knobRef))
  const box = useRef<HTMLDivElement>(null)
  const drag = useRef<{ y: number; v: number } | null>(null)
  const dialRef = useRef<HTMLDivElement>(null)
  const value = useRef(0)
  value.current = knob?.value ?? 0
  const exists = knob !== null

  // The wheel turns the knob and not the dock under it: React listens to it passively.
  useEffect(() => {
    const el = dialRef.current
    if (!el) return
    const onWheel = (e: globalThis.WheelEvent) => {
      if (e.deltaY === 0) return
      e.preventDefault()
      turnKnobTo(knobRef, Math.round(Math.max(0, Math.min(1, value.current + (e.deltaY < 0 ? 0.02 : -0.02))) * 1000) / 1000)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [exists, knobRef.bank, knobRef.i, knobRef.bank === 'layer' ? knobRef.layer : ''])

  if (!knob) return null
  const name = knobName(knob.name, n, t)
  const v = knob.value
  const pct = Math.round(v * 100)
  const set = (x: number) => turnKnobTo(knobRef, Math.round(Math.max(0, Math.min(1, x)) * 1000) / 1000)

  const onPointerDown = (e: ReactPointerEvent) => {
    if (e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { y: e.clientY, v }
  }
  const onPointerMove = (e: ReactPointerEvent) => {
    const d = drag.current
    if (!d) return
    const scale = e.shiftKey ? DRAG_PX * 4 : DRAG_PX
    set(d.v + (d.y - e.clientY) / scale)
  }
  const onPointerUp = () => {
    drag.current = null
  }
  const onKey = (e: KeyboardEvent) => {
    const step = e.shiftKey ? 0.1 : 0.01
    const to =
      e.key === 'ArrowUp' || e.key === 'ArrowRight' ? v + step : e.key === 'ArrowDown' || e.key === 'ArrowLeft' ? v - step : e.key === 'PageUp' ? v + 0.1 : e.key === 'PageDown' ? v - 0.1 : e.key === 'Home' ? 0 : e.key === 'End' ? 1 : null
    if (to === null) return
    e.preventDefault()
    e.stopPropagation()
    set(to)
  }
  const openEditor = () => box.current?.querySelector<HTMLButtonElement>('.pop-button')?.click()

  // The arc starts at the bottom left and turns clockwise through three quarters.
  const r = 18
  const c = 2 * Math.PI * r
  return (
    <div ref={box} className={`knob${knob.dests.length ? '' : ' unset'}`}>
      <div
        ref={dialRef}
        className="knob-dial"
        data-control={knobRef.bank === 'layer' ? undefined : JSON.stringify({ kind: 'knob', ref: knobRef })}
        role="slider"
        tabIndex={0}
        aria-label={name}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-valuetext={`${pct} %`}
        title={knob.dests.length ? t('knobs.dests', { n: knob.dests.length }) : t('knobs.noDests')}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKey}
        onContextMenu={(e) => {
          e.preventDefault()
          openEditor()
        }}
      >
        <svg viewBox="0 0 48 48" aria-hidden="true">
          <circle cx="24" cy="24" r={r} className="knob-track" strokeDasharray={`${c * ARC} ${c}`} transform="rotate(135 24 24)" />
          <circle cx="24" cy="24" r={r} className="knob-value" strokeDasharray={`${c * ARC * v} ${c}`} transform="rotate(135 24 24)" />
        </svg>
        <span className="knob-pct mono">{pct}</span>
      </div>
      <Popover label={t('knobs.editor', { name })} button={<span className="knob-name">{name}</span>} buttonClass="knob-label" buttonLabel={t('knobs.edit', { name })} floating>
        <KnobEditor knobRef={knobRef} n={n} midi={midi} />
      </Popover>
    </div>
  )
}

function KnobEditor({ knobRef, n, midi }: { knobRef: KnobRef; n: number; midi?: MidiTarget }) {
  const t = useT()
  const scene = useStore(sceneStore)
  const map = useStore(settingsStore, (s) => s.midi.map)
  const knob = knobAt(scene, knobRef)
  if (!knob) return null
  const name = knobName(knob.name, n, t)
  return (
    <div className="knob-editor">
      <label className="field">
        <span>{t('knobs.name')}</span>
        <input type="text" maxLength={NAME_MAX} placeholder={t('knobs.default', { n })} value={knob.name} onChange={(e) => renameKnob(knobRef, e.target.value)} />
      </label>
      {midi && (
        <div className="field">
          <span>MIDI</span>
          <MidiLearn label={name} control={map[midi] ?? null} onLearn={(c) => mapTarget(midi, c)} onClear={() => mapTarget(midi, null)} />
        </div>
      )}
      <button className="btn" onClick={() => togglePanelControl({ kind: 'knob', ref: knobRef })}>
        {t(scene.panel.some((c) => c && sameControl(c, { kind: 'knob', ref: knobRef })) ? 'control.offPanel' : 'control.toPanel')}
      </button>
      <h3 className="knob-editor-head">{t('knobs.destsTitle')}</h3>
      {knob.dests.length === 0 ? (
        <p className="small muted">{t('knobs.howTo')}</p>
      ) : (
        <ul className="knob-dests">
          {knob.dests.map((d, i) => {
            const what = describeTarget(scene, d.target, t)
            return (
              <li key={i} className="knob-dest">
                <div className="knob-dest-head">
                  <span>{what}</span>
                  <button className="icon-btn small" title={t('knobs.removeDest')} aria-label={t('knobs.removeDestOf', { what })} onClick={() => removeKnobDest(knobRef, i)}>
                    <X size={14} />
                  </button>
                </div>
                <label className="knob-range">
                  <span>{t('knobs.from')}</span>
                  <input type="range" min={0} max={100} value={Math.round(d.from * 100)} aria-label={t('knobs.fromOf', { what })} onChange={(e) => setDestRange(knobRef, i, Number(e.target.value) / 100, d.to)} />
                  <span className="mono">{Math.round(d.from * 100)}</span>
                </label>
                <label className="knob-range">
                  <span>{t('knobs.to')}</span>
                  <input type="range" min={0} max={100} value={Math.round(d.to * 100)} aria-label={t('knobs.toOf', { what })} onChange={(e) => setDestRange(knobRef, i, d.from, Number(e.target.value) / 100)} />
                  <span className="mono">{Math.round(d.to * 100)}</span>
                </label>
                {d.to < d.from && <p className="small muted">{t('knobs.inverted')}</p>}
              </li>
            )
          })}
        </ul>
      )}
      <button className="btn" disabled={!knob.dests.length && !knob.name} onClick={() => clearKnob(knobRef)}>
        {t('knobs.clear')}
      </button>
    </div>
  )
}
