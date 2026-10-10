import { Activity, Plus, RotateCcw, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { renderer } from '../app/engine'
import { addModulation, removeModulation, resetParams, sceneStore, selectLayer, setBlend, setCrossfade, setParam, setVisual, updateModulation } from '../app/scene'
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
import { VISUALS, getVisual, paramsOf } from '../engine/render/registry'
import type { ParamDef } from '../engine/render/visual'
import { BLEND_MODES, visualSettings } from '../engine/scene/scene'
import type { MessageKey } from '../i18n'
import { useStore } from './useStore'
import { useT } from './useT'

const LAYER_NAMES = ['A', 'B'] as const
const SOURCE_KINDS: SourceKind[] = ['band', 'beat', 'lfo']

function formatValue(def: ParamDef, v: number): string {
  if (def.int || def.max - def.min >= 100) return String(Math.round(v))
  return v.toFixed(2)
}

export function Visuals() {
  const t = useT()
  const scene = useStore(sceneStore)
  const sel = scene.selected
  const layer = scene.layers[sel]
  const def = getVisual(layer.visual)
  const settings = visualSettings(layer)
  const [open, setOpen] = useState<string | null>(null)
  const markers = useRef(new Map<string, HTMLElement>())

  // Live position of each parameter after modulation, drawn outside React.
  useEffect(() => {
    let raf = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const live = renderer.live[sel]
      for (const [id, el] of markers.current) {
        const v = live.get(id)
        el.style.visibility = v === undefined ? 'hidden' : 'visible'
        if (v !== undefined) el.style.left = `${v * 100}%`
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [sel])

  return (
    <section className="panel visuals">
      <header className="panel-head">
        <h2>{t('visuals.title')}</h2>
      </header>

      <div className="segmented" role="group">
        {([0, 1] as const).map((i) => {
          const v = getVisual(scene.layers[i].visual)
          return (
            <button key={i} className={`seg${sel === i ? ' on' : ''}`} aria-pressed={sel === i} onClick={() => selectLayer(i)}>
              <strong>{LAYER_NAMES[i]}</strong> <span>{v ? t(v.label) : ''}</span>
            </button>
          )
        })}
      </div>

      <div className="crossfade-row">
        <span className="mono">A</span>
        <input type="range" aria-label={t('visuals.crossfade')} min={0} max={1} step={0.01} value={scene.crossfade} onChange={(e) => setCrossfade(Number(e.target.value))} />
        <span className="mono">B</span>
        <select aria-label={t('visuals.blend')} title={t('visuals.blend')} value={scene.blend} onChange={(e) => setBlend(e.target.value as (typeof BLEND_MODES)[number])}>
          {BLEND_MODES.map((m) => (
            <option key={m} value={m}>
              {t(`blend.${m}` as MessageKey)}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <span>{t('visuals.layer', { n: LAYER_NAMES[sel] })}</span>
        <select value={layer.visual} onChange={(e) => setVisual(sel, e.target.value)}>
          {VISUALS.map((v) => (
            <option key={v.id} value={v.id}>
              {t(v.label)}
            </option>
          ))}
        </select>
        <button className="icon-btn small" title={t('visuals.reset')} aria-label={t('visuals.reset')} onClick={() => resetParams(sel)}>
          <RotateCcw size={15} />
        </button>
      </div>

      {def && (
        <ul className="params">
          {paramsOf(def).map((p) => {
            const mods = settings.mods[p.id] ?? []
            const value = settings.params[p.id] ?? p.default
            const name = t(p.label)
            const key = `${sel}:${layer.visual}:${p.id}`
            return (
              <li key={key} className="param">
                <div className="param-row">
                  <span className="param-name">{name}</span>
                  <div className="param-slider">
                    <input type="range" aria-label={name} min={p.min} max={p.max} step={p.int ? 1 : (p.max - p.min) / 200} value={value} onChange={(e) => setParam(sel, p.id, Number(e.target.value))} />
                    <span
                      className="live-mark"
                      aria-hidden="true"
                      ref={(el) => {
                        if (el) markers.current.set(p.id, el)
                        else markers.current.delete(p.id)
                      }}
                    />
                  </div>
                  <span className="mono param-value">{formatValue(p, value)}</span>
                  <button
                    className={`icon-btn small${mods.length ? ' on' : ''}`}
                    title={t('mod.toggle', { name })}
                    aria-label={t('mod.toggle', { name })}
                    aria-expanded={open === key}
                    onClick={() => setOpen(open === key ? null : key)}
                  >
                    <Activity size={15} />
                    {mods.length > 0 && <span className="badge">{mods.length}</span>}
                  </button>
                </div>
                {open === key && (
                  <div className="mods">
                    {mods.map((m) => (
                      <ModEditor key={m.id} mod={m} onChange={(next) => updateModulation(sel, p.id, next)} onRemove={() => removeModulation(sel, p.id, m.id)} />
                    ))}
                    <button className="btn" onClick={() => addModulation(sel, p.id)}>
                      <Plus size={15} /> {t('mod.add')}
                    </button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
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
