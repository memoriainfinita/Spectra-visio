import { useEffect, useRef } from 'react'
import { analysis } from '../app/engine'
import { latencyReported } from '../engine/analysis/analysis'
import { settingsStore } from '../app/settings'
import { NAMED_BANDS } from '../engine/analysis/bands'
import { BEAT_SLOTS, KICK, SECTION } from '../engine/analysis/analyzer'
import type { MessageKey } from '../i18n'
import { BAND_CHOICES, LATENCY_OFFSET_MAX, LATENCY_OFFSET_MIN, type AnalysisSettings } from '../storage/settings'
import { useStore } from './useStore'
import { useT } from './useT'

const FLASH_MS = 180
const BEAT_KEYS: MessageKey[] = [...NAMED_BANDS.map((b) => `band.${b}` as MessageKey), 'band.kick', 'band.section']

function setAnalysis(patch: Partial<AnalysisSettings>): void {
  settingsStore.set((s) => ({ ...s, analysis: { ...s.analysis, ...patch } }))
}

// Where the tempo comes from, as the panel and the top bar say it.
export function tempoModeLabel(t: ReturnType<typeof useT>, tempo: ReturnType<typeof analysis.tempo.get>): string {
  if (tempo.mode === 'tap') return t('analysis.mode.tap')
  if (tempo.mode === 'track') return t('analysis.mode.track')
  if (tempo.mode === 'midi') return t('analysis.mode.midi')
  return t('analysis.mode.auto', { n: Math.round(tempo.confidence * 100) })
}

export function AnalysisPanel() {
  const t = useT()
  const opts = useStore(settingsStore, (s) => s.analysis)
  const tempo = useStore(analysis.tempo)
  const latency = useStore(analysis.latency)

  return (
    <section className="panel analysis">
      <header className="panel-head">
        <h2>{t('analysis.title')}</h2>
      </header>
      <Scope />

      <div className="tempo-row">
        <div>
          <div className="bpm">{tempo.bpm === null ? t('analysis.bpmUnknown') : t('analysis.bpm', { n: tempo.bpm.toFixed(1) })}</div>
          {tempo.bpm !== null && (
            <div className="muted small">{tempoModeLabel(t, tempo)}</div>
          )}
        </div>
        <div className="head-actions">
          {/* pointerdown: a click fires on release and would lag every tap. */}
          {/* Space on the focused button taps instead of reaching the play/pause shortcut. */}
          <button
            className="btn"
            title={t('analysis.tapHint')}
            onPointerDown={() => analysis.tap()}
            onKeyDown={(e) => {
              if (e.key !== 'Enter' && e.key !== ' ') return
              e.preventDefault()
              e.stopPropagation()
              if (!e.repeat) analysis.tap()
            }}
          >
            {t('analysis.tap')}
          </button>
          {tempo.mode === 'tap' && (
            <button className="btn" onClick={() => analysis.useAutoTempo()}>
              {t('analysis.auto')}
            </button>
          )}
        </div>
      </div>

      <label className="field">
        <span>{t('analysis.bands')}</span>
        <select value={opts.bands} onChange={(e) => setAnalysis({ bands: Number(e.target.value) })}>
          {BAND_CHOICES.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <label className="check inline">
          <input type="checkbox" checked={opts.autoLevel} onChange={(e) => setAnalysis({ autoLevel: e.target.checked })} />
          <span>{t('analysis.autoLevel')}</span>
        </label>
        <label className="check inline" title={t('analysis.trackLevelHint')}>
          <input type="checkbox" checked={opts.trackLevel} onChange={(e) => setAnalysis({ trackLevel: e.target.checked })} />
          <span>{t('analysis.trackLevel')}</span>
        </label>
      </label>
      <label className="field">
        <span>{t('analysis.smoothing')}</span>
        <input type="range" min={0} max={1} step={0.05} value={opts.smoothing} onChange={(e) => setAnalysis({ smoothing: Number(e.target.value) })} />
        <span className="muted mono">{Math.round(opts.smoothing * 100)} %</span>
      </label>

      <h3 className="sub-head">{t('analysis.latency')}</h3>
      {!latencyReported ? (
        <p className="muted small">{t('analysis.latencyUnknown')}</p>
      ) : (
        <label className="check">
          <input type="checkbox" checked={opts.autoLatency} onChange={(e) => setAnalysis({ autoLatency: e.target.checked })} />
          <span>{t('analysis.latencyAuto', { n: latency.reported ?? '--' })}</span>
        </label>
      )}
      <label className="field">
        <span>{t('analysis.latencyOffset')}</span>
        <input
          type="range"
          min={LATENCY_OFFSET_MIN}
          max={LATENCY_OFFSET_MAX}
          step={5}
          value={opts.latencyOffset}
          onChange={(e) => setAnalysis({ latencyOffset: Number(e.target.value) })}
        />
        <span className="muted mono">{opts.latencyOffset > 0 ? '+' : ''}{opts.latencyOffset} ms</span>
      </label>
      <p className="muted small">
        {t('analysis.latencyTotal', { n: latency.applied })}. {t('analysis.latencyHint')}
      </p>
    </section>
  )
}

// Live view of the delayed analysis: left channel bands upwards, right downwards, a cell
// per band that flashes on its onsets, a dot on every beat of the tempo, and the stereo
// figures. Drawn outside React, once per frame.
function Scope() {
  const t = useT()
  const canvas = useRef<HTMLCanvasElement>(null)
  const cells = useRef<(HTMLSpanElement | null)[]>([])
  const metro = useRef<HTMLSpanElement>(null)
  const balance = useRef<HTMLSpanElement>(null)
  const correlation = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = canvas.current
    const ctx = el?.getContext('2d')
    if (!el || !ctx) return
    const seen = new Uint32Array(BEAT_SLOTS)
    const hitAt = new Float64Array(BEAT_SLOTS).fill(-Infinity)
    let first = true
    let raf = 0
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw)
      const f = analysis.frame(now)
      const { width, height } = el
      ctx.clearRect(0, 0, width, height)
      if (!f) return
      const mid = height / 2
      const n = f.bandCount
      const w = width / n
      for (let i = 0; i < n; i++) {
        const x = i * w + 1
        ctx.fillStyle = '#6ef7ff'
        ctx.fillRect(x, mid - f.bandsL[i] * (mid - 2), w - 2, f.bandsL[i] * (mid - 2))
        ctx.fillStyle = '#ff8bf1'
        ctx.fillRect(x, mid + 1, w - 2, f.bandsR[i] * (mid - 2))
      }
      for (let i = 0; i < BEAT_SLOTS; i++) {
        if (f.beats[i] !== seen[i] && !first) hitAt[i] = now
        seen[i] = f.beats[i]
        const glow = Math.max(0, 1 - (now - hitAt[i]) / FLASH_MS)
        cells.current[i]?.style.setProperty('--hit', glow.toFixed(2))
      }
      first = false
      if (metro.current) {
        const on = f.bpm > 0 && f.phase < 0.12
        metro.current.style.setProperty('--hit', on ? '1' : '0')
      }
      if (balance.current) balance.current.textContent = f.stereo.balance.toFixed(2)
      if (correlation.current) correlation.current.textContent = f.stereo.correlation.toFixed(2)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className="scope">
      <canvas ref={canvas} width={640} height={160} aria-hidden="true" />
      <div className="beat-cells" aria-hidden="true">
        {BEAT_KEYS.map((key, i) => (
          <span key={key} ref={(n) => void (cells.current[i] = n)} className={`beat-cell${i === KICK ? ' kick' : i === SECTION ? ' section' : ''}`}>
            {t(key)}
          </span>
        ))}
        <span ref={metro} className="beat-cell metro">
          ♩
        </span>
      </div>
      <div className="stereo-row muted small">
        <span>
          {t('analysis.balance')} <span ref={balance} className="mono">0.00</span>
        </span>
        <span>
          {t('analysis.correlation')} <span ref={correlation} className="mono">0.00</span>
        </span>
      </div>
    </div>
  )
}
