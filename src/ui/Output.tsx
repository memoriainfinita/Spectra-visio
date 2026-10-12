import { Circle, Copy, Download, Square, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { obsStore, setObsConnection, setObsEnabled, sourceUrl } from '../app/obs'
import { closeOutput, openOutput, outputStore, setPreview } from '../app/output'
import { deleteKept, downloadKept, mimeSupported, recordStore, toggleRecording } from '../app/record'
import { settingsStore } from '../app/settings'
import { OUTPUT_ASPECTS, OUTPUT_SIZES, formatPixels, type OutputAspect, type OutputSize } from '../engine/output/format'
import { RECORD_FPS, RECORD_QUALITIES, formatLabel, type RecordFps, type RecordQuality } from '../engine/record/recorder'
import type { Settings } from '../storage/settings'
import { useStore } from './useStore'
import { useT } from './useT'
import { Hint } from './Hint'

const MB = 1024 * 1024

function clock(ms: number): string {
  const s = Math.floor(ms / 1000)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${Math.floor(s / 3600)}:${p(Math.floor(s / 60) % 60)}:${p(s % 60)}`
}

// Seconds since the recording started, redrawn while it runs.
function useElapsed(started: number, running: boolean): number {
  const [now, setNow] = useState(() => performance.now())
  useEffect(() => {
    if (!running) return
    const timer = setInterval(() => setNow(performance.now()), 500)
    return () => clearInterval(timer)
  }, [running])
  return running ? now - started : 0
}

const setFormat = (value: Partial<Settings['format']>) => settingsStore.set((s) => ({ ...s, format: { ...s.format, ...value } }))
const setRecord = (value: Partial<Settings['record']>) => settingsStore.set((s) => ({ ...s, record: { ...s.record, ...value } }))

function Obs() {
  const t = useT()
  const obs = useStore(obsStore)
  const settings = useStore(settingsStore, (s) => s.obs)
  const [url, setUrl] = useState(settings.url)
  const [password, setPassword] = useState(settings.password)
  const [black, setBlack] = useState(false)
  const [copied, setCopied] = useState(false)
  const source = sourceUrl() + (black ? '&background=black' : '')
  const dirty = url !== settings.url || password !== settings.password

  const status =
    obs.status === 'on'
      ? t('obs.on')
      : obs.status === 'connecting'
        ? t('obs.connecting')
        : obs.status === 'error'
          ? t(`obs.error.${obs.error ?? 'closed'}`)
          : t('obs.off')

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(source)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // The field stays selectable by hand.
    }
  }

  return (
    <>
      <h3 className="sub-head">{t('obs.title')}</h3>
      <label className="check">
        <input type="checkbox" checked={settings.enabled} onChange={(e) => setObsEnabled(e.target.checked)} />
        <span>{t('obs.enable')}</span>
      </label>
      <p className={obs.status === 'error' ? 'error' : 'muted small'} role="status">
        {status}
      </p>
      {obs.requestError && (
        <p className="error" role="alert">
          {t('obs.requestError', { msg: obs.requestError })}
        </p>
      )}
      <details className="live-keys" open={obs.status === 'error' || undefined}>
        <summary>{t('obs.connection')}</summary>
        <label className="field">
          <span>{t('obs.url')}</span>
          <input type="text" spellCheck={false} value={url} onChange={(e) => setUrl(e.target.value)} />
        </label>
        <label className="field">
          <span>{t('obs.password')}</span>
          <input type="password" autoComplete="off" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <button className="btn" disabled={!dirty} onClick={() => setObsConnection(url.trim(), password)}>
          {t('obs.save')}
        </button>
        <Hint text={t('obs.serverHint')} />
      </details>
      <label className="field">
        <span>{t('obs.sourceUrl')}</span>
        <span className="live-row source-url">
          <input type="text" readOnly value={source} onFocus={(e) => e.target.select()} />
          <button className="icon-btn small" title={t('obs.copy')} aria-label={t('obs.copy')} onClick={() => void copy()}>
            <Copy size={15} />
          </button>
          {copied && <span className="muted small">{t('obs.copied')}</span>}
        </span>
      </label>
      <label className="check">
        <input type="checkbox" checked={black} onChange={(e) => setBlack(e.target.checked)} />
        <span>{t('obs.black')}</span>
      </label>
      <Hint text={t('obs.hint')} />
    </>
  )
}

// Where the image goes: the output window, its size, recordings, OBS.
export function Output() {
  const t = useT()
  const out = useStore(outputStore)
  const rec = useStore(recordStore)
  const format = useStore(settingsStore, (s) => s.format)
  const record = useStore(settingsStore, (s) => s.record)
  const recording = rec.status === 'recording'
  const busy = rec.status !== 'idle'
  const elapsed = useElapsed(rec.started, recording)
  const pixels = formatPixels(format)

  return (
    <section className="panel output">
      <header className="panel-head">
        <h2>{t('outputPanel.title')}</h2>
      </header>

      <div className="live-row">
        <button className={`btn${out.open ? ' on' : ''}`} onClick={() => (out.open ? closeOutput() : openOutput())}>
          {out.open ? t('output.close') : t('output.open')}
        </button>
        <label className="check inline-check">
          <input type="checkbox" checked={out.preview} disabled={!out.open} onChange={(e) => setPreview(e.target.checked)} />
          <span>{t('output.preview')}</span>
        </label>
      </div>
      {out.blocked && <p className="muted small" role="status">{t('output.blocked')}</p>}
      <Hint text={t('output.hint')} />

      <h3 className="sub-head">{t('format.title')}</h3>
      <div className="live-row">
        <select aria-label={t('format.size')} title={t('format.size')} value={format.size} disabled={busy} onChange={(e) => setFormat({ size: e.target.value as OutputSize })}>
          {OUTPUT_SIZES.map((s) => (
            <option key={s} value={s}>
              {s === 'auto' ? t('format.auto') : t('format.lines', { n: s })}
            </option>
          ))}
        </select>
        <select aria-label={t('format.aspect')} title={t('format.aspect')} value={format.aspect} disabled={busy || !pixels} onChange={(e) => setFormat({ aspect: e.target.value as OutputAspect })}>
          {OUTPUT_ASPECTS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        {pixels && <span className="mono muted small">{pixels.width} × {pixels.height}</span>}
      </div>
      <Hint text={pixels ? t('format.fixedHint') : t('format.autoHint')} />

      <h3 className="sub-head">{t('record.title')}</h3>
      {mimeSupported ? (
        <>
          <div className="live-row">
            <button className={`btn${recording ? ' on rec' : ''}`} aria-pressed={recording} disabled={rec.status === 'starting' || rec.status === 'saving'} onClick={toggleRecording}>
              {recording ? <Square size={14} /> : <Circle size={14} />} {recording ? t('record.stop') : t('record.start')}
            </button>
            {recording && (
              <span className="mono" role="status">
                {clock(elapsed)} · {(rec.bytes / MB).toFixed(1)} MB
              </span>
            )}
            {rec.status === 'saving' && <span className="muted small">{t('record.saving')}</span>}
          </div>
          <div className="live-row">
            <select aria-label={t('record.fps')} title={t('record.fps')} value={record.fps} disabled={busy} onChange={(e) => setRecord({ fps: Number(e.target.value) as RecordFps })}>
              {RECORD_FPS.map((f) => (
                <option key={f} value={f}>
                  {t('record.fpsN', { n: f })}
                </option>
              ))}
            </select>
            <select aria-label={t('record.quality')} title={t('record.quality')} value={record.quality} disabled={busy} onChange={(e) => setRecord({ quality: e.target.value as RecordQuality })}>
              {RECORD_QUALITIES.map((q) => (
                <option key={q} value={q}>
                  {t(`record.quality.${q}`)}
                </option>
              ))}
            </select>
            <span className="mono muted small">{formatLabel(mimeSupported)}</span>
          </div>
          <Hint text={t('record.hint')} />
          {rec.error && (
            <p className="error" role="alert">
              {t('record.error', { msg: rec.error })}
            </p>
          )}
          {rec.kept && !busy && (
            <div className="live-row kept">
              <span className="small">{t('record.kept', { name: rec.kept.name, size: (rec.kept.size / MB).toFixed(1) })}</span>
              <button className="icon-btn small" title={t('record.download')} aria-label={t('record.download')} onClick={() => void downloadKept()}>
                <Download size={15} />
              </button>
              <button className="icon-btn small" title={t('record.delete')} aria-label={t('record.delete')} onClick={() => void deleteKept()}>
                <Trash2 size={15} />
              </button>
            </div>
          )}
        </>
      ) : (
        <p className="muted small">{t('record.unsupported')}</p>
      )}

      <Obs />
    </section>
  )
}
