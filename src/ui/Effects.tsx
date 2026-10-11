import { ChevronDown, ChevronRight, ChevronUp, RotateCcw, X } from 'lucide-react'
import { useState } from 'react'
import { renderer } from '../app/engine'
import {
  addEffect,
  addEffectModulation,
  chainOf,
  moveEffect,
  removeEffect,
  removeEffectModulation,
  resetEffect,
  sceneStore,
  setEffectEnabled,
  setEffectParam,
  updateEffectModulation,
} from '../app/scene'
import { EFFECTS, MAX_EFFECTS, getEffect } from '../engine/effects/registry'
import { ParamList } from './ParamList'
import { useStore } from './useStore'
import { useT } from './useT'

// The effect chain of the selected layer, applied before it blends onto the layers below,
// or the composition's, applied in list order after all layers are blended.
export function Effects() {
  const t = useT()
  const [comp, setComp] = useState(false)
  const selected = useStore(sceneStore, (s) => s.selected)
  const target = comp ? 'comp' : selected
  const effects = useStore(sceneStore, (s) => chainOf(s, target))
  const [open, setOpen] = useState<string | null>(null)
  const full = effects.length >= MAX_EFFECTS
  const n = selected + 1

  return (
    <section className="panel effects">
      <header className="panel-head">
        <h2>{t('effects.title')}</h2>
        <select
          aria-label={t('effects.add')}
          value=""
          disabled={full}
          onChange={(e) => {
            if (e.target.value) addEffect(e.target.value, target)
          }}
        >
          <option value="">{full ? t('effects.full', { n: MAX_EFFECTS }) : t('effects.add')}</option>
          {EFFECTS.map((d) => (
            <option key={d.id} value={d.id}>
              {t(d.label)}
            </option>
          ))}
        </select>
      </header>

      <div className="segmented" role="group" aria-label={t('effects.target')}>
        <button className={`seg${comp ? '' : ' on'}`} aria-pressed={!comp} onClick={() => setComp(false)}>
          {t('visuals.layer', { n })}
        </button>
        <button className={`seg${comp ? ' on' : ''}`} aria-pressed={comp} onClick={() => setComp(true)}>
          {t('effects.comp')}
        </button>
      </div>

      {effects.length === 0 && <p className="empty">{comp ? t('effects.empty') : t('effects.emptyLayer', { n })}</p>}

      <ul className="effect-list">
        {effects.map((e, i) => {
          const def = getEffect(e.type)
          if (!def) return null
          const name = t(def.label)
          const expanded = open === e.id
          return (
            <li key={e.id} className={`effect${e.enabled ? '' : ' off'}`}>
              <div className="effect-row">
                <button className="icon-btn small" aria-expanded={expanded} aria-label={t('effects.edit', { name })} title={t('effects.edit', { name })} onClick={() => setOpen(expanded ? null : e.id)}>
                  {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                </button>
                <label className="check inline-check effect-name">
                  <input type="checkbox" checked={e.enabled} onChange={(ev) => setEffectEnabled(e.id, ev.target.checked)} aria-label={t('effects.enabled', { name })} />
                  <span>{name}</span>
                </label>
                <button className="icon-btn small" disabled={i === 0} title={t('effects.up')} aria-label={t('effects.up')} onClick={() => moveEffect(e.id, -1)}>
                  <ChevronUp size={15} />
                </button>
                <button className="icon-btn small" disabled={i === effects.length - 1} title={t('effects.down')} aria-label={t('effects.down')} onClick={() => moveEffect(e.id, 1)}>
                  <ChevronDown size={15} />
                </button>
                <button className="icon-btn small" title={t('effects.reset')} aria-label={t('effects.reset')} onClick={() => resetEffect(e.id)}>
                  <RotateCcw size={15} />
                </button>
                <button className="icon-btn small" title={t('effects.remove')} aria-label={t('effects.remove')} onClick={() => removeEffect(e.id)}>
                  <X size={15} />
                </button>
              </div>
              {expanded && (
                <ParamList
                  defs={def.params}
                  values={e.params}
                  mods={e.mods}
                  scope={e.id}
                  live={() => renderer.effectLive.get(e.id)}
                  onParam={(id, v) => setEffectParam(e.id, id, v)}
                  onAddMod={(id) => addEffectModulation(e.id, id)}
                  onUpdateMod={(id, m) => updateEffectModulation(e.id, id, m)}
                  onRemoveMod={(id, mid) => removeEffectModulation(e.id, id, mid)}
                />
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
