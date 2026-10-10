import { RotateCcw } from 'lucide-react'
import { renderer } from '../app/engine'
import { addModulation, removeModulation, resetParams, sceneStore, selectLayer, setBlend, setCrossfade, setParam, setVisual, updateModulation } from '../app/scene'
import { VISUALS, getVisual, paramsOf } from '../engine/render/registry'
import { BLEND_MODES, visualSettings } from '../engine/scene/scene'
import type { MessageKey } from '../i18n'
import { ParamList } from './ParamList'
import { useStore } from './useStore'
import { useT } from './useT'

const LAYER_NAMES = ['A', 'B'] as const

export function Visuals() {
  const t = useT()
  const scene = useStore(sceneStore)
  const sel = scene.selected
  const layer = scene.layers[sel]
  const def = getVisual(layer.visual)
  const settings = visualSettings(layer)

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
        <ParamList
          defs={paramsOf(def)}
          values={settings.params}
          mods={settings.mods}
          scope={`${sel}:${layer.visual}`}
          live={() => renderer.live[sel]}
          onParam={(id, v) => setParam(sel, id, v)}
          onAddMod={(id) => addModulation(sel, id)}
          onUpdateMod={(id, m) => updateModulation(sel, id, m)}
          onRemoveMod={(id, mid) => removeModulation(sel, id, mid)}
        />
      )}
    </section>
  )
}
