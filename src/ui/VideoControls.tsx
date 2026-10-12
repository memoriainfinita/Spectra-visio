import { Pause, Play, X } from 'lucide-react'
import { settingsStore } from '../app/settings'
import { VIDEO_RATES, clearVideoSpan, markVideoEnd, markVideoStart, seekVideo, setVideoLoop, setVideoRate, setVideoSpan, toggleVideo, videoControlStore } from '../app/videoControl'
import { formatTime } from './format'
import { useStore } from './useStore'
import { useT } from './useT'

// Seconds with one decimal, for the span fields.
const tenths = (s: number) => Math.round(s * 10) / 10

// Play, position, trimmed span, loop and speed of a video in the visual input.
export function VideoControls() {
  const t = useT()
  const c = useStore(videoControlStore)
  const lang = useStore(settingsStore, (s) => s.lang)
  if (!c.active) return null
  const end = c.end > 0 ? c.end : c.duration
  const trimmed = c.start > 0 || c.end > 0
  return (
    <div className="video-controls" role="group" aria-label={t('vctl.label')}>
      <div className="live-row">
        <button className="icon-btn small" aria-label={c.paused ? t('vctl.play') : t('vctl.pause')} title={c.paused ? t('vctl.play') : t('vctl.pause')} onClick={toggleVideo}>
          {c.paused ? <Play size={15} /> : <Pause size={15} />}
        </button>
        <input className="seek" type="range" min={0} max={c.duration || 0} step={0.01} value={Math.min(c.time, c.duration)} aria-label={t('vctl.position')} onChange={(e) => seekVideo(Number(e.target.value))} />
        <span className="mono muted small">
          {formatTime(c.time)} / {formatTime(c.duration)}
        </span>
      </div>
      <div className="live-row">
        <label className="field inline-field">
          <span>{t('vctl.start')}</span>
          <input type="number" min={0} max={tenths(c.duration)} step={0.1} value={tenths(c.start)} onChange={(e) => setVideoSpan(Number(e.target.value), c.end)} />
        </label>
        <button className="btn" onClick={markVideoStart}>
          {t('vctl.markStart')}
        </button>
      </div>
      <div className="live-row">
        <label className="field inline-field">
          <span>{t('vctl.end')}</span>
          <input type="number" min={0} max={tenths(c.duration)} step={0.1} value={tenths(end)} onChange={(e) => setVideoSpan(c.start, Number(e.target.value))} />
        </label>
        <button className="btn" onClick={markVideoEnd}>
          {t('vctl.markEnd')}
        </button>
      </div>
      <div className="live-row">
        <button className="btn" disabled={!trimmed} onClick={clearVideoSpan}>
          <X size={15} /> {t('vctl.clear')}
        </button>
        <label className="check inline-check">
          <input type="checkbox" checked={c.loop} onChange={(e) => setVideoLoop(e.target.checked)} />
          <span>{t('vctl.loop')}</span>
        </label>
        <label className="field inline-field">
          <span>{t('vctl.rate')}</span>
          <select value={c.rate} onChange={(e) => setVideoRate(Number(e.target.value))}>
            {VIDEO_RATES.map((r) => (
              <option key={r} value={r}>
                {r.toLocaleString(lang, { maximumFractionDigits: 2 })}×
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  )
}
