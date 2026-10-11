import { autoStore, toggleAuto } from '../app/auto'
import { settingsStore } from '../app/settings'
import { AUTO_BARS, AUTO_POOLS, AUTO_SECONDS, AUTO_TARGETS, type AutoSettings } from '../engine/auto/auto'
import { CATEGORIES } from '../engine/render/visual'
import type { MessageKey } from '../i18n'
import { useStore } from './useStore'
import { useT } from './useT'

function setAutoSettings(patch: Partial<AutoSettings>): void {
  settingsStore.set((s) => ({ ...s, auto: { ...s.auto, ...patch } }))
}

export function Auto() {
  const t = useT()
  const state = useStore(autoStore)
  const s = useStore(settingsStore, (st) => st.auto)

  return (
    <section className="panel auto">
      <header className="panel-head">
        <h2>{t('auto.title')}</h2>
        <button className={`btn${state.enabled ? ' on' : ''}`} aria-pressed={state.enabled} title={t('auto.toggleHint')} onClick={() => toggleAuto()}>
          {state.enabled ? t('auto.on') : t('auto.off')}
        </button>
      </header>
      {state.enabled && <p className="muted small">{state.last ? t('auto.last', { why: t(`auto.why.${state.last}` as MessageKey) }) : t('auto.waiting')}</p>}

      <label className="field">
        <span>{t('auto.seconds')}</span>
        <select value={s.seconds} onChange={(e) => setAutoSettings({ seconds: Number(e.target.value) })}>
          {AUTO_SECONDS.map((n) => (
            <option key={n} value={n}>
              {n ? t('auto.secondsN', { n }) : t('auto.never')}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>{t('auto.bars')}</span>
        <select value={s.bars} onChange={(e) => setAutoSettings({ bars: Number(e.target.value) })}>
          {AUTO_BARS.map((n) => (
            <option key={n} value={n}>
              {n ? t('auto.barsN', { n }) : t('auto.never')}
            </option>
          ))}
        </select>
      </label>
      <label className="check">
        <input type="checkbox" checked={s.onSection} onChange={(e) => setAutoSettings({ onSection: e.target.checked })} />
        <span>{t('auto.onSection')}</span>
      </label>
      <label className="check">
        <input type="checkbox" checked={s.onTrack} onChange={(e) => setAutoSettings({ onTrack: e.target.checked })} />
        <span>{t('auto.onTrack')}</span>
      </label>

      <label className="field">
        <span>{t('auto.pool')}</span>
        <select value={s.pool} onChange={(e) => setAutoSettings({ pool: e.target.value as AutoSettings['pool'] })}>
          {AUTO_POOLS.map((p) => (
            <option key={p} value={p}>
              {t(`auto.pool.${p}` as MessageKey)}
            </option>
          ))}
        </select>
        {s.pool === 'category' && (
          <select aria-label={t('auto.category')} value={s.category} onChange={(e) => setAutoSettings({ category: e.target.value as AutoSettings['category'] })}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {t(`browser.${c}` as MessageKey)}
              </option>
            ))}
          </select>
        )}
      </label>
      <label className="field">
        <span>{t('auto.target')}</span>
        <select value={s.target} onChange={(e) => setAutoSettings({ target: e.target.value as AutoSettings['target'] })}>
          {AUTO_TARGETS.map((x) => (
            <option key={x} value={x}>
              {t(`auto.target.${x}` as MessageKey)}
            </option>
          ))}
        </select>
      </label>
      <p className="muted small">{t('auto.hint')}</p>
    </section>
  )
}
