import { liveStore, runAction, toggleLive } from '../app/live'
import { setReduceFlashes, settingsStore } from '../app/settings'
import { STROBE_RATES, type ActionId, type StrobeRate } from '../engine/live/live'
import type { MessageKey } from '../i18n'
import { Hint } from './Hint'
import { useStore } from './useStore'
import { useT } from './useT'

export function actionLabel(id: ActionId, t: ReturnType<typeof useT>): string {
  return id.startsWith('column') ? t('clips.column', { n: id.slice(6) }) : t(`action.${id}` as MessageKey)
}

// Blackout, freeze and strobe, and crossfader moves. The shortcuts are in Settings.
export function Live() {
  const t = useT()
  const live = useStore(liveStore)
  const settings = useStore(settingsStore, (s) => s.live)
  const reduceFlashes = useStore(settingsStore, (s) => s.reduceFlashes)

  const toggle = (key: 'blackout' | 'freeze' | 'strobe') => (
    <button className={`btn${live[key] ? ' on' : ''}`} aria-pressed={live[key]} disabled={key === 'strobe' && reduceFlashes} onClick={() => toggleLive(key)}>
      {t(`live.${key}`)}
    </button>
  )

  return (
    <section className="panel live">
      <header className="panel-head">
        <h2>{t('live.title')}</h2>
      </header>

      <div className="live-row">
        {toggle('blackout')}
        {toggle('freeze')}
        {toggle('strobe')}
        <select
          aria-label={t('live.strobeRate')}
          title={t('live.strobeRate')}
          value={String(settings.strobe)}
          onChange={(e) => {
            const v = e.target.value === 'beat' ? 'beat' : (Number(e.target.value) as StrobeRate)
            settingsStore.set((s) => ({ ...s, live: { ...s.live, strobe: v } }))
          }}
        >
          {STROBE_RATES.map((r) => (
            <option key={r} value={String(r)}>
              {r === 'beat' ? t('live.rate.beat') : t('live.rate.n', { n: r })}
            </option>
          ))}
        </select>
      </div>
      <Hint text={t('live.strobeHint')} />
      <label className="check">
        <input type="checkbox" checked={reduceFlashes} onChange={(e) => setReduceFlashes(e.target.checked)} />
        <span>{t('safety.reduce')}</span>
      </label>
      <Hint text={t('safety.reduceHint')} />

      <div className="live-row">
        <button className="btn" onClick={() => runAction('crossA')}>
          {t('action.crossA')}
        </button>
        <button className="btn" onClick={() => runAction('crossSwap')}>
          {t('action.crossSwap')}
        </button>
        <button className="btn" onClick={() => runAction('crossB')}>
          {t('action.crossB')}
        </button>
      </div>
    </section>
  )
}
