import { Activity, Plus, X } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  BAND_REFS,
  BEAT_REFS,
  CURVES,
  DECAY_MAX,
  DECAY_MIN,
  LFO_RATE_MAX,
  LFO_RATE_MIN,
  LFO_SHAPES,
  SMOOTHING_MAX,
  SYNC_RATES,
  defaultSource,
  type ModSource,
  type Modulation,
  type SourceKind,
} from '../engine/modulation/modulation'
import { destIndex, isModTarget } from '../engine/modulation/shared'
import { toUnit } from '../engine/render/registry'
import { nameOf, type ParamDef, type Params } from '../engine/render/visual'
import type { MessageKey } from '../i18n'
import type { KnobTarget } from '../engine/scene/knobs'
import { mappingStore } from '../app/modulators'
import { MapTarget } from './MapTarget'
import { sceneStore } from '../app/scene'
import { knobMenu } from './KnobMenu'
import { MidiLearn } from './Midi'
import { modulatorName } from './modulatorName'
import { useStore } from './useStore'
import { useT } from './useT'

export const SOURCE_KINDS: SourceKind[] = ['band', 'beat', 'lfo', 'midi']

function formatValue(def: ParamDef, v: number): string {
  if (def.int || def.max - def.min >= 100) return String(Math.round(v))
  return v.toFixed(2)
}

export interface ParamListProps {
  defs: ParamDef[]
  values: Params
  mods: Record<string, Modulation[]>
  // Changes when the list shows another visualization or effect: closes the open editor.
  scope: string
  // Effective value of each parameter, 0–1 of its range, read every animation frame.
  live: () => Map<string, number> | undefined
  onParam(id: string, value: number): void
  onAddMod(id: string): void
  onUpdateMod(id: string, mod: Modulation): void
  onRemoveMod(id: string, modId: string): void
  // What a knob sets for each parameter; without it, no knob menu and no shared modulators
  // (a clip's parameters).
  knobTarget?: (id: string) => KnobTarget
}

// How far modulation can take a parameter from its value, in units of its range: the
// negative amounts down and the positive up, its own and the shared ones.
export function reach(amounts: readonly number[]): [number, number] {
  let down = 0
  let up = 0
  for (const a of amounts) {
    if (a < 0) down += a
    else up += a
  }
  return [down, up]
}

// Sliders (or lists for named values) with a live mark and their modulation editors.
export function ParamList({ defs, values, mods, scope, live, onParam, onAddMod, onUpdateMod, onRemoveMod, knobTarget }: ParamListProps) {
  const t = useT()
  const [open, setOpen] = useState<string | null>(null)
  const markers = useRef(new Map<string, HTMLElement>())
  const liveRef = useRef(live)
  liveRef.current = live
  const modulators = useStore(sceneStore, (s) => s.modulators)
  const mapping = useStore(mappingStore)
  const mapper = mapping ? modulators.find((m) => m.id === mapping) : undefined

  // Live position of each parameter after modulation, drawn outside React.
  useEffect(() => {
    let raf = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const map = liveRef.current()
      for (const [id, el] of markers.current) {
        const v = map?.get(id)
        el.style.visibility = v === undefined ? 'hidden' : 'visible'
        if (v !== undefined) el.style.left = `${v * 100}%`
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <ul className="params">
      {defs.map((p) => {
        const list = mods[p.id] ?? []
        const value = values[p.id] ?? p.default
        const name = nameOf(p, t)
        const key = `${scope}:${p.id}`
        const choices = p.options ? p.options.map((o) => t(o)) : p.labels
        const target = knobTarget?.(p.id)
        const modTarget = target && isModTarget(target) ? target : null
        const shared = modTarget ? modulators.flatMap((m) => m.dests[destIndex(m, modTarget)]?.amount ?? []) : []
        const [down, up] = reach([...list.map((m) => m.amount), ...shared])
        const base = toUnit(p, value)
        const on = !!(mapper && modTarget && destIndex(mapper, modTarget) >= 0)
        return (
          <li key={key} className={`param${mapper && modTarget ? ' mappable' : ''}${on ? ' mapped' : ''}`}>
            <div className="param-row" {...(target ? knobMenu(target) : {})}>
              <span className="param-name">{name}</span>
              <div className="param-slider">
                {choices ? (
                  <select aria-label={name} value={Math.round(value)} onChange={(e) => onParam(p.id, Number(e.target.value))}>
                    {choices.map((o, i) => (
                      <option key={i} value={p.min + i}>
                        {o}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input type="range" aria-label={name} min={p.min} max={p.max} step={p.int ? 1 : (p.max - p.min) / 200} value={value} onChange={(e) => onParam(p.id, Number(e.target.value))} />
                )}
                {!choices && (down || up) ? (
                  <span className="mod-band" aria-hidden="true" style={{ left: `${Math.max(0, base + down) * 100}%`, right: `${(1 - Math.min(1, base + up)) * 100}%` }} />
                ) : null}
                {!choices && (
                  <span
                    className="live-mark"
                    aria-hidden="true"
                    ref={(el) => {
                      if (el) markers.current.set(p.id, el)
                      else markers.current.delete(p.id)
                    }}
                  />
                )}
              </div>
              <span className="mono param-value">{choices ? '' : formatValue(p, value)}</span>
              <button
                className={`icon-btn small${list.length ? ' on' : ''}`}
                title={t('mod.toggle', { name })}
                aria-label={t('mod.toggle', { name })}
                aria-expanded={open === key}
                onClick={() => setOpen(open === key ? null : key)}
              >
                <Activity size={15} />
                {list.length > 0 && <span className="badge">{list.length}</span>}
              </button>
              {mapper && modTarget && <MapTarget mod={mapper} target={modTarget} label={t(on ? 'modulators.unmapFrom' : 'modulators.mapTo', { name, mod: modulatorName(mapper, modulators, t) })} />}
            </div>
            {open === key && (
              <div className="mods">
                {list.map((m) => (
                  <ModEditor key={m.id} mod={m} onChange={(next) => onUpdateMod(p.id, next)} onRemove={() => onRemoveMod(p.id, m.id)} />
                ))}
                <button className="btn" onClick={() => onAddMod(p.id)}>
                  <Plus size={15} /> {t('mod.add')}
                </button>
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function ModEditor({ mod, onChange, onRemove }: { mod: Modulation; onChange: (m: Modulation) => void; onRemove: () => void }) {
  const t = useT()
  const set = (patch: Partial<Modulation>) => onChange({ ...mod, ...patch })
  return (
    <div className="mod">
      <SourceFields
        value={mod}
        onChange={set}
        extra={
          <button className="icon-btn small mod-remove" title={t('mod.remove')} aria-label={t('mod.remove')} onClick={onRemove}>
            <X size={15} />
          </button>
        }
        amount={
          <label className="mod-field">
            <span>{t('mod.amount')}</span>
            <input type="range" min={-1} max={1} step={0.01} value={mod.amount} onChange={(e) => set({ amount: Number(e.target.value) })} />
            <span className="mono">{mod.amount > 0 ? '+' : ''}{Math.round(mod.amount * 100)} %</span>
          </label>
        }
      />
    </div>
  )
}

export type SourceSettings = { source: ModSource; curve: Modulation['curve']; smoothing: number }

// A modulation source with its curve and smoothing: a parameter's own modulations and the
// shared modulators edit them the same way. `extra` ends the first row; `amount` goes
// before the curve.
export function SourceFields({ value, onChange, extra, amount }: { value: SourceSettings; onChange: (patch: Partial<SourceSettings>) => void; extra?: ReactNode; amount?: ReactNode }) {
  const t = useT()
  const src = value.source
  const set = onChange
  const mod = value

  return (
    <>
      <div className="mod-row">
        <select aria-label={t('mod.source')} value={src.kind} onChange={(e) => set({ source: defaultSource(e.target.value as SourceKind) })}>
          {SOURCE_KINDS.map((k) => (
            <option key={k} value={k}>
              {t(`mod.kind.${k}` as MessageKey)}
            </option>
          ))}
        </select>

        {src.kind === 'band' && (
          <select aria-label={t('mod.kind.band')} value={src.band} onChange={(e) => set({ source: { ...src, band: e.target.value as typeof src.band } })}>
            {BAND_REFS.map((b) => (
              <option key={b} value={b}>
                {t(`band.${b}` as MessageKey)}
              </option>
            ))}
          </select>
        )}
        {src.kind === 'beat' && (
          <select aria-label={t('mod.kind.beat')} value={src.band} onChange={(e) => set({ source: { ...src, band: e.target.value as typeof src.band } })}>
            {BEAT_REFS.map((b) => (
              <option key={b} value={b}>
                {t(`band.${b}` as MessageKey)}
              </option>
            ))}
          </select>
        )}
        {src.kind === 'lfo' && (
          <>
            <select aria-label={t('mod.shape')} value={src.shape} onChange={(e) => set({ source: { ...src, shape: e.target.value as typeof src.shape } })}>
              {LFO_SHAPES.map((s) => (
                <option key={s} value={s}>
                  {t(`shape.${s}` as MessageKey)}
                </option>
              ))}
            </select>
            <label className="check inline-check">
              <input type="checkbox" checked={src.sync} onChange={(e) => set({ source: { ...src, sync: e.target.checked, rate: 1 } })} />
              <span>{t('mod.sync')}</span>
            </label>
          </>
        )}

        {src.kind === 'midi' && <MidiLearn control={src.control} onLearn={(control) => set({ source: { ...src, control } })} />}

        {extra}
      </div>

      {src.kind === 'beat' && (
        <label className="mod-field">
          <span>{t('mod.decay')}</span>
          <input type="range" min={DECAY_MIN} max={DECAY_MAX} step={10} value={src.decay} onChange={(e) => set({ source: { ...src, decay: Number(e.target.value) } })} />
          <span className="mono">{src.decay} ms</span>
        </label>
      )}
      {src.kind === 'lfo' &&
        (src.sync ? (
          <label className="mod-field">
            <span>{t('mod.rate')}</span>
            <select value={src.rate} onChange={(e) => set({ source: { ...src, rate: Number(e.target.value) } })}>
              {SYNC_RATES.map((r) => (
                <option key={r} value={r}>
                  {t('mod.perBeat', { n: r })}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className="mod-field">
            <span>{t('mod.rate')}</span>
            {/* Log scale: 0.01 to 10 Hz. */}
            <input
              type="range"
              min={Math.log10(LFO_RATE_MIN)}
              max={Math.log10(LFO_RATE_MAX)}
              step={0.01}
              value={Math.log10(src.rate)}
              onChange={(e) => set({ source: { ...src, rate: Number((10 ** Number(e.target.value)).toPrecision(3)) } })}
            />
            <span className="mono">{src.rate} Hz</span>
          </label>
        ))}

      {amount}
      <label className="mod-field">
        <span>{t('mod.curve')}</span>
        <select value={mod.curve} onChange={(e) => set({ curve: e.target.value as Modulation['curve'] })}>
          {CURVES.map((c) => (
            <option key={c} value={c}>
              {t(`curve.${c}` as MessageKey)}
            </option>
          ))}
        </select>
      </label>
      <label className="mod-field">
        <span>{t('mod.smoothing')}</span>
        <input type="range" min={0} max={SMOOTHING_MAX} step={10} value={mod.smoothing} onChange={(e) => set({ smoothing: Number(e.target.value) })} />
        <span className="mono">{mod.smoothing} ms</span>
      </label>
    </>
  )
}
