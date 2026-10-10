import { Activity, Plus, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
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
  type Modulation,
  type SourceKind,
} from '../engine/modulation/modulation'
import { nameOf, type ParamDef, type Params } from '../engine/render/visual'
import type { MessageKey } from '../i18n'
import { useT } from './useT'

const SOURCE_KINDS: SourceKind[] = ['band', 'beat', 'lfo']

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
}

// Sliders (or lists for named values) with a live mark and their modulation editors.
export function ParamList({ defs, values, mods, scope, live, onParam, onAddMod, onUpdateMod, onRemoveMod }: ParamListProps) {
  const t = useT()
  const [open, setOpen] = useState<string | null>(null)
  const markers = useRef(new Map<string, HTMLElement>())
  const liveRef = useRef(live)
  liveRef.current = live

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
        return (
          <li key={key} className="param">
            <div className="param-row">
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
  const src = mod.source
  const set = (patch: Partial<Modulation>) => onChange({ ...mod, ...patch })

  return (
    <div className="mod">
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

        <button className="icon-btn small mod-remove" title={t('mod.remove')} aria-label={t('mod.remove')} onClick={onRemove}>
          <X size={15} />
        </button>
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

      <label className="mod-field">
        <span>{t('mod.amount')}</span>
        <input type="range" min={-1} max={1} step={0.01} value={mod.amount} onChange={(e) => set({ amount: Number(e.target.value) })} />
        <span className="mono">{mod.amount > 0 ? '+' : ''}{Math.round(mod.amount * 100)} %</span>
      </label>
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
    </div>
  )
}
