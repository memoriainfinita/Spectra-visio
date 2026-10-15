import { autoStore, toggleAuto } from '../app/auto'
import { liveStore, toggleLive } from '../app/live'
import { launchColumn, sceneStore, setCrossfade } from '../app/scene'
import { settingsStore } from '../app/settings'
import { CLIP_COLUMNS } from '../engine/scene/scene'
import { knobMenu } from './KnobMenu'
import { useStore } from './useStore'
import { useT } from './useT'

const COLUMNS = Array.from({ length: CLIP_COLUMNS }, (_, c) => c)

// Under the stage on wide screens: what a show needs at hand, whatever tab is open.
export function PerformBar() {
  const t = useT()
  const live = useStore(liveStore)
  const reduceFlashes = useStore(settingsStore, (s) => s.reduceFlashes)
  const crossfade = useStore(sceneStore, (s) => s.crossfade)
  const auto = useStore(autoStore, (s) => s.enabled)

  const toggle = (key: 'blackout' | 'freeze' | 'strobe') => (
    <button className={`btn${live[key] ? ' on' : ''}`} aria-pressed={live[key]} disabled={key === 'strobe' && reduceFlashes} onClick={() => toggleLive(key)}>
      {t(`live.${key}`)}
    </button>
  )

  return (
    <section className="panel perform-bar" aria-label={t('perform.title')}>
      <div className="perform-group">
        {toggle('blackout')}
        {toggle('freeze')}
        {toggle('strobe')}
      </div>
      <div className="crossfade-row perform-cross">
        <span className="mono">A</span>
        <input type="range" aria-label={t('visuals.crossfade')} {...knobMenu({ kind: 'crossfade' })} min={0} max={1} step={0.01} value={crossfade} onChange={(e) => setCrossfade(Number(e.target.value))} />
        <span className="mono">B</span>
      </div>
      <div className="perform-group">
        {COLUMNS.map((c) => (
          <button key={c} className="clip-col" title={t('clips.column', { n: c + 1 })} aria-label={t('clips.column', { n: c + 1 })} onClick={() => launchColumn(c)}>
            {c + 1}
          </button>
        ))}
      </div>
      <button className={`btn${auto ? ' on' : ''}`} aria-pressed={auto} title={t('auto.toggleHint')} onClick={() => toggleAuto()}>
        {t('perform.auto', { state: auto ? t('auto.on') : t('auto.off') })}
      </button>
    </section>
  )
}
