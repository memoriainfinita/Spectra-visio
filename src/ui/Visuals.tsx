import { ChevronDown, ChevronUp, Plus, X } from 'lucide-react'
import { autoStore } from '../app/auto'
import { inspectComposition, inspectLayer, inspectorStore } from '../app/inspector'
import { addLayer, moveLayer, removeLayer, sceneStore, setCrossfade, setLayerBlend, setLayerBypass, setLayerOpacity, setLayerSide, setLayerSolo } from '../app/scene'
import { getVisual } from '../engine/render/registry'
import { nameOf } from '../engine/render/visual'
import { BLEND_MODES, MAX_LAYERS, SIDES, type BlendMode, type Side } from '../engine/scene/scene'
import type { MessageKey } from '../i18n'
import { useStore } from './useStore'
import { useT } from './useT'
import { Hint } from './Hint'
import { effectNames } from './Inspector'

// The layer stack, top first as it is seen, and the crossfader. Picking a layer, or the
// composition above them, shows it in the Inspector.
export function Visuals() {
  const t = useT()
  const scene = useStore(sceneStore)
  const comp = useStore(inspectorStore, (s) => s.level === 'comp')
  const compEffects = useStore(sceneStore, (s) => s.effects)
  const auto = useStore(autoStore, (s) => s.enabled)
  const compMeta = [effectNames(t, compEffects, ''), auto ? t('visuals.compAuto') : ''].filter(Boolean).join(' · ') || t('visuals.compEmpty')
  const sel = scene.selected
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

      <button className={`layer-comp${comp ? ' on' : ''}`} aria-pressed={comp} title={t('visuals.compTitle')} onClick={inspectComposition}>
        <strong>{t('inspector.comp')}</strong>
        <span>{compMeta}</span>
      </button>

      <ul className="layer-list">
        {order.map((i) => {
          const l = scene.layers[i]
          const n = i + 1
          const v = getVisual(l.visual)
          return (
            <li key={l.id} className={`layer${i === sel ? ' selected' : ''}${l.bypass ? ' off' : ''}`}>
              <div className="layer-row">
                <button className="layer-pick" aria-pressed={i === sel} title={t('visuals.select', { n })} onClick={() => inspectLayer(i)}>
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
    </section>
  )
}
