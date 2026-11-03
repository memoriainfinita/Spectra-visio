import { autoStore, toggleAuto } from '../app/auto'
import { liveStore, runAction, toggleLive } from '../app/live'
import { launchColumn, sceneStore, setCrossfade } from '../app/scene'
import { settingsStore } from '../app/settings'
import { STROBE_RATES, type ActionId, type StrobeRate } from '../engine/live/live'
import { CLIP_COLUMNS } from '../engine/scene/scene'
import { actionLabel } from './actionLabel'
import { columnLabel } from './ClipMenu'
import { knobMenu } from './KnobMenu'
import { useStore } from './useStore'
import { useT } from './useT'

const COLUMNS = Array.from({ length: CLIP_COLUMNS }, (_, c) => c)

// Under the stage on wide screens: what a show needs at hand, whatever tab is open.
export function PerformBar() {
  const t = useT()
  const live = useStore(liveStore)
  const reduceFlashes = useStore(settingsStore, (s) => s.reduceFlashes)
  const strobeRate = useStore(settingsStore, (s) => s.live.strobe)
  const crossfade = useStore(sceneStore, (s) => s.crossfade)
  const columns = useStore(sceneStore, (s) => s.columns)
  const auto = useStore(autoStore, (s) => s.enabled)

  const toggle = (key: 'blackout' | 'freeze' | 'strobe') => (
    <button className={`btn${live[key] ? ' on' : ''}`} aria-pressed={live[key]} disabled={key === 'strobe' && reduceFlashes} onClick={() => toggleLive(key)} {...knobMenu({ kind: 'action', id: key })}>
      {t(`live.${key}`)}
    </button>
  )

  return (
    <section className="panel perform-bar" aria-label={t('perform.title')}>
      <div className="perform-group">
        {toggle('blackout')}
        {toggle('freeze')}
        {toggle('strobe')}
        <select
          aria-label={t('live.strobeRate')}
          title={`${t('live.strobeRate')}. ${t('live.strobeHint')}`}
          value={String(strobeRate)}
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
      <div className="crossfade-row perform-cross">
        <button className="cross-end mono" title={actionLabel('crossA', t)} aria-label={actionLabel('crossA', t)} onClick={() => runAction('crossA')} {...knobMenu({ kind: 'action', id: 'crossA' })}>
          A
        </button>
        <input type="range" aria-label={t('visuals.crossfade')} {...knobMenu({ kind: 'crossfade' })} min={0} max={1} step={0.01} value={crossfade} onChange={(e) => setCrossfade(Number(e.target.value))} />
        <button className="cross-end mono" title={actionLabel('crossB', t)} aria-label={actionLabel('crossB', t)} onClick={() => runAction('crossB')} {...knobMenu({ kind: 'action', id: 'crossB' })}>
          B
        </button>
      </div>
      <div className="perform-group">
        {COLUMNS.map((c) => (
          <button key={c} className="clip-col" title={columnLabel(columns, c, t)} aria-label={columnLabel(columns, c, t)} onClick={() => launchColumn(c)} {...knobMenu({ kind: 'action', id: `column${c + 1}` as ActionId })}>
            {c + 1}
          </button>
        ))}
      </div>
      <button className={`btn${auto ? ' on' : ''}`} aria-pressed={auto} title={t('auto.toggleHint')} onClick={() => toggleAuto()} {...knobMenu({ kind: 'action', id: 'auto' })}>
        {t('perform.auto', { state: auto ? t('auto.on') : t('auto.off') })}
      </button>
    </section>
  )
}
