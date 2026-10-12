import { ChevronDown, ChevronUp, Plus, RotateCcw, X } from 'lucide-react'
import { renderer } from '../app/engine'
import {
  addLayer,
  addModulation,
  moveLayer,
  removeLayer,
  removeModulation,
  resetParams,
  sceneStore,
  selectLayer,
  setCrossfade,
  setLayerBlend,
  setLayerBypass,
  setLayerOpacity,
  setLayerSide,
  setLayerSolo,
  setParam,
  setTransition,
  setVisual,
  updateModulation,
} from '../app/scene'
import { getVisual, paramsOf, visualsStore } from '../engine/render/registry'
import { nameOf } from '../engine/render/visual'
import { BLEND_MODES, MAX_LAYERS, SIDES, TRANSITION_MAX, visualSettings, type BlendMode, type Side } from '../engine/scene/scene'
import type { MessageKey } from '../i18n'
import { ParamList } from './ParamList'
import { useStore } from './useStore'
import { useT } from './useT'
import { Hint } from './Hint'

// The layer stack, top first as it is seen, the crossfader and the selected layer's
// visualization with its parameters.
export function Visuals() {
  const t = useT()
  const scene = useStore(sceneStore)
  const visuals = useStore(visualsStore)
  const sel = scene.selected
  const layer = scene.layers[sel]
  const def = getVisual(layer.visual)
  const settings = visualSettings(layer)
  const full = scene.layers.length >= MAX_LAYERS
  const order = scene.layers.map((_, i) => i).reverse()

  return (
    <section className="panel visuals">
      <header className="panel-head">
        <h2>{t('visuals.title')}</h2>
        <button className="btn" disabled={full} title={full ? t('visuals.full', { n: MAX_LAYERS }) : undefined} onClick={addLayer}>
          <Plus size={15} /> {t('visuals.add')}
        </button>
      </header>

      <ul className="layer-list">
        {order.map((i) => {
          const l = scene.layers[i]
          const n = i + 1
          const v = getVisual(l.visual)
          return (
            <li key={l.id} className={`layer${i === sel ? ' selected' : ''}${l.bypass ? ' off' : ''}`}>
              <div className="layer-row">
                <button className="layer-pick" aria-pressed={i === sel} title={t('visuals.select', { n })} onClick={() => selectLayer(i)}>
                  <strong>{n}</strong> <span>{v ? nameOf(v, t) : ''}</span>
                </button>
                <button className={`toggle${l.bypass ? ' on' : ''}`} aria-pressed={l.bypass} title={t('visuals.bypass', { n })} aria-label={t('visuals.bypass', { n })} onClick={() => setLayerBypass(i, !l.bypass)}>
                  B
                </button>
                <button className={`toggle${l.solo ? ' on' : ''}`} aria-pressed={l.solo} title={t('visuals.solo', { n })} aria-label={t('visuals.solo', { n })} onClick={() => setLayerSolo(i, !l.solo)}>
                  S
                </button>
                <button className="icon-btn small" disabled={i === scene.layers.length - 1} title={t('visuals.up', { n })} aria-label={t('visuals.up', { n })} onClick={() => moveLayer(i, 1)}>
                  <ChevronUp size={15} />
                </button>
                <button className="icon-btn small" disabled={i === 0} title={t('visuals.down', { n })} aria-label={t('visuals.down', { n })} onClick={() => moveLayer(i, -1)}>
                  <ChevronDown size={15} />
                </button>
                <button className="icon-btn small" disabled={scene.layers.length <= 1} title={t('visuals.remove', { n })} aria-label={t('visuals.remove', { n })} onClick={() => removeLayer(i)}>
                  <X size={15} />
                </button>
              </div>
              <div className="layer-row">
                <input type="range" className="layer-opacity" aria-label={t('visuals.opacity', { n })} title={t('visuals.opacity', { n })} min={0} max={1} step={0.01} value={l.opacity} onChange={(e) => setLayerOpacity(i, Number(e.target.value))} />
                <select aria-label={t('visuals.blendOf', { n })} title={t('visuals.blendOf', { n })} value={l.blend} onChange={(e) => setLayerBlend(i, e.target.value as BlendMode)}>
                  {BLEND_MODES.map((m) => (
                    <option key={m} value={m}>
                      {t(`blend.${m}` as MessageKey)}
                    </option>
                  ))}
                </select>
                <select aria-label={t('visuals.side', { n })} title={t('visuals.side', { n })} value={l.side ?? ''} onChange={(e) => setLayerSide(i, (e.target.value || null) as Side | null)}>
                  {SIDES.map((s) => (
                    <option key={s} value={s}>
                      {s.toUpperCase()}
                    </option>
                  ))}
                  <option value="">{t('visuals.side.none')}</option>
                </select>
              </div>
            </li>
          )
        })}
      </ul>

      <div className="crossfade-row">
        <span className="mono">A</span>
        <input type="range" aria-label={t('visuals.crossfade')} min={0} max={1} step={0.01} value={scene.crossfade} onChange={(e) => setCrossfade(Number(e.target.value))} />
        <span className="mono">B</span>
      </div>
      <Hint text={t('visuals.hint')} />

      <label className="field">
        <span>{t('visuals.transition')}</span>
        <input type="range" min={0} max={TRANSITION_MAX} step={0.1} value={scene.transition} onChange={(e) => setTransition(Number(e.target.value))} />
        <span className="mono">{scene.transition > 0 ? `${scene.transition.toFixed(1)} s` : t('visuals.cut')}</span>
      </label>

      <div className="field">
        <span>{t('visuals.layer', { n: sel + 1 })}</span>
        <select value={layer.visual} onChange={(e) => setVisual(sel, e.target.value)}>
          {visuals.map((v) => (
            <option key={v.id} value={v.id}>
              {nameOf(v, t)}
            </option>
          ))}
        </select>
        <button className="icon-btn small" title={t('visuals.reset')} aria-label={t('visuals.reset')} onClick={() => resetParams(sel)}>
          <RotateCcw size={15} />
        </button>
      </div>

      {def && (
        <ParamList
          defs={paramsOf(def)}
          values={settings.params}
          mods={settings.mods}
          scope={`${layer.id}:${layer.visual}`}
          live={() => renderer.live.get(layer.id)}
          onParam={(id, v) => setParam(sel, id, v)}
          onAddMod={(id) => addModulation(sel, id)}
          onUpdateMod={(id, m) => updateModulation(sel, id, m)}
          onRemoveMod={(id, mid) => removeModulation(sel, id, mid)}
        />
      )}
    </section>
  )
}
