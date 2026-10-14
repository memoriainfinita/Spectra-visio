import { Download, RotateCcw, Trash2, Upload } from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'
import { downloadBackup, eraseAllData, resetSettings, restoreBackup } from '../app/backup'
import { setKeepFiles } from '../app/engine'
import { setReduceFlashes, settingsStore } from '../app/settings'
import { FPS_CAPS, type FpsCap } from '../engine/render/quality'
import { LANGS, isLang, type MessageKey } from '../i18n'
import type { Settings as SettingsData } from '../storage/settings'
import { opfsSupported } from '../storage/opfs'
import { Hint } from './Hint'
import { Shortcuts } from './Shortcuts'
import { useStore } from './useStore'
import { useT } from './useT'

const setPerformance = (value: Partial<SettingsData['performance']>) => settingsStore.set((s) => ({ ...s, performance: { ...s.performance, ...value } }))

function Panel({ id, title, children }: { id: string; title: MessageKey; children: ReactNode }) {
  const t = useT()
  return (
    <section className={`panel settings-${id}`}>
      <header className="panel-head">
        <h2>{t(title)}</h2>
      </header>
      {children}
    </section>
  )
}

// A button that asks once more, in place, before doing something that cannot be undone.
function Confirm({ label, question, yes, icon, onYes }: { label: MessageKey; question: MessageKey; yes: MessageKey; icon: ReactNode; onYes: () => void }) {
  const t = useT()
  const [asking, setAsking] = useState(false)
  if (!asking)
    return (
      <button className="btn" onClick={() => setAsking(true)}>
        {icon} {t(label)}
      </button>
    )
  return (
    <div className="confirm" role="group" aria-label={t(label)}>
      <span>{t(question)}</span>
      <button
        className="btn danger"
        onClick={() => {
          setAsking(false)
          onYes()
        }}
      >
        {t(yes)}
      </button>
      <button className="btn" autoFocus onClick={() => setAsking(false)}>
        {t('settings.cancel')}
      </button>
    </div>
  )
}

function General() {
  const t = useT()
  const lang = useStore(settingsStore, (s) => s.lang)
  const keepFiles = useStore(settingsStore, (s) => s.keepFiles)
  return (
    <Panel id="general" title="settings.general">
      <label className="field">
        <span>{t('settings.language')}</span>
        <select
          value={lang}
          onChange={(e) => {
            const next = e.target.value
            if (isLang(next)) settingsStore.set((s) => ({ ...s, lang: next }))
          }}
        >
          {LANGS.map((l) => (
            <option key={l} value={l}>
              {t(`lang.${l}`)}
            </option>
          ))}
        </select>
      </label>
      {opfsSupported && (
        <>
          <label className="check">
            <input type="checkbox" checked={keepFiles} onChange={(e) => void setKeepFiles(e.target.checked)} />
            <span>{t('settings.keepFiles')}</span>
          </label>
          <Hint text={t('settings.keepFilesHint')} />
        </>
      )}
    </Panel>
  )
}

function Accessibility() {
  const t = useT()
  const reduceFlashes = useStore(settingsStore, (s) => s.reduceFlashes)
  return (
    <Panel id="access" title="settings.access">
      <label className="check">
        <input type="checkbox" checked={reduceFlashes} onChange={(e) => setReduceFlashes(e.target.checked)} />
        <span>{t('safety.reduce')}</span>
      </label>
      <Hint text={t('safety.reduceHint')} />
      <button className="btn" onClick={() => settingsStore.set((s) => ({ ...s, flashNotice: false }))}>
        {t('settings.showNotice')}
      </button>
    </Panel>
  )
}

function Performance() {
  const t = useT()
  const perf = useStore(settingsStore, (s) => s.performance)
  return (
    <Panel id="perf" title="perf.title">
      <label className="check">
        <input type="checkbox" checked={perf.adaptive} onChange={(e) => setPerformance({ adaptive: e.target.checked })} />
        <span>{t('perf.adaptive')}</span>
      </label>
      <label className="check">
        <input type="checkbox" checked={perf.lowPower} onChange={(e) => setPerformance({ lowPower: e.target.checked })} />
        <span>{t('perf.lowPower')}</span>
      </label>
      <label className="check">
        <input type="checkbox" checked={perf.showFps} onChange={(e) => setPerformance({ showFps: e.target.checked })} />
        <span>{t('perf.showFps')}</span>
      </label>
      <label className="field">
        <span>{t('perf.maxFps')}</span>
        <select value={perf.maxFps} onChange={(e) => setPerformance({ maxFps: Number(e.target.value) as FpsCap })}>
          {FPS_CAPS.map((c) => (
            <option key={c} value={c}>
              {c ? t('record.fpsN', { n: c }) : t('perf.unlimited')}
            </option>
          ))}
        </select>
      </label>
      <Hint text={t('perf.hint')} />
    </Panel>
  )
}

const setOnline = (value: Partial<SettingsData['online']>) => settingsStore.set((s) => ({ ...s, online: { ...s.online, ...value } }))

function Online() {
  const t = useT()
  const online = useStore(settingsStore, (s) => s.online)
  return (
    <Panel id="online" title="settings.online">
      <label className="check">
        <input type="checkbox" checked={online.lyrics} onChange={(e) => setOnline({ lyrics: e.target.checked })} />
        <span>{t('settings.onlineLyrics')}</span>
      </label>
      <label className="check">
        <input type="checkbox" checked={online.covers} onChange={(e) => setOnline({ covers: e.target.checked })} />
        <span>{t('settings.onlineCovers')}</span>
      </label>
      <Hint text={t('settings.onlineHint')} />
    </Panel>
  )
}

function Backup() {
  const t = useT()
  const input = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<string | null>(null)
  return (
    <Panel id="backup" title="settings.backup">
      <div className="live-row">
        <button className="btn" onClick={downloadBackup}>
          <Download size={15} /> {t('settings.export')}
        </button>
        <button className="btn" onClick={() => input.current?.click()}>
          <Upload size={15} /> {t('settings.import')}
        </button>
        <input
          ref={input}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={async (e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (!file) return
            const r = await restoreBackup(file)
            setMessage(r.invalid ? t('settings.importInvalid') : t('settings.imported', { presets: r.presets, shaders: r.shaders, favorites: r.favorites, channels: r.channels, layouts: r.layouts }))
          }}
        />
      </div>
      {message && (
        <p className="muted small" role="status">
          {message}
        </p>
      )}
      <Hint text={t('settings.backupHint')} />
    </Panel>
  )
}

function Reset() {
  return (
    <Panel id="reset" title="settings.reset">
      <div className="live-row">
        <Confirm label="settings.resetSettings" question="settings.resetQuestion" yes="settings.resetYes" icon={<RotateCcw size={15} />} onYes={resetSettings} />
      </div>
      <div className="live-row">
        <Confirm label="settings.erase" question="settings.eraseQuestion" yes="settings.eraseYes" icon={<Trash2 size={15} />} onYes={eraseAllData} />
      </div>
    </Panel>
  )
}

// The app's own options, gathered in one place.
export function Settings() {
  return (
    <>
      <General />
      <Accessibility />
      <Performance />
      <Online />
      <Panel id="keys" title="live.keys">
        <Shortcuts />
      </Panel>
      <Backup />
      <Reset />
    </>
  )
}
